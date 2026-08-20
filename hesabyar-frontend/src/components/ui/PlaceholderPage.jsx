import { Construction } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function PlaceholderPage({ pageKey }) {
  const { t } = useTranslation()
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Construction size={22} />
      </div>
      <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--t-txt)', marginBottom: 4 }}>
        {t(`${pageKey}.title`)}
      </h2>
      <p style={{ fontSize: 13, color: 'var(--t-txt-muted)' }}>این صفحه در حال توسعه است</p>
    </div>
  )
}
