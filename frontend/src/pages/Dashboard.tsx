import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getDashboardStats } from '../api'

const STATUS_COLORS = {
  running: '#10B981',
  offline: '#EF4444',
  maintenance: '#F59E0B',
}

const CHART_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EF4444', '#14B8A6', '#EC4899', '#06B6D4']

// 数字滚动动画组件
const AnimatedNumber: React.FC<{ value: number; color?: string }> = ({ value, color = '#3B82F6' }) => {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    const duration = 1000
    const steps = 30
    const stepValue = value / steps
    let current = 0
    let step = 0

    const timer = setInterval(() => {
      step++
      current = Math.min(Math.round(stepValue * step), value)
      setDisplayValue(current)

      if (step >= steps) {
        clearInterval(timer)
        setDisplayValue(value)
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [value])

  return (
    <span style={{
      fontSize: 32,
      fontWeight: 700,
      lineHeight: 1.2,
      color: color,
      fontVariantNumeric: 'tabular-nums',
      display: 'inline-block',
    }}>
      {displayValue}
    </span>
  )
}

const StatCard: React.FC<{
  label: string
  value: number | string
  color?: string
  icon: React.ReactNode
  sub?: string
  delay?: number
}> = ({ label, value, color = '#3B82F6', icon, sub, delay = 0 }) => (
  <div
    className="stat-card"
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 16,
      opacity: 0,
      animation: `fadeInUp 0.5s ease forwards`,
      animationDelay: `${delay}ms`,
    }}
  >
    <div style={{
      width: 48, height: 48, borderRadius: 12,
      background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      border: `1px solid ${color}30`,
      transition: 'transform 0.2s ease',
    }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
    </div>
    <div>
      {typeof value === 'number' ? (
        <AnimatedNumber value={value} color={color} />
      ) : (
        <div className="stat-card-value" style={{ color }}>{value}</div>
      )}
      <div className="stat-card-label">{label}</div>
      {sub && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>{sub}</div>}
    </div>
  </div>
)

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [animated, setAnimated] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    setAnimated(true)
  }, [])

  useEffect(() => {
    getDashboardStats()
      .then((res) => setStats(res.data))
      .catch(() => { /* silent fail, loading state handles UI */ })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* 骨架屏 - 概览卡片 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="stat-card" style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: '60%', height: 32, borderRadius: 6, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: '80%', height: 16, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
        {/* 骨架屏 - 应用统计 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {[1, 2].map(i => (
            <div key={i} className="stat-card" style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: '50%', height: 32, borderRadius: 6, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: '70%', height: 16, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
        {/* 骨架屏 - 网络设备统计 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="stat-card" style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: '55%', height: 32, borderRadius: 6, marginBottom: 8 }} />
                <div className="skeleton" style={{ width: '75%', height: 16, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
        {/* 骨架屏 - 图表 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="stat-card">
              <div className="skeleton" style={{ width: '50%', height: 20, borderRadius: 4, marginBottom: 16 }} />
              <div className="skeleton" style={{ width: '100%', height: 200, borderRadius: 8 }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!stats) return null

  const { overview, datacenterStats, osStats, ownerStats, recentServers } = stats

  const statusPieData = [
    { name: '运行中', value: overview.running, color: '#10B981' },
    { name: '已下线', value: overview.offline, color: '#EF4444' },
    { name: '维护中', value: overview.maintenance, color: '#F59E0B' },
  ].filter(d => d.value > 0)



  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 概览卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard
          label="服务器总数"
          value={overview.total}
          color="#3B82F6"
          icon="🖥️"
        />
        <StatCard
          label="运行中"
          value={overview.running}
          color="#10B981"
          icon="✅"
          sub={`占比 ${overview.total ? Math.round(overview.running / overview.total * 100) : 0}%`}
        />
        <StatCard
          label="已下线"
          value={overview.offline}
          color="#EF4444"
          icon="🔴"
        />
        <StatCard
          label="维护中"
          value={overview.maintenance}
          color="#F59E0B"
          icon="🔧"
        />
      </div>

      {/* 应用统计 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        <StatCard
          label="部署应用总数"
          value={overview.totalApps}
          color="#8B5CF6"
          icon="📦"
        />
        <StatCard
          label="应用运行中"
          value={overview.runningApps}
          color="#14B8A6"
          icon="▶️"
          sub={`占比 ${overview.totalApps ? Math.round(overview.runningApps / overview.totalApps * 100) : 0}%`}
        />
      </div>

      {/* 网络设备统计 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <StatCard
          label="网络设备总数"
          value={overview.totalNetworkDevices ?? 0}
          color="#8B5CF6"
          icon="🔌"
        />
        <StatCard
          label="设备运行中"
          value={overview.runningNetworkDevices ?? 0}
          color="#10B981"
          icon="✅"
          sub={`占比 ${overview.totalNetworkDevices ? Math.round((overview.runningNetworkDevices ?? 0) / overview.totalNetworkDevices * 100) : 0}%`}
        />
        <StatCard
          label="设备已下线"
          value={overview.offlineNetworkDevices ?? 0}
          color="#EF4444"
          icon="🔴"
        />
      </div>

      {/* 图表区 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* 状态分布 */}
        <div className="stat-card">
          <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 4, height: 16, background: 'linear-gradient(180deg, #3B82F6, #60A5FA)', borderRadius: 2 }}></span>
            状态分布
          </div>
          {statusPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value, name) => [value, name]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9da5b4' }}>暂无数据</div>
          )}
        </div>

        {/* 机房分布 */}
        <div className="stat-card">
          <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 4, height: 16, background: 'linear-gradient(180deg, #10B981, #34D399)', borderRadius: 2 }}></span>
            机房分布
          </div>
          {datacenterStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={datacenterStats} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} width={90} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar dataKey="value" name="数量" radius={[0, 4, 4, 0]} animationBegin={0} animationDuration={800} animationEasing="ease-out">
                  {datacenterStats.map((_: any, index: number) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="none" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9da5b4' }}>暂无数据</div>
          )}
        </div>

        {/* 操作系统分布 */}
        <div className="stat-card">
          <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 4, height: 16, background: 'linear-gradient(180deg, #8B5CF6, #A78BFA)', borderRadius: 2 }}></span>
            操作系统分布
          </div>
          {osStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={osStats}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={0}
                  paddingAngle={2}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-out"
                  label={({ name, value, percent }) => `${name.split(' ')[0]} ${value}`}
                  labelLine={{ stroke: '#CBD5E1', strokeWidth: 1 }}
                >
                  {osStats.map((_: any, index: number) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9da5b4' }}>暂无数据</div>
          )}
        </div>
      </div>

      {/* 最近添加的服务器 */}
      <div className="stat-card">
        <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          最近添加的服务器
          <span
            onClick={() => navigate('/servers')}
            style={{ fontSize: 13, color: '#0052d9', cursor: 'pointer', fontWeight: 400 }}
          >
            查看全部 →
          </span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e8f0' }}>
              {['主机名', '机房', '资产归属', '状态', '添加时间'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#6b7a99', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentServers.map((s: any) => (
              <tr
                key={s.id}
                className={s.status}
                onClick={() => navigate(`/servers/${s.id}`)}
              >
                <td style={{ padding: '10px 12px', fontWeight: 500, color: '#3B82F6' }}>{s.name}</td>
                <td style={{ padding: '10px 12px', color: '#64748B' }}>{s.datacenter || '-'}</td>
                <td style={{ padding: '10px 12px', color: '#64748B' }}>{s.owner || '-'}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span className={`status-badge status-${s.status}`}>
                    {{ running: '运行中', offline: '已下线', maintenance: '维护中' }[s.status as string] || s.status}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', color: '#94A3B8' }}>
                  {new Date(s.createdAt).toLocaleDateString('zh-CN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DashboardPage
