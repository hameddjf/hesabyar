import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { isoToFaDisplay, todayISO } from './jalali'
import { formatToman } from './format'

const TX_META = {
  capital_in:   { label: 'آورده‌ی نقدی', sign: '+' },
  capital_out:  { label: 'برداشت',       sign: '−' },
  profit_share: { label: 'سهم سود',      sign: '+' },
  adjustment:   { label: 'اصلاحیه',      sign: '+' },
}

/**
 * ساخت HTML چاپی دفتر حساب یک شریک. عمداً همون الگوی buildInvoiceHTML توی
 * invoicePdf.js رو دنبال می‌کنه (html2canvas → jsPDF) تا رندر فارسی/RTL
 * دقیقاً مثل چیزیه که کاربر روی صفحه می‌بینه، بدون درگیری embed فونت در jsPDF.
 */
function buildPartnerLedgerHTML(partner, transactions, balance, company) {
  const rows = transactions.length
    ? transactions.map((tx) => {
        const meta = TX_META[tx.type] || { label: tx.type, sign: '' }
        return `
        <tr>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${isoToFaDisplay(tx.date)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${meta.label}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;color:#6b7280;">${tx.description || '—'}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:left;direction:ltr;font-weight:600;">${meta.sign}${formatToman(tx.amount)} ت</td>
        </tr>`
      }).join('')
    : `<tr><td colspan="4" style="padding:14px;text-align:center;color:#9ca3af;">رویدادی ثبت نشده</td></tr>`

  return `
  <div style="width:780px;padding:40px;background:#fff;font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#1f2937;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #4f46e5;padding-bottom:20px;margin-bottom:24px;">
      <div>
        <h1 style="margin:0 0 4px;font-size:20px;color:#111827;">${company?.name || 'شرکت'}</h1>
        <p style="margin:0;font-size:11px;color:#6b7280;">${company?.phone || ''} ${company?.email ? ' · ' + company.email : ''}</p>
      </div>
      <div style="text-align:left;">
        <h2 style="margin:0 0 4px;font-size:16px;color:#4f46e5;">دفتر حساب شریک</h2>
        <p style="margin:0;font-size:11px;color:#9ca3af;">تاریخ گزارش: ${isoToFaDisplay(todayISO())}</p>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;margin-bottom:24px;">
      <div>
        <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;">نام شریک</p>
        <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#111827;">${partner.name}</p>
        <p style="margin:0;font-size:11px;color:#9ca3af;">سمت / سهم مالکیت</p>
        <p style="margin:0;font-size:12px;color:#374151;">${partner.role || '—'} · ${partner.share ?? 0}٪</p>
      </div>
      <div style="text-align:left;">
        <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;">موجودی فعلی حساب</p>
        <p style="margin:0;font-size:18px;font-weight:700;color:#4f46e5;direction:ltr;">${formatToman(balance)} ت</p>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:#6b7280;">تاریخ</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:#6b7280;">نوع رویداد</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:#6b7280;">توضیحات</th>
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6b7280;">مبلغ</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;">
      <span>تعداد رویداد: ${transactions.length}</span>
      <span>صادرشده توسط حسابیار</span>
    </div>
  </div>`
}

/** دانلود PDF دفتر حساب شریک (تراکنش‌های partner-ledger + موجودی فعلی) */
export async function downloadPartnerLedgerPDF(partner, transactions, balance, company) {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.top = '-99999px'
  container.style.left = '-99999px'
  container.innerHTML = buildPartnerLedgerHTML(partner, transactions, balance, company)
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

    const filename = `partner-ledger-${(partner.name || 'partner').replace(/\s+/g, '-')}.pdf`
    pdf.save(filename)
  } finally {
    document.body.removeChild(container)
  }
}

/** باز کردن پنجره‌ی چاپ مرورگر برای دفتر حساب شریک (بدون دانلود فایل) */
export function printPartnerLedger(partner, transactions, balance, company) {
  const win = window.open('', '_blank', 'width=900,height=1000')
  if (!win) return
  win.document.write(`
    <html dir="rtl" lang="fa">
      <head><title>دفتر حساب - ${partner.name}</title></head>
      <body style="margin:0;">
        ${buildPartnerLedgerHTML(partner, transactions, balance, company)}
        <script>window.onload = () => { window.print(); }</script>
      </body>
    </html>
  `)
  win.document.close()
}
