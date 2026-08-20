import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { isoToFaDisplay } from './jalali'

const fmt = (n) => Number(n || 0).toLocaleString('fa-IR')

const TYPE_LABEL = { sale:'فاکتور فروش', buy:'فاکتور خرید', presale:'پیش‌فاکتور فروش', prebuy:'پیش‌فاکتور خرید' }
const STATUS_LABEL = { draft:'پیش‌نویس', pending:'در انتظار پرداخت', paid:'پرداخت‌شده', overdue:'سررسید گذشته' }

/** ساخت HTML چاپی فاکتور (استایل ساده، سفید، مناسب چاپ/PDF) */
function buildInvoiceHTML(invoice, company, clientName) {
  let items = []
  try { items = JSON.parse(invoice.itemsJson || invoice.items_json || '[]') } catch { items = [] }

  const itemRows = items.length
    ? items.map((it) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${it.desc || ''}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">${fmt(it.qty)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:left;direction:ltr;">${fmt(it.price)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:left;direction:ltr;font-weight:600;">${fmt(it.total)}</td>
      </tr>`).join('')
    : `<tr><td colspan="4" style="padding:14px;text-align:center;color:#9ca3af;">قلمی ثبت نشده</td></tr>`

  return `
  <div style="width:780px;padding:40px;background:#fff;font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#1f2937;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #4f46e5;padding-bottom:20px;margin-bottom:24px;">
      <div>
        <h1 style="margin:0 0 4px;font-size:20px;color:#111827;">${company?.name || 'شرکت'}</h1>
        <p style="margin:0;font-size:11px;color:#6b7280;">${company?.phone || ''} ${company?.email ? ' · ' + company.email : ''}</p>
        <p style="margin:2px 0 0;font-size:11px;color:#6b7280;">${company?.address || ''}</p>
      </div>
      <div style="text-align:left;">
        <h2 style="margin:0 0 4px;font-size:16px;color:#4f46e5;">${TYPE_LABEL[invoice.type] || 'فاکتور'}</h2>
        <p style="margin:0;font-size:12px;color:#374151;direction:ltr;text-align:left;">${invoice.invoiceNumber || invoice.invoice_number || ''}</p>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;margin-bottom:24px;">
      <div>
        <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;">صورتحساب برای</p>
        <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${clientName || '—'}</p>
      </div>
      <div style="text-align:left;">
        <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;">تاریخ صدور</p>
        <p style="margin:0 0 8px;font-size:12px;color:#374151;">${isoToFaDisplay(invoice.issueDate || invoice.issue_date)}</p>
        <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;">تاریخ سررسید</p>
        <p style="margin:0;font-size:12px;color:#374151;">${isoToFaDisplay(invoice.dueDate || invoice.due_date)}</p>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:#6b7280;">شرح</th>
          <th style="padding:8px 10px;text-align:center;font-size:11px;color:#6b7280;">تعداد</th>
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;">قیمت واحد</th>
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;">جمع</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
      <div style="width:260px;">
        ${[
          ['جمع اقلام', fmt(invoice.totalAmount || invoice.total_amount)],
          ['تخفیف', '- ' + fmt(invoice.discount)],
          ['مالیات', fmt(invoice.taxAmount || invoice.tax_amount)],
        ].map(([l,v]) => `
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;padding:4px 0;">
            <span>${l}</span><span style="direction:ltr;">${v} ت</span>
          </div>`).join('')}
        <div style="display:flex;justify-content:space-between;border-top:2px solid #111827;margin-top:6px;padding-top:8px;">
          <span style="font-size:13px;font-weight:700;color:#111827;">مبلغ نهایی</span>
          <span style="font-size:15px;font-weight:700;color:#4f46e5;direction:ltr;">${fmt(invoice.grandTotal || invoice.grand_total)} ت</span>
        </div>
      </div>
    </div>

    ${invoice.description ? `<p style="font-size:11px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:12px;">توضیحات: ${invoice.description}</p>` : ''}

    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;">
      <span>وضعیت: ${STATUS_LABEL[invoice.status] || invoice.status}</span>
      <span>صادرشده توسط حسابیار</span>
    </div>
  </div>`
}

/**
 * دانلود PDF یک فاکتور. چون رابط کاربری کاملاً فارسی/RTLه و embed کردن فونت فارسی
 * توی jsPDF مستقیم پرریسک و شکننده‌ست، این تابع اول یک HTML تمیز می‌سازه،
 * با html2canvas ازش عکس می‌گیره، و عکس رو داخل PDF می‌ذاره — ظاهر دقیقاً مطابق صفحه‌ست.
 */
export async function downloadInvoicePDF(invoice, company, clientName) {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.top = '-99999px'
  container.style.left = '-99999px'
  container.innerHTML = buildInvoiceHTML(invoice, company, clientName)
  document.body.appendChild(container)

  try {
    const target = container.firstElementChild
    const canvas = await html2canvas(target, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
    const imgData = canvas.toDataURL('image/png')

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pageWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    let heightLeft = imgHeight
    let position = 0
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    const filename = `${invoice.invoiceNumber || invoice.invoice_number || 'invoice'}.pdf`
    pdf.save(filename)
  } finally {
    document.body.removeChild(container)
  }
}
