import{h as y,E as h}from"./pdf-Dmu5PVKf.js";import{c as b}from"./jalali-CNrlZth4.js";import"./jalali-BBUs3GUM.js";const s=t=>Number(t||0).toLocaleString("fa-IR"),u={sale:"فاکتور فروش",buy:"فاکتور خرید",presale:"پیش‌فاکتور فروش",prebuy:"پیش‌فاکتور خرید"},z={draft:"پیش‌نویس",pending:"در انتظار پرداخت",paid:"پرداخت‌شده",overdue:"سررسید گذشته"};function $(t,e,a){let o=[];try{o=JSON.parse(t.itemsJson||t.items_json||"[]")}catch{o=[]}const r=o.length?o.map(i=>`
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;">${i.desc||""}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">${s(i.qty)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:left;direction:ltr;">${s(i.price)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;text-align:left;direction:ltr;font-weight:600;">${s(i.total)}</td>
      </tr>`).join(""):'<tr><td colspan="4" style="padding:14px;text-align:center;color:#9ca3af;">قلمی ثبت نشده</td></tr>';return`
  <div style="width:780px;padding:40px;background:#fff;font-family:Tahoma,Arial,sans-serif;direction:rtl;color:#1f2937;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #4f46e5;padding-bottom:20px;margin-bottom:24px;">
      <div>
        <h1 style="margin:0 0 4px;font-size:20px;color:#111827;">${(e==null?void 0:e.name)||"شرکت"}</h1>
        <p style="margin:0;font-size:11px;color:#6b7280;">${(e==null?void 0:e.phone)||""} ${e!=null&&e.email?" · "+e.email:""}</p>
        <p style="margin:2px 0 0;font-size:11px;color:#6b7280;">${(e==null?void 0:e.address)||""}</p>
      </div>
      <div style="text-align:left;">
        <h2 style="margin:0 0 4px;font-size:16px;color:#4f46e5;">${u[t.type]||"فاکتور"}</h2>
        <p style="margin:0;font-size:12px;color:#374151;direction:ltr;text-align:left;">${t.invoiceNumber||t.invoice_number||""}</p>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;margin-bottom:24px;">
      <div>
        <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;">صورتحساب برای</p>
        <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${a||"—"}</p>
      </div>
      <div style="text-align:left;">
        <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;">تاریخ صدور</p>
        <p style="margin:0 0 8px;font-size:12px;color:#374151;">${b(t.issueDate||t.issue_date)}</p>
        <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;">تاریخ سررسید</p>
        <p style="margin:0;font-size:12px;color:#374151;">${b(t.dueDate||t.due_date)}</p>
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
      <tbody>${r}</tbody>
    </table>

    <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
      <div style="width:260px;">
        ${[["جمع اقلام",s(t.totalAmount||t.total_amount)],["تخفیف","- "+s(t.discount)],["مالیات",s(t.taxAmount||t.tax_amount)]].map(([i,p])=>`
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;padding:4px 0;">
            <span>${i}</span><span style="direction:ltr;">${p} ت</span>
          </div>`).join("")}
        <div style="display:flex;justify-content:space-between;border-top:2px solid #111827;margin-top:6px;padding-top:8px;">
          <span style="font-size:13px;font-weight:700;color:#111827;">مبلغ نهایی</span>
          <span style="font-size:15px;font-weight:700;color:#4f46e5;direction:ltr;">${s(t.grandTotal||t.grand_total)} ت</span>
        </div>
      </div>
    </div>

    ${t.description?`<p style="font-size:11px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:12px;">توضیحات: ${t.description}</p>`:""}

    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;">
      <span>وضعیت: ${z[t.status]||t.status}</span>
      <span>صادرشده توسط حسابیار</span>
    </div>
  </div>`}async function j(t,e,a){const o=document.createElement("div");o.style.position="fixed",o.style.top="-99999px",o.style.left="-99999px",o.innerHTML=$(t,e,a),document.body.appendChild(o);try{const r=o.firstElementChild,i=await y(r,{scale:2,backgroundColor:"#ffffff",useCORS:!0}),p=i.toDataURL("image/png"),l=new h({orientation:"portrait",unit:"pt",format:"a4"}),c=l.internal.pageSize.getWidth(),g=l.internal.pageSize.getHeight(),x=c,d=i.height*x/i.width;let n=d,f=0;for(l.addImage(p,"PNG",0,f,x,d),n-=g;n>0;)f=n-d,l.addPage(),l.addImage(p,"PNG",0,f,x,d),n-=g;const m=`${t.invoiceNumber||t.invoice_number||"invoice"}.pdf`;l.save(m)}finally{document.body.removeChild(o)}}export{j as downloadInvoicePDF};
