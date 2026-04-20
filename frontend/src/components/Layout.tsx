import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

const routeTitleMap: Record<string, string> = {
  '/dashboard': '仪表盘',
  '/servers': '主机设备',
  '/network-devices': '网络设备',
}

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const title = (() => {
    if (location.pathname.startsWith('/servers/')) return '主机详情'
    return routeTitleMap[location.pathname] || 'IT资产管理系统'
  })()

  return (
    <div className="layout-wrapper">
      {/* 移动端遮罩层 */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`main-content ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <header className="topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="topbar-title">{title}</span>
        </header>
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
