import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockTransport = {
  sendMail: vi.fn(),
  verify: vi.fn(),
}
const createTransportMock = vi.fn(() => mockTransport)
vi.mock('nodemailer', () => ({
  default: { createTransport: (...args) => createTransportMock(...args) },
}))

const ORIGINAL_ENV = { ...process.env }

function clearSmtpEnv() {
  delete process.env.SMTP_HOST
  delete process.env.SMTP_PORT
  delete process.env.SMTP_USER
  delete process.env.SMTP_PASS
  delete process.env.SMTP_FROM
}

describe('lib/mailer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules() // چون mailer.js خودش transporter رو در سطح ماژول کش می‌کنه
    process.env = { ...ORIGINAL_ENV }
    clearSmtpEnv()
  })
  afterEach(() => { process.env = { ...ORIGINAL_ENV } })

  it('وقتی SMTP تنظیم نشده، ایمیل واقعی نمی‌فرسته و {sent:false} برمی‌گردونه (بدون کرش)', async () => {
    const { sendMail } = await import('../src/lib/mailer.js')
    const result = await sendMail({ to: 'x@test.com', subject: 'س', text: 'م' })
    expect(result).toEqual({ sent: false, reason: 'smtp-not-configured' })
    expect(createTransportMock).not.toHaveBeenCalled()
  })

  it('وقتی SMTP کامل تنظیم شده، از nodemailer.createTransport با تنظیمات درست استفاده می‌کنه', async () => {
    process.env.SMTP_HOST = 'smtp.example.com'
    process.env.SMTP_PORT = '465'
    process.env.SMTP_USER = 'user@example.com'
    process.env.SMTP_PASS = 'secret'
    mockTransport.sendMail.mockResolvedValue({ messageId: 'm1' })

    const { sendMail } = await import('../src/lib/mailer.js')
    const result = await sendMail({ to: 'to@test.com', subject: 'سلام', text: 'متن' })

    expect(createTransportMock).toHaveBeenCalledWith(expect.objectContaining({
      host: 'smtp.example.com', port: 465, secure: true,
      auth: { user: 'user@example.com', pass: 'secret' },
    }))
    expect(mockTransport.sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'to@test.com', subject: 'سلام' }))
    expect(result).toEqual({ sent: true })
  })

  it('اگه ارسال واقعی خطا بده، کرش نمی‌کنه و {sent:false, reason} برمی‌گردونه', async () => {
    process.env.SMTP_HOST = 'smtp.example.com'
    process.env.SMTP_USER = 'user@example.com'
    process.env.SMTP_PASS = 'secret'
    mockTransport.sendMail.mockRejectedValue(new Error('اتصال قطع شد'))

    const { sendMail } = await import('../src/lib/mailer.js')
    const result = await sendMail({ to: 'to@test.com', subject: 'س', text: 'م' })

    expect(result).toEqual({ sent: false, reason: 'اتصال قطع شد' })
  })

  it('verifyMailConfig وقتی SMTP تنظیم نشده، بدون خطا configured:false برمی‌گردونه', async () => {
    const { verifyMailConfig } = await import('../src/lib/mailer.js')
    const result = await verifyMailConfig()
    expect(result).toEqual({ configured: false })
  })

  it('verifyMailConfig وقتی SMTP تنظیم شده و verify موفقه، ok:true برمی‌گردونه', async () => {
    process.env.SMTP_HOST = 'smtp.example.com'
    process.env.SMTP_USER = 'user@example.com'
    process.env.SMTP_PASS = 'secret'
    mockTransport.verify.mockResolvedValue(true)

    const { verifyMailConfig } = await import('../src/lib/mailer.js')
    const result = await verifyMailConfig()

    expect(result).toEqual({ configured: true, ok: true })
  })

  it('verifyMailConfig وقتی اتصال SMTP واقعاً برقرار نمی‌شه، ok:false + پیام خطا برمی‌گردونه', async () => {
    process.env.SMTP_HOST = 'smtp.example.com'
    process.env.SMTP_USER = 'user@example.com'
    process.env.SMTP_PASS = 'secret'
    mockTransport.verify.mockRejectedValue(new Error('احراز هویت ناموفق'))

    const { verifyMailConfig } = await import('../src/lib/mailer.js')
    const result = await verifyMailConfig()

    expect(result).toEqual({ configured: true, ok: false, error: 'احراز هویت ناموفق' })
  })
})

describe('GET /api/company/mail-status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
    clearSmtpEnv()
  })
  afterEach(() => { process.env = { ...ORIGINAL_ENV } })

  it('بدون SMTP تنظیم‌شده، configured:false برمی‌گردونه', async () => {
    const { createTestCompany, app, request } = await import('./helpers.js')
    const { token } = await createTestCompany('mailstatus')
    const res = await request(app).get('/api/company/mail-status').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ configured: false })
  })

  it('بدون توکن معتبر، ۴۰۱ برمی‌گردونه (اطلاعات SMTP نباید بدون auth افشا بشه)', async () => {
    const { app, request } = await import('./helpers.js')
    const res = await request(app).get('/api/company/mail-status')
    expect(res.status).toBe(401)
  })
})
