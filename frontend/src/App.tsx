import { Routes, Route } from 'react-router-dom'

function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-slate-900">TimeForge</h1>
        <p className="mt-2 text-slate-500">Foundation scaffold — Sprint 0</p>
      </div>
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  )
}

export default App
