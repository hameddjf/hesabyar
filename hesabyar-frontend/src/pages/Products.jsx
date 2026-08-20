import { useState } from 'react'
import { Package, Tag, BarChart2, Plus, Download, Eye, Edit2, Trash2, WifiOff } from 'lucide-react'
import { Badge, StatCard, Tabs, SearchInput, Select, Pagination, EmptyState, Modal, FormField, ToggleSwitch } from '@/components/ui'
import { useProducts } from '@/hooks/useProducts'
import CustomizableGrid from '@/components/ui/CustomizableGrid'

const PRODUCT_STAT_WIDGETS = [
  { id: 'stat-total',    title: 'کارت کل محصولات', span: 1, defaultVisible: true },
  { id: 'stat-active',   title: 'کارت محصولات فعال', span: 1, defaultVisible: true },
  { id: 'stat-lowstock', title: 'کارت موجودی کم',   span: 1, defaultVisible: true },
  { id: 'stat-avgprice', title: 'کارت میانگین قیمت', span: 1, defaultVisible: true },
]

const CATEGORIES = [
  { value:'service',   label:'خدمات',        color:'#1d4ed8', bg:'#eff6ff' },
  { value:'product',   label:'کالا / محصول', color:'#15803d', bg:'#f0fdf4' },
  { value:'software',  label:'نرم‌افزار',     color:'#7e22ce', bg:'#fdf4ff' },
  { value:'hardware',  label:'سخت‌افزار',     color:'#0e7490', bg:'#ecfeff' },
  { value:'consulting',label:'مشاوره',        color:'#9a3412', bg:'#ffedd5' },
  { value:'other',     label:'سایر',          color:'#6b7280', bg:'var(--t-accent-light)' },
]
const CAT_MAP = Object.fromEntries(CATEGORIES.map(c=>[c.value,c]))

const UNITS = [
  {value:'piece',label:'عدد'},{value:'hour',label:'ساعت'},{value:'month',label:'ماه'},
  {value:'kg',label:'کیلوگرم'},{value:'meter',label:'متر'},{value:'set',label:'دست / ست'},
  {value:'pack',label:'بسته'},{value:'other',label:'سایر'},
]
const UNIT_MAP = Object.fromEntries(UNITS.map(u=>[u.value,u.label]))

const STATUS_META = {
  active:   {label:'فعال',     type:'green'},
  inactive: {label:'غیرفعال', type:'gray'},
  draft:    {label:'پیش‌نویس',type:'amber'},
  pending_sync: {label:'در صف ارسال (آفلاین)', type:'amber'},
}

const TABS_BASE = [
  {key:'all',       label:'همه'},
  {key:'service',   label:'خدمات'},
  {key:'software',  label:'نرم‌افزار'},
  {key:'hardware',  label:'سخت‌افزار'},
  {key:'consulting',label:'مشاوره'},
  {key:'product',   label:'کالا'},
]

function ProductForm({open,onClose,product,onSubmit}){
  const inp = {background:'var(--t-search-bg)',border:'0.5px solid var(--t-card-border)',borderRadius:7,padding:'8px 10px',fontSize:12,color:'var(--t-txt)',fontFamily:'inherit',outline:'none',width:'100%'}
  const [hasStock,setHasStock] = useState(product?.stock!==null && product?.stock!==undefined)
  const [category,setCategory] = useState(product?.category||'')
  const [unit,setUnit]         = useState(product?.unit||'')
  const [name,setName]         = useState(product?.name||'')
  const [sku,setSku]           = useState(product?.sku||'')
  const [price,setPrice]       = useState(product?.price??'')
  const [taxRate,setTaxRate]   = useState('10')
  const [desc,setDesc]         = useState(product?.desc||'')
  const [stock,setStock]       = useState(product?.stock??'')
  const [minStock,setMinStock] = useState('')
  const [submitting,setSubmitting] = useState(false)
  const [submitError,setSubmitError] = useState(null)
  const catOpts  = CATEGORIES.map(c=>({value:c.value,label:c.label}))
  const unitOpts = UNITS.map(u=>({value:u.value,label:u.label}))

  async function handleSubmit(){
    if(!name || !category || !unit || !price){
      setSubmitError('نام، دسته‌بندی، واحد و قیمت الزامی هستن')
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try{
      await onSubmit({
        name, sku: sku || null, category, unit,
        price: Number(price), taxRate: Number(taxRate) || 0,
        description: desc || null,
        stock: hasStock ? Number(stock || 0) : null,
        minStock: hasStock ? Number(minStock || 0) : null,
        status: 'active',
      })
      onClose()
    }catch(err){
      setSubmitError(err.message || 'ثبت محصول ناموفق بود')
    }finally{
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={product?'ویرایش محصول / خدمت':'افزودن محصول / خدمت'} width={560}>
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <FormField label="نام محصول / خدمت" required>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="نام محصول..." style={inp}/>
          </FormField>
          <FormField label="کد / SKU">
            <input value={sku} onChange={e=>setSku(e.target.value)} placeholder="PRD-001" style={inp} dir="ltr"/>
          </FormField>
          <FormField label="دسته‌بندی" required>
            <Select value={category} onChange={setCategory} options={catOpts} placeholder="انتخاب کنید..."/>
          </FormField>
          <FormField label="واحد" required>
            <Select value={unit} onChange={setUnit} options={unitOpts} placeholder="انتخاب کنید..."/>
          </FormField>
          <FormField label="قیمت پایه (تومان)" required>
            <input value={price} onChange={e=>setPrice(e.target.value)} placeholder="0" style={inp} dir="ltr"/>
          </FormField>
          <FormField label="مالیات بر ارزش افزوده (%)">
            <input value={taxRate} onChange={e=>setTaxRate(e.target.value)} placeholder="0" style={inp} dir="ltr"/>
          </FormField>
        </div>
        <FormField label="توضیحات">
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="توضیح محصول یا خدمت..." rows={2} style={{...inp,resize:'none'}}/>
        </FormField>
        {/* مدیریت موجودی */}
        <div style={{background:'var(--t-search-bg)',borderRadius:10,padding:14,border:'0.5px solid var(--t-card-border)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:hasStock?12:0}}>
            <p style={{fontSize:12,fontWeight:500,color:'var(--t-txt)',margin:0}}>مدیریت موجودی انبار</p>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <ToggleSwitch checked={hasStock} onChange={setHasStock} label="مدیریت موجودی انبار" />
              <span style={{fontSize:12,color:'var(--t-txt-muted)'}}>{hasStock?'فعال':'غیرفعال (خدمت/دیجیتال)'}</span>
            </div>
          </div>
          {hasStock && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
              <FormField label="موجودی فعلی"><input value={stock} onChange={e=>setStock(e.target.value)} placeholder="0" style={inp} dir="ltr"/></FormField>
              <FormField label="حداقل موجودی (هشدار)"><input value={minStock} onChange={e=>setMinStock(e.target.value)} placeholder="مثلاً: ۵" style={inp} dir="ltr"/></FormField>
              <FormField label="واحد انبار"><input placeholder="عدد، جعبه..." style={inp}/></FormField>
            </div>
          )}
        </div>
        {submitError && <p style={{fontSize:12,color:'#dc2626',margin:0}}>{submitError}</p>}
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,paddingTop:4}}>
          <button onClick={onClose} className="btn-secondary" disabled={submitting}>انصراف</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            <Plus size={14}/> {submitting ? 'در حال ثبت...' : (product?'ذخیره':'افزودن')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ProductDetail({open,onClose,product,onEdit}){
  if(!product) return null
  const cat = CAT_MAP[product.category]
  const sm  = STATUS_META[product.status]
  const lowStock = product.stock!==null && product.stock<=5
  return (
    <Modal open={open} onClose={onClose} title="جزئیات محصول" width={440}>
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:14}}>
          <div style={{width:52,height:52,borderRadius:14,background:cat.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Package size={24} style={{color:cat.color}}/>
          </div>
          <div style={{flex:1}}>
            <h3 style={{fontSize:15,fontWeight:600,color:'var(--t-txt)',margin:'0 0 6px'}}>{product.name}</h3>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              <span style={{fontSize:11,fontWeight:500,padding:'2px 8px',borderRadius:99,background:cat.bg,color:cat.color}}>{cat.label}</span>
              <Badge type={sm.type}>{sm.label}</Badge>
            </div>
          </div>
        </div>
        {product.desc && <p style={{fontSize:13,color:'var(--t-txt-muted)',margin:0,lineHeight:1.7}}>{product.desc}</p>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[
            ['قیمت پایه', product.price.toLocaleString('fa-IR')+' ت'],
            ['واحد', UNIT_MAP[product.unit]||product.unit],
            ['موجودی', product.stock!==null?product.stock.toLocaleString('fa-IR'):' بدون انبار'],
            ['کد SKU', product.sku],
          ].map(([l,v])=>(
            <div key={l} style={{background:'var(--t-search-bg)',borderRadius:8,padding:'10px 12px'}}>
              <p style={{fontSize:11,color:'var(--t-txt-muted)',margin:'0 0 3px'}}>{l}</p>
              <p style={{fontSize:13,fontWeight:500,color:'var(--t-txt)',margin:0,direction:l==='کد SKU'?'ltr':undefined}}>{v}</p>
            </div>
          ))}
        </div>
        {lowStock && (
          <div style={{background:'#fef3c7',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#92400e'}}>
            ⚠️ موجودی پایین است — نیاز به تأمین مجدد دارد
          </div>
        )}
        <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
          <button onClick={onClose} className="btn-secondary">بستن</button>
          <button onClick={onEdit} className="btn-primary"><Edit2 size={14}/> ویرایش</button>
        </div>
      </div>
    </Modal>
  )
}

export default function Products(){
  const { products, loading, isMock, reload, createProduct, updateProduct, removeProduct } = useProducts()
  const [tab,    setTab]    = useState('all')
  const [search, setSearch] = useState('')
  const [statusF,setStatusF]= useState('')
  const [page,   setPage]   = useState(1)
  const [showForm,  setShowForm]  = useState(false)
  const [editProd,  setEditProd]  = useState(null)
  const [detailProd,setDetailProd]= useState(null)

  const TABS = TABS_BASE.map(t => ({
    ...t,
    count: t.key === 'all' ? products.length : products.filter(p => p.category === t.key).length,
  }))

  const filtered = products.filter(p=>{
    if(tab!=='all'&&p.category!==tab) return false
    if(statusF&&p.status!==statusF) return false
    if(search&&!p.name.includes(search)&&!(p.sku||'').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const avgPrice = products.length ? Math.round(products.reduce((s,p)=>s+p.price,0)/products.length) : 0
  const lowStockCount = products.filter(p=>p.stock!==null&&p.stock<=5).length

  async function handleFormSubmit(payload){
    if (editProd) await updateProduct(editProd.id, payload)
    else await createProduct(payload)
  }

  async function handleDelete(id){
    if (!confirm('این محصول حذف بشه؟')) return
    await removeProduct(id)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      {isMock && (
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 14px',borderRadius:8,background:'#fef3c7',color:'#92400e',fontSize:12}}>
          <WifiOff size={14} />
          اتصال به سرور برقرار نشد یا هنوز دیتای واقعی ثبت نشده — نمونه‌ی نمایشی نشون داده میشه.
        </div>
      )}
      <CustomizableGrid
        pageKey="products"
        widgetDefs={PRODUCT_STAT_WIDGETS}
        columns={4}
        renderWidget={(id) => {
          switch (id) {
            case 'stat-total':    return <StatCard icon={Package}   label="کل محصولات / خدمات" value={products.length.toString()}/>
            case 'stat-active':   return <StatCard icon={Tag}       label="محصولات فعال"        value={products.filter(p=>p.status==='active').length.toString()} sub={`از ${products.length} محصول`}/>
            case 'stat-lowstock': return <StatCard icon={BarChart2} label="موجودی کم"           value={lowStockCount.toString()} sub="نیاز به تأمین" subColor={lowStockCount>0?'#d97706':undefined}/>
            case 'stat-avgprice': return <StatCard icon={Tag}       label="میانگین قیمت"        value={`${(avgPrice/1_000_000).toFixed(1)}م`} sub="تومان"/>
            default: return null
          }
        }}
      />

      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 20px',borderBottom:'0.5px solid var(--t-card-border)'}}>
          <div>
            <h2 style={{fontSize:14,fontWeight:600,color:'var(--t-txt)',margin:0}}>محصولات و خدمات</h2>
            <p style={{fontSize:12,color:'var(--t-txt-muted)',margin:'2px 0 0'}}>مدیریت کالاها، خدمات و قیمت‌گذاری</p>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn-secondary"><Download size={14}/> خروجی</button>
            <button className="btn-primary" onClick={()=>{setEditProd(null);setShowForm(true)}}><Plus size={14}/> محصول جدید</button>
          </div>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 20px',borderBottom:'0.5px solid var(--t-card-border)',flexWrap:'wrap'}}>
          <Tabs tabs={TABS} active={tab} onChange={t=>{setTab(t);setPage(1)}}/>
          <div style={{flex:1}}/>
          <SearchInput value={search} onChange={setSearch} placeholder="نام محصول یا کد SKU..."/>
          <Select value={statusF} onChange={setStatusF} options={[{value:'active',label:'فعال'},{value:'inactive',label:'غیرفعال'},{value:'draft',label:'پیش‌نویس'}]} placeholder="وضعیت"/>
        </div>

        {filtered.length===0 ? <EmptyState icon={Package} title="محصولی یافت نشد"/> : (
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr style={{background:'var(--t-search-bg)'}}>
                {['کد','نام محصول / خدمت','دسته','واحد','قیمت پایه','موجودی','وضعیت',''].map(h=>(
                  <th key={h} style={{padding:'9px 14px',textAlign:'right',fontSize:11,fontWeight:500,color:'var(--t-txt-muted)',borderBottom:'0.5px solid var(--t-card-border)',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p=>{
                const cat = CAT_MAP[p.category]
                const sm  = STATUS_META[p.status]
                const lowStock = p.stock!==null&&p.stock<=5
                return (
                  <tr key={p.id} style={{borderBottom:'0.5px solid var(--t-card-border)',transition:'background .1s',cursor:'pointer'}}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--t-search-bg)'}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                  >
                    <td style={{padding:'11px 14px',fontSize:11,color:'var(--t-txt-muted)',direction:'ltr'}}>{p.sku}</td>
                    <td style={{padding:'11px 14px'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:30,height:30,borderRadius:8,background:cat.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <Package size={14} style={{color:cat.color}}/>
                        </div>
                        <div>
                          <p style={{fontSize:13,fontWeight:500,color:'var(--t-txt)',margin:0}}>{p.name}</p>
                          {p.desc&&<p style={{fontSize:11,color:'var(--t-txt-muted)',margin:0,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.desc}</p>}
                        </div>
                      </div>
                    </td>
                    <td style={{padding:'11px 14px'}}>
                      <span style={{fontSize:11,fontWeight:500,padding:'2px 8px',borderRadius:99,background:cat.bg,color:cat.color,whiteSpace:'nowrap'}}>{cat.label}</span>
                    </td>
                    <td style={{padding:'11px 14px',fontSize:12,color:'var(--t-txt-muted)'}}>{UNIT_MAP[p.unit]||p.unit}</td>
                    <td style={{padding:'11px 14px',fontSize:13,fontWeight:600,color:'var(--t-txt)',direction:'ltr',textAlign:'right',whiteSpace:'nowrap'}}>{p.price.toLocaleString('fa-IR')}</td>
                    <td style={{padding:'11px 14px'}}>
                      {p.stock===null
                        ? <span style={{fontSize:11,color:'var(--t-txt-muted)'}}>—</span>
                        : <span style={{fontSize:12,fontWeight:500,color:lowStock?'#d97706':'var(--t-txt)',display:'flex',alignItems:'center',gap:4}}>
                            {lowStock&&<span>⚠️</span>}{p.stock.toLocaleString('fa-IR')}
                          </span>}
                    </td>
                    <td style={{padding:'11px 14px'}}><Badge type={sm.type}>{sm.label}</Badge></td>
                    <td style={{padding:'11px 14px'}}>
                      <div style={{display:'flex',gap:2}}>
                        <button className="icon-btn" aria-label="مشاهده جزئیات" style={{width:28,height:28}} onClick={()=>setDetailProd(p)}><Eye size={14}/></button>
                        <button className="icon-btn" aria-label="ویرایش" style={{width:28,height:28}} onClick={()=>{setEditProd(p);setShowForm(true)}}><Edit2 size={14}/></button>
                        <button className="icon-btn" aria-label="حذف" style={{width:28,height:28}} onClick={()=>handleDelete(p.id)}><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <div style={{padding:'12px 20px'}}><Pagination page={page} total={filtered.length} perPage={10} onChange={setPage}/></div>
      </div>

      <ProductForm    open={showForm}     onClose={()=>setShowForm(false)}   product={editProd} onSubmit={handleFormSubmit}/>
      <ProductDetail  open={!!detailProd} onClose={()=>setDetailProd(null)}  product={detailProd}
        onEdit={()=>{setEditProd(detailProd);setDetailProd(null);setShowForm(true)}}/>
    </div>
  )
}
