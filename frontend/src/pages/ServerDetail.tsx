import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getServer, Server, updateServer,
} from '../api'
import StatusBadge from '../components/StatusBadge'
import NetworkTab from '../components/NetworkTab'
import ApplicationTab from '../components/ApplicationTab'
import { inputStyle as themeInputStyle } from '../theme'

// 本地使用主题样式（保持代码兼容性）
const inputStyle = themeInputStyle

// ──────────── 行内编辑字段行 ────────────
interface FieldDef {
  key: keyof Server
  label: string
  type?: 'text' | 'date' | 'select' | 'textarea'
  options?: { value: string; label: string }[]
  required?: boolean
  fullWidth?: boolean
  validate?: (value: string, form: Partial<Server>) => string | null
}

// 字段定义（顺序即显示顺序）
const FIELD_DEFS: FieldDef[] = [
  { key: 'company', label: '公司名称', type: 'text' },
  { key: 'name', label: '主机名', type: 'text', required: true },
  { key: 'status', label: '状态', type: 'select', options: [
    { value: 'running', label: '运行中' },
    { value: 'offline', label: '已下线' },
    { value: 'maintenance', label: '维护中' },
  ]},
  { key: 'brand', label: '品牌', type: 'text' },
  { key: 'model', label: '型号', type: 'text' },
  { key: 'sn', label: '序列号', type: 'text' },
  { key: 'cpu', label: 'CPU', type: 'text' },
  { key: 'cpuCores', label: '物理核心数', type: 'text' },
  { key: 'logicalCores', label: '逻辑核心数', type: 'text' },
  { key: 'cpuArch', label: 'CPU架构', type: 'text' },
  { key: 'memory', label: '内存', type: 'text' },
  { key: 'memoryModules', label: '内存模块', type: 'text' },
  { key: 'disk', label: '磁盘容量', type: 'text' },
  { key: 'diskType', label: '磁盘类型', type: 'text' },
  { key: 'os', label: '操作系统', type: 'text' },
  { key: 'osKernel', label: '内核版本', type: 'text' },
  { key: 'osManagement', label: '操作系统管理', type: 'textarea', fullWidth: true },
  { key: 'oobManagement', label: '带外管理', type: 'textarea', fullWidth: true },
  { key: 'owner', label: '资产归属', type: 'text' },
  { key: 'datacenter', label: '机房', type: 'text' },
  { key: 'cabinet', label: '机柜', type: 'text' },
  { key: 'rackUnit', label: '机位', type: 'text' },
  { key: 'onlineDate', label: '上线日期', type: 'date', validate: (val, form) => {
    if (!val || !form.offlineDate) return null
    if (val > form.offlineDate) return '上线日期不能晚于下线日期'
    return null
  }},
  { key: 'offlineDate', label: '下线日期', type: 'date', validate: (val, form) => {
    if (!val || !form.onlineDate) return null
    if (val < form.onlineDate) return '下线日期不能早于上线日期'
    return null
  }},
  { key: 'remark', label: '备注', type: 'textarea', fullWidth: true },
]

// ──────────── 基础信息 Tab ────────────
const BasicInfoTab: React.FC<{ server: Server; onRefresh: () => void }> = ({ server, onRefresh }) => {
  const [editingField, setEditingField] = useState<keyof Server | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // 获取当前编辑字段的定义
  const getEditingDef = () => FIELD_DEFS.find(d => d.key === editingField)

  // 编辑操作栏：当有字段处于编辑状态时显示在顶部
  const renderEditBar = () => {
    if (!editingField) return null
    const def = getEditingDef()

    return (
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#fff',
        border: '1px solid #0052d9',
        borderRadius: 8,
        padding: '10px 16px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 2px 12px rgba(0, 82, 217, 0.15)',
      }}>
        {/* 编辑中图标 */}
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: '#e8f3ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0,
        }}>
          ✎
        </div>

        {/* 当前编辑信息 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: '#9da5b4', marginBottom: 2 }}>
            正在编辑：{def?.label}
          </div>
          <div style={{ fontSize: 13, color: '#1a2438', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {editValue || '(空)'}
          </div>
        </div>

        {/* 快捷键提示 */}
        <div style={{ fontSize: 11, color: '#9da5b4', flexShrink: 0 }}>
          <span style={{ marginRight: 8 }}>Enter 保存</span>
          <span>Esc 取消</span>
        </div>

        {/* 保存按钮 */}
        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: '6px 16px', fontSize: 13, cursor: 'pointer',
            border: 'none', borderRadius: 6, background: saving ? '#d9d9d9' : '#52c41a',
            color: '#fff', flexShrink: 0,
          }}
          title="保存 (Enter)"
        >
          {saving ? '保存中...' : '✓ 保存'}
        </button>

        {/* 取消按钮 */}
        <button
          onClick={cancelEdit}
          style={{
            padding: '6px 12px', fontSize: 13, cursor: 'pointer',
            border: '1px solid #dde3ee', borderRadius: 6, background: '#fff',
            color: '#6b7a99', flexShrink: 0,
          }}
          title="取消 (Esc)"
        >
          ✕ 取消
        </button>
      </div>
    )
  }

  // 当前编辑值（用于校验）
  const getForm = (): Partial<Server> => {
    const form: Partial<Server> = {}
    FIELD_DEFS.forEach(def => {
      if (def.key === 'status') {
        ;(form as any)[def.key] = server[def.key as keyof Server]
      } else {
        ;(form as any)[def.key] = server[def.key as keyof Server]
      }
    })
    if (editingField) {
      ;(form as any)[editingField] = editValue
    }
    return form
  }

  const startEdit = (field: keyof Server, value: string | undefined | null) => {
    setEditingField(field)
    setEditValue(value || '')
    setFieldError(null)
    // textarea 组件需要 focus
    setTimeout(() => {
      const el = document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[data-edit-field="${field}"]`)
      el?.focus()
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.select()
      }
    }, 30)
  }

  const cancelEdit = () => {
    setEditingField(null)
    setEditValue('')
    setFieldError(null)
  }

  const save = async () => {
    if (!editingField) return

    // 校验
    const def = FIELD_DEFS.find(d => d.key === editingField)
    if (def?.validate) {
      const form = getForm()
      const error = def.validate(editValue, form)
      if (error) {
        setFieldError(error)
        return
      }
    }

    setSaving(true)
    try {
      const payload: any = { [editingField]: editValue }
      await updateServer(server.id, payload)
      onRefresh()
      cancelEdit()
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, field: keyof Server) => {
    if (e.key === 'Enter' && e.key !== 'Enter') return // 忽略带有修饰键的 Enter
    if (e.key === 'Escape') {
      cancelEdit()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // textarea 允许换行，只在非 textarea 时直接保存
      const def = FIELD_DEFS.find(d => d.key === field)
      if (def?.type !== 'textarea') {
        e.preventDefault()
        save()
      }
    }
  }

  const renderDisplay = (def: FieldDef, value: string | undefined | null) => {
    return (
      <div style={{ display: 'flex', alignItems: 'center', minHeight: 28 }}>
        <span style={{ fontSize: 13, color: '#1a2438', wordBreak: 'break-all', flex: 1 }}>
          {value || '-'}
        </span>
        <button
          onClick={() => startEdit(def.key, value)}
          style={{
            marginLeft: 8, padding: '2px 8px', fontSize: 12, cursor: 'pointer',
            border: '1px solid #dde3ee', borderRadius: 4, background: '#fff',
            color: '#6b7a99', flexShrink: 0,
          }}
          title={`编辑${def.label}`}
        >
          ✎
        </button>
      </div>
    )
  }

  const renderEdit = (def: FieldDef) => {
    const field = def.key
    const commonStyle = {
      ...inputStyle,
      borderColor: fieldError ? '#f53f3f' : '#0052d9',
      height: 32,
      fontSize: 13,
    }

    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
        <div style={{ flex: 1 }}>
          {def.type === 'select' ? (
            <select
              data-edit-field={field}
              style={commonStyle}
              value={editValue}
              onChange={e => {
                setEditValue(e.target.value)
                setFieldError(null)
              }}
              onKeyDown={e => handleKeyDown(e, field)}
              onBlur={() => save()}
            >
              {def.options?.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : def.type === 'textarea' ? (
            <textarea
              data-edit-field={field}
              style={{ ...commonStyle, height: 64, resize: 'vertical' }}
              value={editValue}
              onChange={e => {
                setEditValue(e.target.value)
                setFieldError(null)
              }}
              onKeyDown={e => handleKeyDown(e, field)}
              onBlur={() => save()}
            />
          ) : (
            <input
              data-edit-field={field}
              style={commonStyle}
              type={def.type || 'text'}
              value={editValue}
              onChange={e => {
                setEditValue(e.target.value)
                setFieldError(null)
              }}
              onKeyDown={e => handleKeyDown(e, field)}
              onBlur={() => save()}
            />
          )}
          {fieldError && (
            <div style={{ fontSize: 11, color: '#f53f3f', marginTop: 3 }}>{fieldError}</div>
          )}
        </div>
        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: '4px 8px', fontSize: 12, cursor: 'pointer',
            border: '1px solid #52c41a', borderRadius: 4, background: '#52c41a',
            color: '#fff', flexShrink: 0, height: 32,
          }}
          title="保存"
        >
          {saving ? '...' : '✓'}
        </button>
        <button
          onClick={cancelEdit}
          style={{
            padding: '4px 8px', fontSize: 12, cursor: 'pointer',
            border: '1px solid #dde3ee', borderRadius: 4, background: '#fff',
            color: '#6b7a99', flexShrink: 0, height: 32,
          }}
          title="取消"
        >
          ✕
        </button>
      </div>
    )
  }

  // 分两列显示字段
  const leftFields = FIELD_DEFS.filter(d => !d.fullWidth).slice(0, Math.ceil(FIELD_DEFS.filter(d => !d.fullWidth).length / 2))
  const rightFields = FIELD_DEFS.filter(d => !d.fullWidth).slice(Math.ceil(FIELD_DEFS.filter(d => !d.fullWidth).length / 2))
  const fullWidthFields = FIELD_DEFS.filter(d => d.fullWidth)

  const renderFieldRow = (def: FieldDef) => {
    const value = server[def.key as keyof Server] as string | undefined | null
    const isEditing = editingField === def.key

    return (
      <div key={def.key} style={{ padding: '10px 0', borderBottom: '1px solid #f2f3f5' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ width: 130, flexShrink: 0 }}>
            <span style={{ color: '#9da5b4', fontSize: 13 }}>
              {def.label}
              {def.required && <span style={{ color: '#f53f3f', marginLeft: 2 }}>*</span>}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            {isEditing ? renderEdit(def) : renderDisplay(def, value)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* 编辑操作栏（编辑状态下固定在顶部） */}
      {renderEditBar()}

      {/* 提示文字 */}
      <div style={{ fontSize: 12, color: '#9da5b4', marginBottom: 12 }}>
        点击每行右侧「✎」图标进入编辑，修改后按 Enter 或点击上方「保存」按钮
      </div>

      {/* 双列布局 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
        {/* 左列 */}
        <div>
          {leftFields.map(renderFieldRow)}
        </div>
        {/* 右列 */}
        <div>
          {rightFields.map(renderFieldRow)}
        </div>
      </div>

      {/* 全宽字段（textarea 等） */}
      {fullWidthFields.map(renderFieldRow)}
    </div>
  )
}

// ──────────── 主页面 ────────────
type TabKey = 'basic' | 'network' | 'app'

const ServerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [server, setServer] = useState<Server | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('basic')

  const load = () => {
    setLoading(true)
    getServer(parseInt(id!))
      .then(r => setServer(r.data))
      .catch(() => navigate('/servers'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, color: '#9da5b4' }}>
      加载中...
    </div>
  )
  if (!server) return null

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'basic', label: '基础信息' },
    { key: 'network', label: '网络信息' },
    { key: 'app', label: '应用信息' },
  ]

  return (
    <div>
      {/* 头部面包屑 & 摘要 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#9da5b4', marginBottom: 8 }}>
          <span onClick={() => navigate('/servers')} style={{ cursor: 'pointer', color: '#0052d9' }}>主机设备</span>
          <span style={{ margin: '0 6px' }}>/</span>
          <span>{server.name}</span>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e5e8f0', borderRadius: 8, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 48, height: 48, background: '#e8f3ff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🖥️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{server.name}</div>
            <div style={{ fontSize: 13, color: '#6b7a99' }}>
              {server.model}
              {server.sn && <span style={{ marginLeft: 12 }}>SN: {server.sn}</span>}
              {server.datacenter && <span style={{ marginLeft: 12 }}>📍 {server.datacenter}</span>}
            </div>
          </div>
          <StatusBadge status={server.status} />
          <div style={{ textAlign: 'right', fontSize: 13, color: '#9da5b4' }}>
            <div>资产归属：{server.owner || '-'}</div>
            <div>上线日期：{server.onlineDate || '-'}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: '#fff', border: '1px solid #e5e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e8f0' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 24px', border: 'none', background: 'transparent',
                cursor: 'pointer', fontSize: 14, fontWeight: activeTab === tab.key ? 600 : 400,
                color: activeTab === tab.key ? '#0052d9' : '#6b7a99',
                borderBottom: activeTab === tab.key ? '2px solid #0052d9' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ padding: 24 }}>
          {activeTab === 'basic' && <BasicInfoTab server={server} onRefresh={load} />}
          {activeTab === 'network' && <NetworkTab serverId={server.id} />}
          {activeTab === 'app' && <ApplicationTab serverId={server.id} />}
        </div>
      </div>
    </div>
  )
}

export default ServerDetailPage
