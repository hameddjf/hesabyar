import { useRouteError, isRouteErrorResponse } from 'react-router-dom'
import UnknownError from '@/pages/errors/UnknownError'
import NotFound from '@/pages/errors/NotFound'

/**
 * errorElement مخصوص react-router — این با ErrorBoundary معمولی فرق داره:
 * react-router خطاهای loader/action و خطاهای render داخل همون route رو
 * می‌گیره و به‌جای componentDidCatch، از طریق useRouteError در دسترس
 * می‌ذاره. برای همین نمی‌شه از همون کلاس ErrorBoundary استفاده کرد.
 */
export default function RouteErrorElement() {
  const error = useRouteError()

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFound />
  }

  return <UnknownError message={error?.message || error?.statusText} />
}
