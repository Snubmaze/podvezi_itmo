import { AppFlow } from '@/app/AppFlow'
import { AuthProvider } from '@/app/AuthProvider'

function App() {
  return (
    <AuthProvider>
      <AppFlow />
    </AuthProvider>
  )
}

export default App
