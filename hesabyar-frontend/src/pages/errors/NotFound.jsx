import { Compass } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ErrorPageShell from './ErrorPageShell'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <ErrorPageShell
      code={404}
      icon={<Compass size={30} />}
      title="این صفحه پیدا نشد"
      description="آدرسی که وارد کردید وجود نداره یا جابه‌جا شده. می‌تونید از منو یه مسیر دیگه انتخاب کنید یا برگردید به داشبورد."
      primaryAction={{ label: 'بازگشت به داشبورد', onClick: () => navigate('/') }}
      secondaryAction={{ label: 'صفحه‌ی قبل', onClick: () => navigate(-1) }}
    />
  )
}
