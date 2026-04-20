import React, { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { getVersion } from '../api'

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
  onClick?: () => void
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, onClick }) => (
  <NavLink
    to={to}
    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
    onClick={onClick}
  >
    <span className="nav-item-icon">{icon}</span>
    {label}
  </NavLink>
)

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>
)

const ServerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="2" y="3" width="20" height="6" rx="1.5"/>
    <rect x="2" y="12" width="20" height="6" rx="1.5"/>
    <line x1="6" y1="6" x2="6.01" y2="6" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="6" y1="15" x2="6.01" y2="15" strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
)

const NetworkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="2" y="8" width="20" height="12" rx="2"/>
    <path d="M6 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/>
    <line x1="12" y1="12" x2="12" y2="16"/>
    <line x1="10" y1="14" x2="14" y2="14"/>
    <line x1="8" y1="14" x2="8" y2="16"/>
    <line x1="16" y1="14" x2="16" y2="16"/>
  </svg>
)

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const Sidebar: React.FC<SidebarProps> = ({ open = true, onClose }) => {
  const [version, setVersion] = useState<string>('...')

  useEffect(() => {
    getVersion()
      .then(r => setVersion(r.data))
      .catch(() => setVersion('v4.1.0'))
  }, [])

  return (
    <aside className={`sidebar ${open ? 'sidebar-open' : 'sidebar-closed'}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <rect x="2" y="3" width="20" height="6" rx="1.5"/>
            <rect x="2" y="12" width="20" height="6" rx="1.5"/>
          </svg>
        </div>
        <span className="sidebar-logo-text">IT资产管理系统</span>
        <button className="sidebar-close-btn" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">概览</div>
        <NavItem to="/dashboard" icon={<DashboardIcon />} label="仪表盘" onClick={onClose} />

        <div className="nav-section-title">资产管理</div>
        <NavItem to="/servers" icon={<ServerIcon />} label="主机设备" onClick={onClose} />
        <NavItem to="/network-devices" icon={<NetworkIcon />} label="网络设备" onClick={onClose} />
      </nav>

      <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 500 }}>{version}</div>
      </div>
    </aside>
  )
}

export default Sidebar
