import { AlertTriangle } from 'lucide-react'
import ErrorPageShell from './ErrorPageShell'

export default function UnknownError({ message, onRetry }) {
  return (
    <ErrorPageShell
      code={null}
      tone="danger"
      icon={<AlertTriangle size={30} />}
      title="یه چیزی خراب شد"
      description={
        message
          ? `جزئیات فنی: ${message}`
          : 'یک خطای پیش‌بینی‌نشده رخ داد. صفحه رو دوباره بارگذاری کنید؛ اگه مشکل ادامه داشت، از دکمه‌ی بازخورد به تیم پشتیبانی اطلاع بدید.'
      }
      primaryAction={{ label: 'بارگذاری دوباره', onClick: onRetry || (() => window.location.reload()) }}
      secondaryAction={{ label: 'بازگشت به داشبورد', onClick: () => { window.location.href = '/' } }}
    />
  )
}
