import { AppFlow } from '@/app/AppFlow'
import { AuthProvider } from '@/app/AuthProvider'
import { ThemeProvider } from '@/app/ThemeProvider'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppFlow />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
