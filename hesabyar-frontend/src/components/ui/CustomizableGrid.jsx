import { useState } from 'react'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, rectSortingStrategy, useSortable, sortableKeyboardCoordinates, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Settings2, GripVertical, EyeOff, Plus, RotateCcw, X, Check } from 'lucide-react'
import { useLayout } from '@/hooks/useLayout'

function SortableWidget({ id, editing, onHide, span, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: span === 2 ? 'span 2' : 'span 1',
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 10 : 'auto',
  }
  return (
    <div ref={setNodeRef} style={style}>
      {editing && (
        <div style={{
          position: 'absolute', top: 8, left: 8, zIndex: 5,
          display: 'flex', gap: 4,
        }}>
          <button
            {...attributes} {...listeners}
            title="جابجایی"
            style={{
              width: 26, height: 26, borderRadius: 7, border: 'none', cursor: 'grab',
              background: 'var(--t-card-bg)', boxShadow: '0 1px 4px rgba(0,0,0,.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t-txt-muted)',
            }}
          >
            <GripVertical size={13} />
          </button>
          <button
            onClick={() => onHide(id)}
            title="مخفی کردن این باکس"
            style={{
              width: 26, height: 26, borderRadius: 7, border: 'none', cursor: 'pointer',
              background: 'var(--t-card-bg)', boxShadow: '0 1px 4px rgba(0,0,0,.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626',
            }}
          >
            <EyeOff size={13} />
          </button>
        </div>
      )}
      <div style={{
        outline: editing ? '2px dashed var(--t-accent)' : 'none',
        outlineOffset: 4, borderRadius: 14, transition: 'outline .15s',
      }}>
        {children}
      </div>
    </div>
  )
}

/**
 * گرید قابل‌شخصی‌سازی — نمایش/عدم‌نمایش و ترتیب باکس‌های هر صفحه با کشیدن موس.
 *
 * widgetDefs: [{ id, title, span?: 1|2, defaultVisible?: boolean }]
 * renderWidget: (id) => ReactNode — خود صفحه محتوای هر باکس رو برمی‌گردونه
 */
export default function CustomizableGrid({ pageKey, widgetDefs, renderWidget, columns = 2 }) {
  const {
    loading, saving, editing, setEditing,
    items, visibleItems, hiddenItems,
    toggleWidget, reorder, resetToDefault,
  } = useLayout(pageKey, widgetDefs)

  const [showAddPanel, setShowAddPanel] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = visibleItems.map((i) => i.id)
    const oldIndex = ids.indexOf(active.id)
    const newIndex = ids.indexOf(over.id)
    const newVisibleOrder = arrayMove(ids, oldIndex, newIndex)
    // ترکیب با آیتم‌های مخفی (که آخر لیست باقی می‌مونن، ترتیبشون مهم نیست چون نمایش داده نمی‌شن)
    reorder([...newVisibleOrder, ...hiddenItems.map((i) => i.id)])
  }

  if (loading) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {editing && (
          <>
            <div style={{ position: 'relative' }}>
              <button
                className="btn-ghost" style={{ fontSize: 12 }}
                onClick={() => setShowAddPanel((v) => !v)}
              >
                <Plus size={13} /> افزودن باکس {hiddenItems.length > 0 && `(${hiddenItems.length})`}
              </button>
              {showAddPanel && (
                <div style={{
                  position: 'absolute', top: '110%', insetInlineStart: 0, zIndex: 20,
                  background: 'var(--t-card-bg)', border: '0.5px solid var(--t-card-border)',
                  borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,.15)', padding: 10, minWidth: 220,
                }}>
                  {hiddenItems.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--t-txt-muted)', margin: 0, padding: '4px 8px' }}>همه‌ی باکس‌ها نمایش داده می‌شن</p>
                  ) : hiddenItems.map((it) => (
                    <button
                      key={it.id}
                      onClick={() => { toggleWidget(it.id); setShowAddPanel(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                        padding: '7px 8px', borderRadius: 7, border: 'none', background: 'none',
                        cursor: 'pointer', fontSize: 12, color: 'var(--t-txt)', fontFamily: 'inherit', textAlign: 'right',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--t-search-bg)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      <Plus size={12} style={{ color: 'var(--t-accent)' }} /> {it.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="btn-ghost" style={{ fontSize: 12 }} onClick={resetToDefault} disabled={saving}>
              <RotateCcw size={13} /> بازگردانی پیش‌فرض
            </button>
          </>
        )}
        <button
          className={editing ? 'btn-primary' : 'btn-ghost'} style={{ fontSize: 12 }}
          onClick={() => { setEditing((v) => !v); setShowAddPanel(false) }}
        >
          {editing ? <><Check size={13} /> پایان شخصی‌سازی</> : <><Settings2 size={13} /> شخصی‌سازی چیدمان</>}
        </button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleItems.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 14 }}>
            {visibleItems.map((it) => (
              <SortableWidget key={it.id} id={it.id} editing={editing} onHide={toggleWidget} span={it.span}>
                {renderWidget(it.id)}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
