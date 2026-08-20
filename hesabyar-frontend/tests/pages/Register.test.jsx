import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Register from '@/pages/auth/Register'

afterEach(() => { vi.restoreAllMocks() })

describe('صفحه‌ی ثبت‌نام — ارسال نام شرکت', () => {
  it('نام شرکتی که کاربر در مرحله‌ی اول تایپ می‌کنه، باید توی بدنه‌ی درخواست POST /auth/register هم باشه', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => ({ user: { id: 'u1' }, token: 't1', company: { id: 'c1' } }),
    })
    global.fetch = fetchMock

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    )

    const user = userEvent.setup()
    await user.type(screen.getByPlaceholderText('مثلاً: حسابیار تک'), 'شرکت آزمایشی')
    await user.type(screen.getByPlaceholderText('نام کامل'), 'کاربر تست')
    await user.click(screen.getByRole('button', { name: /ادامه/ }))

    await user.type(screen.getByPlaceholderText('name@company.ir'), 'test@example.com')
    await user.type(screen.getByPlaceholderText('حداقل ۸ کاراکتر'), 'Test12345!')
    await user.type(screen.getByPlaceholderText('••••••••'), 'Test12345!')
    await user.click(screen.getByRole('button', { name: /ساخت حساب/ }))

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [, options] = fetchMock.mock.calls.find(([url]) => String(url).includes('/auth/register'))
    const body = JSON.parse(options.body)
    expect(body.companyName).toBe('شرکت آزمایشی')
  })
})
