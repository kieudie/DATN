import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import NotFound from './components/NotFound'
import Layout from './components/Layout'
import Candidates from './components/Candidates'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Protected Routes inside Layout */}
        <Route path="/home" element={<Layout><Dashboard /></Layout>} />
        <Route path="/recruitment/candidates" element={<Layout><Candidates /></Layout>} />
        
        <Route path="/dashboard" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
