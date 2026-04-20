import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { ToastProvider, ToastContainer } from './components/Toast'
import DashboardPage from './pages/Dashboard'
import ServerListPage from './pages/ServerList'
import ServerDetailPage from './pages/ServerDetail'
import NetworkDeviceListPage from './pages/NetworkDeviceList'

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
)

const App: React.FC = () => {
  const location = useLocation()

  return (
    <ToastProvider>
      <Layout>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<PageWrapper><DashboardPage /></PageWrapper>} />
          <Route path="/servers" element={<PageWrapper><ServerListPage /></PageWrapper>} />
          <Route path="/servers/:id" element={<PageWrapper><ServerDetailPage /></PageWrapper>} />
          <Route path="/network-devices" element={<PageWrapper><NetworkDeviceListPage /></PageWrapper>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
      <ToastContainer />
    </ToastProvider>
  )
}

export default App
