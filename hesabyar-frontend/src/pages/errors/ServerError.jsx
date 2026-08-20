import { ServerCrash } from 'lucide-react'
import ErrorPageShell from './ErrorPageShell'

export default function ServerError() {
  return (
    <ErrorPageShell
      code={500}
      tone="danger"
      icon={<ServerCrash size={30} />}
      title="یک خطای غیرمنتظره در سرور رخ داد"
      description="مشکل از سمت شما نیست — سرور موقتاً نتونست درخواست رو پردازش کنه. چند لحظه صبر کنید و دوباره امتحان کنید؛ اگه ادامه داشت، به پشتیبانی اطلاع بدید."
      primaryAction={{ label: 'تلاش دوباره', onClick: () => window.location.reload() }}
      secondaryAction={{ label: 'بازگشت به داشبورد', onClick: () => { window.location.href = '/' } }}
    />
  )
}
