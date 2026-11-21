// Frontend tests for the ItemForm page — THIS is the only frontend file you edit.
// Run with:  npm test --workspace client
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ItemForm from './ItemForm.jsx'
import { api } from '../api'

// Replace the real axios instance with fake (mock) functions — no server needed.
// In a test you decide what each one returns, e.g.
//   api.post.mockResolvedValue({ data: { item: {} } })                                  // success
//   api.post.mockRejectedValue({ response: { status: 409, data: { message: '...' } } }) // failure
// and afterwards check how it was called:
//   expect(api.post).toHaveBeenCalledWith('/items', { ... })
jest.mock('../api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() }
}))

// Helper: renders ItemForm at `path`. "/items/new" = report mode, "/items/<id>" = edit mode.
// After a successful save the page navigates to /items, which renders the text "Items page".
function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/items/new" element={<ItemForm />} />
        <Route path="/items/:id" element={<ItemForm />} />
        <Route path="/items" element={<div>Items page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

// Reset every mock's calls and return values before each test.
beforeEach(() => jest.clearAllMocks())

describe('ItemForm — report mode (/items/new)', () => {
  // Worked example — read it, then write the two tests below in the same style.
  test('renders all fields with their default values', () => {
    renderAt('/items/new')
    expect(screen.getByRole('heading', { name: /report item/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/title/i)).toHaveValue('')
    const [status, category] = screen.getAllByRole('combobox') // the two <select>s
    expect(status).toHaveValue('lost')
    expect(category).toHaveValue('other')
  })

  test('submitting POSTs { title, status, category, location, description } (no reportedBy) and navigates to /items', async () => {
    const user = userEvent.setup()
    api.post.mockResolvedValue({ data: { item: { _id: '1' } } })
    renderAt('/items/new')

    await user.type(screen.getByPlaceholderText(/title/i), 'Blue umbrella')
    const [status, category] = screen.getAllByRole('combobox')
    await user.selectOptions(status, 'found')
    await user.selectOptions(category, 'accessories')
    await user.type(screen.getByPlaceholderText(/location/i), 'Library 2nd floor')
    await user.type(screen.getByPlaceholderText(/description/i), 'Left near the stairs')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(api.post).toHaveBeenCalledTimes(1)
    expect(api.post).toHaveBeenCalledWith('/items', {
      title: 'Blue umbrella',
      status: 'found',
      category: 'accessories',
      location: 'Library 2nd floor',
      description: 'Left near the stairs'
    })
    expect(await screen.findByText('Items page')).toBeInTheDocument()
  })

  test("shows the server's message when the request fails (e.g. 409) and stays on the page", async () => {
    const user = userEvent.setup()
    api.post.mockRejectedValue({
      response: { status: 409, data: { message: 'Duplicate item at this location' } }
    })
    renderAt('/items/new')

    await user.type(screen.getByPlaceholderText(/title/i), 'Black backpack')
    await user.type(screen.getByPlaceholderText(/location/i), 'Library')
    await user.click(screen.getByRole('button', { name: /save/i }))

    expect(await screen.findByText('Duplicate item at this location')).toBeInTheDocument()
    expect(screen.queryByText('Items page')).not.toBeInTheDocument()
  })
})
