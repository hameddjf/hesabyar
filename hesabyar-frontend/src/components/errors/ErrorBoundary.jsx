import { Component } from 'react'
import UnknownError from '@/pages/errors/UnknownError'

/**
 * Error Boundary سراسری — کرش‌های render-time هرجای زیرمجموعه‌ش رو می‌گیره
 * و به‌جای صفحه‌ی سفید (که تجربه‌ی قبلی پروژه بود)، یه صفحه‌ی خطای دوستانه
 * نشون می‌ده. توجه: ErrorBoundary فقط خطاهای حین render/lifecycle رو می‌گیره،
 * نه خطاهای داخل event handler یا async code (اون‌ها جدا با try/catch یا
 * apiClient مدیریت می‌شن).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // اینجا جای مناسبیه که در آینده گزارش خطا به یه سرویس مانیتورینگ (مثل Sentry) وصل بشه
    console.error('ErrorBoundary caught:', error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return <UnknownError message={this.state.error?.message} onRetry={this.handleRetry} />
    }
    return this.props.children
  }
}
