import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { ThemeProvider }   from './theme/ThemeContext'
import { OfflineProvider } from './features/offline/useOffline'
import { ErrorToastProvider } from './features/errors/ErrorToastProvider'
import './i18n'

export default function App() {
  return (
    <ThemeProvider>
      <OfflineProvider>
        <ErrorToastProvider>
          <RouterProvider router={router} />
        </ErrorToastProvider>
      </OfflineProvider>
    </ThemeProvider>
  )
}
