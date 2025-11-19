import React, { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function StatusPill({ status }) {
  const lower = (status || '').toLowerCase()
  const className = useMemo(() => {
    if (lower === 'printing') return 'badge status-printing'
    if (lower === 'offline') return 'badge status-offline'
    if (lower === 'complete' || lower === 'completed') return 'badge status-complete'
    if (lower === 'canceled' || lower === 'cancelled') return 'badge status-canceled'
    return 'badge status-standby'
  }, [lower])

  return <span className={className}>{status || 'standby'}</span>
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@local')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const form = new URLSearchParams()
    form.append('username', email)
    form.append('password', password)
    try {
      const res = await axios.post(`${API_URL}/auth/login`, form)
      onLogin(res.data.access_token)
    } catch (err) {
      setError(err.response?.data?.detail || 'Falha no login')
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-slate-100">
      <div className="card w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4">Login da empresa</h1>
        <form className="space-y-3" onSubmit={submit}>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input className="w-full border rounded p-2" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium">Senha</label>
            <input type="password" className="w-full border rounded p-2" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-rose-600 text-sm">{error}</p>}
          <button className="bg-blue-600 text-white rounded px-4 py-2 w-full" type="submit">Entrar</button>
        </form>
      </div>
    </div>
  )
}

function PrinterTable({ printers }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Impressoras</h2>
        <span className="text-sm text-slate-500">Todas aparecem mesmo offline</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-600">
              <th className="py-2">Nome</th>
              <th>Status</th>
              <th>Moonraker</th>
              <th>Jobs</th>
            </tr>
          </thead>
          <tbody>
            {printers.map((printer) => (
              <tr key={printer.id} className="border-t">
                <td className="py-2 font-medium">{printer.name}</td>
                <td><StatusPill status={printer.status} /></td>
                <td className="text-slate-500">{printer.moonraker_url || '—'}</td>
                <td className="text-slate-500">{printer.jobs?.length || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FilamentTable({ filaments }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Filamentos</h2>
        <span className="text-sm text-slate-500">Estoque em gramas</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-slate-600">
              <th className="py-2">Nome</th>
              <th>Material</th>
              <th>Cor</th>
              <th>Marca</th>
              <th>Estoque (g)</th>
            </tr>
          </thead>
          <tbody>
            {filaments.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="py-2 font-medium">{f.name}</td>
                <td>{f.material}</td>
                <td>{f.color}</td>
                <td>{f.brand}</td>
                <td>{f.stock_grams}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Timeline({ items }) {
  return (
    <div className="card">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">Timeline (UTC-3 São Paulo)</h2>
        <span className="text-sm text-slate-500">Atualiza via WebSocket</span>
      </div>
      <div className="space-y-3">
        {items.map((printer) => (
          <div key={printer.id} className="border rounded-lg p-3 bg-slate-50">
            <div className="flex items-center gap-3">
              <span className="font-semibold">{printer.name}</span>
              <StatusPill status={printer.status} />
            </div>
            {printer.jobs?.length ? (
              <ul className="mt-2 text-sm text-slate-700 list-disc list-inside">
                {printer.jobs.map((job) => (
                  <li key={job.id}>{job.filename} — {job.status}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 mt-2">Sem histórico.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('pm_token'))
  const [printers, setPrinters] = useState([])
  const [filaments, setFilaments] = useState([])
  const [timeline, setTimeline] = useState([])

  useEffect(() => {
    if (!token) return
    localStorage.setItem('pm_token', token)
    const client = axios.create({
      baseURL: API_URL,
      headers: { Authorization: `Bearer ${token}` },
    })

    const loadData = async () => {
      const [p, f, t] = await Promise.all([
        client.get('/printers/'),
        client.get('/filaments/'),
        client.get('/timeline'),
      ])
      setPrinters(p.data)
      setFilaments(f.data)
      setTimeline(t.data.items)
    }
    loadData().catch(console.error)

    let socket
    try {
      socket = new WebSocket(API_URL.replace('http', 'ws') + '/ws/timeline')
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.items) setTimeline(data.items)
      }
    } catch (err) {
      console.error('Falha ao abrir websocket', err)
    }

    return () => {
      if (socket) socket.close()
    }
  }, [token])

  if (!token) return <Login onLogin={setToken} />

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">3D Management</h1>
          <button className="text-sm text-rose-600" onClick={() => { setToken(null); localStorage.removeItem('pm_token') }}>Sair</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <PrinterTable printers={printers} />
        <FilamentTable filaments={filaments} />
        <Timeline items={timeline} />
      </main>
    </div>
  )
}

export default App
