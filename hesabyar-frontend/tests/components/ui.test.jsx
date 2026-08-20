import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DollarSign } from 'lucide-react'
import { Badge, StatCard, EmptyState, Tabs, SearchInput, Select, Modal, FormField, Pagination, ToggleSwitch } from '@/components/ui'

describe('Badge', () => {
  it('متن داخلش رو نمایش می‌ده', () => {
    render(<Badge type="green">فعال</Badge>)
    expect(screen.getByText('فعال')).toBeInTheDocument()
  })
  it('اگه type ناشناخته باشه، کرش نمی‌کنه (فال‌بک به gray)', () => {
    render(<Badge type="not-a-real-type">نامشخص</Badge>)
    expect(screen.getByText('نامشخص')).toBeInTheDocument()
  })
})

describe('StatCard', () => {
  it('label و value رو نمایش می‌ده', () => {
    render(<StatCard icon={DollarSign} label="کل حقوق صاحبان سهام" value="۵٬۰۰۰٬۰۰۰" />)
    expect(screen.getByText('کل حقوق صاحبان سهام')).toBeInTheDocument()
    expect(screen.getByText('۵٬۰۰۰٬۰۰۰')).toBeInTheDocument()
  })
  it('اگه sub داده نشه، رندر نمی‌شه', () => {
    render(<StatCard icon={DollarSign} label="لیبل" value="۱" />)
    expect(screen.queryByText('توضیح')).not.toBeInTheDocument()
  })
  it('sub رو با subColor اختصاصی نشون می‌ده', () => {
    render(<StatCard icon={DollarSign} label="سهام ثبت‌شده" value="۹۰٪" sub="باید ۱۰۰٪ بشه" subColor="#dc2626" />)
    const subEl = screen.getByText('باید ۱۰۰٪ بشه')
    expect(subEl).toBeInTheDocument()
    expect(subEl.style.color).toBe('rgb(220, 38, 38)')
  })
})

describe('EmptyState', () => {
  it('عنوان و توضیح رو نمایش می‌ده', () => {
    render(<EmptyState icon={DollarSign} title="هنوز شریکی ثبت نشده" desc="با دکمه‌ی افزودن شروع کن" />)
    expect(screen.getByText('هنوز شریکی ثبت نشده')).toBeInTheDocument()
    expect(screen.getByText('با دکمه‌ی افزودن شروع کن')).toBeInTheDocument()
  })
})

describe('Tabs', () => {
  const tabs = [{ key: 'a', label: 'یک' }, { key: 'b', label: 'دو', count: 5 }]

  it('همه‌ی تب‌ها رو رندر می‌کنه', () => {
    render(<Tabs tabs={tabs} active="a" onChange={() => {}} />)
    expect(screen.getByText('یک')).toBeInTheDocument()
    expect(screen.getByText('دو')).toBeInTheDocument()
  })
  it('عدد count رو نشون می‌ده اگه تعریف شده باشه', () => {
    render(<Tabs tabs={tabs} active="a" onChange={() => {}} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })
  it('کلیک روی تب، onChange رو با key درست صدا می‌زنه', () => {
    const onChange = vi.fn()
    render(<Tabs tabs={tabs} active="a" onChange={onChange} />)
    fireEvent.click(screen.getByText('دو'))
    expect(onChange).toHaveBeenCalledWith('b')
  })
})

describe('SearchInput', () => {
  it('تایپ‌کردن onChange رو با متن جدید صدا می‌زنه', () => {
    const onChange = vi.fn()
    render(<SearchInput value="" onChange={onChange} placeholder="جستجوی مشتری..." />)
    fireEvent.change(screen.getByPlaceholderText('جستجوی مشتری...'), { target: { value: 'علی' } })
    expect(onChange).toHaveBeenCalledWith('علی')
  })
  it('دکمه‌ی پاک‌کردن فقط وقتی value داره نمایش داده می‌شه', () => {
    const { rerender } = render(<SearchInput value="" onChange={() => {}} />)
    expect(document.querySelector('button')).not.toBeInTheDocument()
    rerender(<SearchInput value="علی" onChange={() => {}} />)
    expect(document.querySelector('button')).toBeInTheDocument()
  })
  it('کلیک روی دکمه‌ی پاک‌کردن، onChange رو با رشته‌ی خالی صدا می‌زنه', () => {
    const onChange = vi.fn()
    render(<SearchInput value="علی" onChange={onChange} />)
    fireEvent.click(document.querySelector('button'))
    expect(onChange).toHaveBeenCalledWith('')
  })
  it('دکمه‌ی پاک‌کردن باید aria-label داشته باشه (دسترس‌پذیری، آیکون‌فقط)', () => {
    render(<SearchInput value="علی" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /پاک/ })).toBeInTheDocument()
  })
})

describe('Select', () => {
  const options = [{ value: 'a', label: 'گزینه‌ی اول' }, { value: 'b', label: 'گزینه‌ی دوم' }]

  it('placeholder و گزینه‌ها رو رندر می‌کنه', () => {
    render(<Select value="" onChange={() => {}} options={options} placeholder="انتخاب کن" />)
    expect(screen.getByText('انتخاب کن')).toBeInTheDocument()
    expect(screen.getByText('گزینه‌ی اول')).toBeInTheDocument()
  })
  it('تغییر مقدار onChange رو صدا می‌زنه', () => {
    const onChange = vi.fn()
    render(<Select value="a" onChange={onChange} options={options} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b' } })
    expect(onChange).toHaveBeenCalledWith('b')
  })
})

describe('Modal', () => {
  it('وقتی open=false باشه، هیچی رندر نمی‌شه', () => {
    render(<Modal open={false} onClose={() => {}} title="عنوان">محتوا</Modal>)
    expect(screen.queryByText('عنوان')).not.toBeInTheDocument()
  })
  it('وقتی open=true باشه، عنوان و محتوا نمایش داده می‌شن', () => {
    render(<Modal open={true} onClose={() => {}} title="ویرایش شریک">محتوای فرم</Modal>)
    expect(screen.getByText('ویرایش شریک')).toBeInTheDocument()
    expect(screen.getByText('محتوای فرم')).toBeInTheDocument()
  })
  it('کلیک روی پس‌زمینه، onClose رو صدا می‌زنه', () => {
    const onClose = vi.fn()
    const { container } = render(<Modal open={true} onClose={onClose} title="عنوان">محتوا</Modal>)
    fireEvent.click(container.firstChild)
    expect(onClose).toHaveBeenCalled()
  })
  it('کلیک داخل بدنه‌ی مودال، onClose رو صدا نمی‌زنه (stopPropagation)', () => {
    const onClose = vi.fn()
    render(<Modal open={true} onClose={onClose} title="عنوان">محتوای داخلی</Modal>)
    fireEvent.click(screen.getByText('محتوای داخلی'))
    expect(onClose).not.toHaveBeenCalled()
  })
  it('دکمه‌ی بستن باید aria-label داشته باشه (دسترس‌پذیری، آیکون‌فقط)', () => {
    render(<Modal open={true} onClose={() => {}} title="عنوان">محتوا</Modal>)
    expect(screen.getByRole('button', { name: /بستن/ })).toBeInTheDocument()
  })
  it('نقش دیالوگ و aria-modal رو داره (دسترس‌پذیری screen reader)', () => {
    render(<Modal open={true} onClose={() => {}} title="عنوان مودال">محتوا</Modal>)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('عنوان مودال')
  })
  it('کلید Escape باید onClose رو صدا بزنه', () => {
    const onClose = vi.fn()
    render(<Modal open={true} onClose={onClose} title="عنوان">محتوا</Modal>)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})

describe('FormField', () => {
  it('ستاره‌ی الزامی رو فقط وقتی required=true نشون می‌ده', () => {
    const { rerender } = render(<FormField label="نام">فرزند</FormField>)
    expect(screen.queryByText('*')).not.toBeInTheDocument()
    rerender(<FormField label="نام" required>فرزند</FormField>)
    expect(screen.getByText('*')).toBeInTheDocument()
  })
})

describe('Pagination', () => {
  it('اگه فقط یک صفحه باشه، چیزی رندر نمی‌شه', () => {
    const { container } = render(<Pagination page={1} total={5} perPage={10} onChange={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })
  it('شماره‌ی صفحه‌ی فعلی رو مشخص می‌کنه و کلیک onChange رو صدا می‌زنه', () => {
    const onChange = vi.fn()
    render(<Pagination page={2} total={45} perPage={10} onChange={onChange} />)
    // ۴۵ رکورد / ۱۰تایی = ۵ صفحه
    expect(screen.getByText('5')).toBeInTheDocument()
    fireEvent.click(screen.getByText('3'))
    expect(onChange).toHaveBeenCalledWith(3)
  })
})

/* یه <button role="switch"> واقعی به‌جای <div onClick> — بدون این، سوییچ فقط با
   موس قابل تغییر بود، چون <div> به‌صورت پیش‌فرض قابل فوکوس/کیبورد نیست. این
   کامپوننت جایگزین سه‌تا جای تکراری همین الگو در Settings.jsx و Products.jsx شد. */
describe('ToggleSwitch', () => {
  it('یک button واقعی با role=switch رندر می‌کنه (نه div)، تا با کیبورد هم کار کنه', () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} label="فعال‌سازی" />)
    const el = screen.getByRole('switch', { name: 'فعال‌سازی' })
    expect(el.tagName).toBe('BUTTON')
  })

  it('aria-checked رو با پراپ checked هماهنگ نگه می‌داره', () => {
    const { rerender } = render(<ToggleSwitch checked={false} onChange={() => {}} label="x" />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
    rerender(<ToggleSwitch checked={true} onChange={() => {}} label="x" />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('کلیک، onChange رو با مقدار معکوس‌شده صدا می‌زنه', () => {
    const onChange = vi.fn()
    render(<ToggleSwitch checked={false} onChange={onChange} label="x" />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('چون یک button واقعیه، Enter/Space به‌صورت پیش‌فرض مرورگر کلیک رو trigger می‌کنه (بدون نیاز به onKeyDown دستی)', () => {
    // این تست فقط تأیید می‌کنه type="button" هست (نه submit که فرم رو ارسال کنه)
    // و disabled نیست؛ رفتار Enter/Space خود مرورگره، نه چیزی که این کامپوننت پیاده کنه.
    render(<ToggleSwitch checked={false} onChange={() => {}} label="x" />)
    const el = screen.getByRole('switch')
    expect(el).toHaveAttribute('type', 'button')
    expect(el).not.toBeDisabled()
  })
})
