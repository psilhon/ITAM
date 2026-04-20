import React from 'react'

interface StatusBadgeProps {
  status: string
}

const statusConfig: Record<string, { label: string; className: string }> = {
  running: { label: '运行中', className: 'status-running' },
  offline: { label: '已下线', className: 'status-offline' },
  maintenance: { label: '维护中', className: 'status-maintenance' },
  stopped: { label: '已停止', className: 'status-offline' },
  error: { label: '异常', className: 'status-offline' },
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status] || { label: status, className: 'status-maintenance' }
  return <span className={`status-badge ${config.className}`}>{config.label}</span>
}

export default StatusBadge
