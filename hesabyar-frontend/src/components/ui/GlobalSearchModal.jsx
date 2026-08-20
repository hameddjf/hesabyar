import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X, FileText, Users, Package, Loader2 } from 'lucide-react'
import { api } from '@/lib/apiClient'
import { toCamel } from '@/lib/format'

export default function GlobalSearchModal({ open, onClose }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({ clients: [], products: [], invoices: [] })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!open) { setQuery(''); return }
    setTimeout(() => inputRef.current?.focus(), 50)
    if (loaded) return
    setLoading(true)
    Promise.all([
      api.clients.list().catch(() => []),
      api.get('/products').catch(() => []),
      api.get('/invoices').catch(() => []),
    ]).then(([clients, products, invoices]) => {
      const clientsById = Object.fromEntries(clients.map(c => [c.id, c.name]))
      setData({
        clients: clients.map(toCamel),
        products: products.map(toCamel),
        invoices: invoices.map(toCamel).map(i => ({ ...i, clientName: clientsById[i.clientId] })),
      })
      setLoaded(true)
    }).finally(() => setLoading(false))
  }, [open, loaded])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const results = useMemo(() => {
    const q = query.trim()
    if (!q) return { clients: [], products: [], invoices: [] }
    const match = (s) => (s || '').toString().includes(q)
    return {
      clients: data.clients.filter(c => match(c.name) || match(c.phone) || match(c.email)).slice(0, 6),
      products: data.products.filter(p => match(p.name) || match(p.sku)).slice(0, 6),
      invoices: data.invoices.filter(i => match(i.invoiceNumber) || match(i.clientName)).slice(0, 6),
    }
  }, [query, data])

  const hasResults = results.clients.length || results.products.length || results.invoices.length

  const go = (path) => { onClose(); navigate(path) }

  if (!open) return null

  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,.5)',
      display:'flex', alignItems:'flex-start', justifyContent:'center', paddingTop:'10vh',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:560, maxWidth:'90vw', maxHeight:'70vh', background:'var(--t-card-bg)',
        borderRadius:14, boxShadow:'0 20px 60px rgba(0,0,0,.3)', overflow:'hidden',
        display:'flex', flexDirection:'column',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 16px', borderBottom:'0.5px solid var(--t-card-border)' }}>
          <Search size={16} style={{ color:'var(--t-txt-muted)', flexShrink:0 }}/>
          <input
            ref={inputRef}
            value={query}
            onChange={e=>setQuery(e.target.value)}
            placeholder="جستجو در فاکتورها، مشتریان، محصولات..."
            style={{ flex:1, border:'none', outline:'none', background:'none', fontSize:14, color:'var(--t-txt)', fontFamily:'inherit' }}
          />
          {loading && <Loader2 size={14} className="spin" style={{ color:'var(--t-txt-muted)' }}/>}
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--t-txt-muted)', display:'flex' }}><X size={16}/></button>
        </div>

        <div style={{ overflowY:'auto', padding: query ? '8px 0' : '0' }}>
          {!query ? (
            <p style={{ fontSize:12, color:'var(--t-txt-muted)', padding:'20px 16px', textAlign:'center' }}>برای جستجو تایپ کن...</p>
          ) : !hasResults ? (
            <p style={{ fontSize:12, color:'var(--t-txt-muted)', padding:'20px 16px', textAlign:'center' }}>نتیجه‌ای یافت نشد.</p>
          ) : (
            <>
              {results.invoices.length > 0 && (
                <ResultGroup icon={FileText} label="فاکتورها">
                  {results.invoices.map(inv => (
                    <ResultRow key={inv.id} onClick={()=>go('/invoices')} title={inv.invoiceNumber || inv.id} sub={inv.clientName}/>
                  ))}
                </ResultGroup>
              )}
              {results.clients.length > 0 && (
                <ResultGroup icon={Users} label="مشتریان">
                  {results.clients.map(c => (
                    <ResultRow key={c.id} onClick={()=>go('/clients')} title={c.name} sub={c.phone || c.email}/>
                  ))}
                </ResultGroup>
              )}
              {results.products.length > 0 && (
                <ResultGroup icon={Package} label="محصولات">
                  {results.products.map(p => (
                    <ResultRow key={p.id} onClick={()=>go('/products')} title={p.name} sub={p.sku}/>
                  ))}
                </ResultGroup>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ResultGroup({ icon: Icon, label, children }) {
  return (
    <div style={{ marginBottom:6 }}>
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 16px', fontSize:10, color:'var(--t-txt-muted)', textTransform:'uppercase', letterSpacing:'.04em' }}>
        <Icon size={11}/> {label}
      </div>
      {children}
    </div>
  )
}

function ResultRow({ title, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display:'flex', flexDirection:'column', alignItems:'flex-start', gap:1, width:'100%',
        padding:'8px 16px', border:'none', background:'none', cursor:'pointer', textAlign:'right', fontFamily:'inherit',
      }}
      onMouseEnter={e=>e.currentTarget.style.background='var(--t-search-bg)'}
      onMouseLeave={e=>e.currentTarget.style.background='none'}
    >
      <span style={{ fontSize:13, color:'var(--t-txt)', fontWeight:500 }}>{title}</span>
      {sub && <span style={{ fontSize:11, color:'var(--t-txt-muted)' }}>{sub}</span>}
    </button>
  )
}
