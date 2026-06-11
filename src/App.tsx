import { Button } from '@/components/ui/button'

function App() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-2xl font-semibold">Попутчик ИТМО</h1>
      <p className="text-muted-foreground">
        Каркас проекта инициализирован. Экраны появятся на следующих шагах.
      </p>
      <Button disabled>В разработке</Button>
    </div>
  )
}

export default App
