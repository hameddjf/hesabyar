import { ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ErrorPageShell from './ErrorPageShell'

export default function Forbidden() {
  const navigate = useNavigate()
  return (
    <ErrorPageShell
      code={403}
      tone="warning"
      icon={<ShieldAlert size={30} />}
      title="دسترسی به این بخش رو ندارید"
      description="نقش یا سطح دسترسی حساب کاربری شما اجازه‌ی دیدن این صفحه رو نمی‌ده. اگه فکر می‌کنید این یه اشتباهه، از مدیر شرکت خودتون بخواید دسترسی مربوطه رو براتون فعال کنه."
      primaryAction={{ label: 'بازگشت به داشبورد', onClick: () => navigate('/') }}
      secondaryAction={{ label: 'صفحه‌ی قبل', onClick: () => navigate(-1) }}
    />
  )
}
