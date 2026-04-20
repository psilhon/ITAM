import React, { useEffect, useState } from 'react'
import {
  Application,
  getApplications, createApplication, updateApplication, deleteApplication,
} from '../api'
import { FormField, FormInput, FormSelect } from './FormField'
import { inputStyle } from '../theme'

const appTypeMap: Record<string, string> = {
  web: 'Web应用', database: '数据库', middleware: '中间件',
  cache: '缓存',
  futures_trading: '期货交易', stock_trading: '股票交易', data_related: '数据相关',
  other: '其他',
}
const appStatusColors: Record<string, string> = {
  running: '#00b42a', stopped: '#f53f3f', error: '#ff7d00',
}

// 默认账号绑定 JSON 模板
const DEFAULT_ACCOUNT_BINDING = JSON.stringify([
  { account: '', broker: '', server: '', remark: '' }
], null, 2)

const emptyApp = (): Partial<Application> => ({
  appName: '', appType: '', status: 'running', deployPath: '', remark: '', accountBinding: '',
})

interface Props { serverId: number }

// JSON 编辑器组件
const JsonEditor: React.FC<{
  value: string
  onChange: (val: string) => void
  label?: string
}> = ({ value, onChange, label }) => {
  const [raw, setRaw] = useState(value || DEFAULT_ACCOUNT_BINDING)
  const [error, setError] = useState<string | null>(null)
  const [formatted, setFormatted] = useState(false)

  // 同步外部 value 变化
  useEffect(() => {
    setRaw(value && value.trim() ? value : DEFAULT_ACCOUNT_BINDING)
    setError(null)
  }, [value])

  const handleChange = (text: string) => {
    setRaw(text)
    setFormatted(false)
    try {
      JSON.parse(text)
      setError(null)
      onChange(text)
    } catch (e: any) {
      setError('JSON 格式错误：' + e.message)
    }
  }

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(raw)
      const pretty = JSON.stringify(parsed, null, 2)
      setRaw(pretty)
      setFormatted(true)
      setError(null)
      onChange(pretty)
      setTimeout(() => setFormatted(false), 1500)
    } catch (e: any) {
      setError('格式化失败：' + e.message)
    }
  }

  const handleReset = () => {
    setRaw(DEFAULT_ACCOUNT_BINDING)
    setError(null)
    onChange(DEFAULT_ACCOUNT_BINDING)
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 12, color: '#6b7a99' }}>
          {label || '账号绑定'}
          <span style={{ marginLeft: 6, fontSize: 11, color: '#9da5b4' }}>（JSON 格式）</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={handleFormat}
            style={{
              fontSize: 11, padding: '2px 10px', borderRadius: 4, cursor: 'pointer',
              border: '1px solid #0052d9', color: formatted ? '#00b42a' : '#0052d9',
              background: 'transparent', transition: 'color 0.2s',
            }}
          >
            {formatted ? '✓ 已格式化' : '格式化'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            style={{
              fontSize: 11, padding: '2px 10px', borderRadius: 4, cursor: 'pointer',
              border: '1px solid #c9cdd4', color: '#86909c', background: 'transparent',
            }}
          >
            重置模板
          </button>
        </div>
      </div>
      <textarea
        value={raw}
        onChange={e => handleChange(e.target.value)}
        spellCheck={false}
        style={{
          ...inputStyle,
          fontFamily: '"JetBrains Mono", "Fira Code", "Courier New", monospace',
          fontSize: 12,
          lineHeight: 1.6,
          resize: 'vertical',
          minHeight: 160,
          background: error ? '#fff8f8' : '#1e1e2e',
          color: error ? '#1a2438' : '#cdd6f4',
          border: `1px solid ${error ? '#f53f3f' : '#3c3f58'}`,
          borderRadius: 6,
          padding: '10px 12px',
          whiteSpace: 'pre',
          overflowX: 'auto',
        }}
      />
      {error && (
        <div style={{ fontSize: 11, color: '#f53f3f', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>⚠</span> {error}
        </div>
      )}
      <div style={{ fontSize: 11, color: '#9da5b4', marginTop: 4 }}>
        建议字段：account（账号）、broker（期货公司）、server（交易服务器）、remark（备注）
      </div>
    </div>
  )
}

const ApplicationTab: React.FC<Props> = ({ serverId }) => {
  const [list, setList] = useState<Application[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Partial<Application>>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<Partial<Application>>(emptyApp())
  const [addSaving, setAddSaving] = useState(false)

  const loadApps = () => getApplications(serverId).then(r => setList(r.data))

  useEffect(() => { loadApps() }, [serverId])

  // 内联编辑
  const startEdit = (app: Application) => {
    setEditingId(app.id)
    setEditForm({ ...app })
    setFormError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
    setFormError('')
  }

  const saveEdit = async () => {
    if (!editForm.appName?.trim()) {
      setFormError('应用名称不能为空')
      return
    }
    if (editForm.appType === 'futures_trading' && editForm.accountBinding) {
      try { JSON.parse(editForm.accountBinding) } catch {
        setFormError('账号绑定 JSON 格式有误')
        return
      }
    }
    setSaving(true)
    try {
      // 过滤掉 null/undefined/空字符串值
      const payload: Partial<Application> = {}
      for (const [k, v] of Object.entries(editForm)) {
        if (v !== null && v !== undefined && v !== '') {
          (payload as any)[k] = v
        }
      }
      await updateApplication(editingId!, payload)
      await loadApps()
      cancelEdit()
    } catch (err: any) {
      setFormError(err.message || '保存失败')
    } finally { setSaving(false) }
  }

  const remove = async (id: number) => {
    if (!window.confirm('确定删除该应用？')) return
    await deleteApplication(id); loadApps()
  }

  // 添加应用
  const startAdd = () => { setShowAddForm(true); setAddForm(emptyApp()); setFormError('') }
  const cancelAdd = () => { setShowAddForm(false); setAddForm(emptyApp()); setFormError('') }

  const saveAdd = async () => {
    if (!addForm.appName?.trim()) {
      setFormError('应用名称不能为空')
      return
    }
    if (addForm.appType === 'futures_trading' && addForm.accountBinding) {
      try { JSON.parse(addForm.accountBinding) } catch {
        setFormError('账号绑定 JSON 格式有误')
        return
      }
    }
    setAddSaving(true)
    try {
      // 过滤掉 null/undefined/空字符串值
      const payload: Partial<Application> = { serverId }
      for (const [k, v] of Object.entries(addForm)) {
        if (v !== null && v !== undefined && v !== '') {
          (payload as any)[k] = v
        }
      }
      await createApplication(payload)
      await loadApps()
      cancelAdd()
    } catch (err: any) {
      setFormError(err.message || '保存失败')
    } finally { setAddSaving(false) }
  }

  const appTypeOptions = [
    { value: 'web', label: 'Web应用' },
    { value: 'database', label: '数据库' },
    { value: 'middleware', label: '中间件' },
    { value: 'cache', label: '缓存' },
    { value: 'futures_trading', label: '期货交易' },
    { value: 'stock_trading', label: '股票交易' },
    { value: 'data_related', label: '数据相关' },
    { value: 'other', label: '其他' },
  ]

  const statusOptions = [
    { value: 'running', label: '运行中' },
    { value: 'stopped', label: '已停止' },
    { value: 'error', label: '异常' },
  ]

  // 渲染单个应用卡片
  const renderAppCard = (app: Application) => {
    const isEditing = editingId === app.id
    const isFutures = editForm.appType === 'futures_trading' || (isEditing && editForm.appType === 'futures_trading')

    if (isEditing) {
      return (
        <div key={app.id} style={{
          background: '#f8f9fc',
          border: '1px solid #0052d9',
          borderRadius: 8,
          padding: '14px 16px',
        }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: '#0052d9' }}>✎ 编辑应用</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 14px' }}>
            <div>
              <div style={{ fontSize: 11, color: '#6b7a99', marginBottom: 4 }}>应用名称 *</div>
              <input
                style={{ ...inputStyle, height: 32, fontSize: 13 }}
                value={editForm.appName || ''}
                onChange={e => { setEditForm(p => ({ ...p, appName: e.target.value })); setFormError('') }}
                placeholder="如 CTP 交易终端"
                onKeyDown={e => { if (e.key === 'Escape') cancelEdit() }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6b7a99', marginBottom: 4 }}>应用类型</div>
              <select
                style={{ ...inputStyle, height: 32, fontSize: 13 }}
                value={editForm.appType || ''}
                onChange={e => setEditForm(p => ({ ...p, appType: e.target.value }))}
              >
                <option value="">请选择</option>
                {appTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6b7a99', marginBottom: 4 }}>运行状态</div>
              <select
                style={{ ...inputStyle, height: 32, fontSize: 13 }}
                value={editForm.status || 'running'}
                onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
              >
                {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 11, color: '#6b7a99', marginBottom: 4 }}>部署路径</div>
              <input
                style={{ ...inputStyle, height: 32, fontSize: 13 }}
                value={editForm.deployPath || ''}
                onChange={e => setEditForm(p => ({ ...p, deployPath: e.target.value }))}
                placeholder="/opt/app"
                onKeyDown={e => { if (e.key === 'Escape') cancelEdit() }}
              />
            </div>
            {/* 期货交易账号绑定 */}
            {isFutures && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #fff7e6 0%, #fff3dc 100%)',
                  border: '1px solid #ffd591',
                  borderRadius: 7,
                  padding: '10px 12px',
                  marginTop: 4,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 12 }}>🔑</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#d4690a' }}>期货交易 · 账号绑定</span>
                  </div>
                  <JsonEditor
                    value={editForm.accountBinding || ''}
                    onChange={val => setEditForm(p => ({ ...p, accountBinding: val }))}
                  />
                </div>
              </div>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 11, color: '#6b7a99', marginBottom: 4 }}>备注</div>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: 48 }}
                value={editForm.remark || ''}
                onChange={e => setEditForm(p => ({ ...p, remark: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Escape') cancelEdit() }}
              />
            </div>
          </div>
          {formError && <div style={{ color: '#f53f3f', fontSize: 12, marginTop: 8 }}>{formError}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button onClick={cancelEdit} style={{ padding: '4px 12px', fontSize: 12, border: '1px solid #dde3ee', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>取消</button>
            <button onClick={saveEdit} disabled={saving} style={{ padding: '4px 12px', fontSize: 12, border: 'none', borderRadius: 4, background: '#0052d9', color: '#fff', cursor: 'pointer' }}>
              {saving ? '保存中...' : '✓ 保存'}
            </button>
          </div>
        </div>
      )
    }

    return (
      <div key={app.id} style={{
        background: '#f8f9fc',
        border: app.appType === 'futures_trading' ? '1px solid #ffd591' : '1px solid #e5e8f0',
        borderRadius: 8,
        padding: '14px 16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{app.appName}</div>
            {app.appType && (
              <span style={{
                fontSize: 11,
                color: app.appType === 'futures_trading' ? '#d4690a' : '#6b7a99',
                background: app.appType === 'futures_trading' ? '#fff7e6' : 'transparent',
                padding: app.appType === 'futures_trading' ? '1px 6px' : '0',
                borderRadius: app.appType === 'futures_trading' ? 8 : 0,
              }}>
                {app.appType === 'futures_trading' ? '🔑 ' : ''}{appTypeMap[app.appType] || app.appType}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: appStatusColors[app.status] || '#c2c7d0', display: 'inline-block',
            }} />
            <span style={{ fontSize: 12, color: appStatusColors[app.status] || '#9da5b4' }}>
              {{ running: '运行中', stopped: '已停止', error: '异常' }[app.status] || app.status}
            </span>
          </div>
        </div>
        {app.deployPath && (
          <div style={{ fontSize: 12, color: '#6b7a99', marginBottom: 6 }}>
            <span>路径：</span>
            <span style={{ fontFamily: 'monospace', color: '#1a2438' }}>{app.deployPath}</span>
          </div>
        )}
        {app.remark && <div style={{ fontSize: 12, color: '#9da5b4', marginTop: 6 }}>{app.remark}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={() => startEdit(app)} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 4, cursor: 'pointer', border: '1px solid #0052d9', color: '#0052d9', background: 'transparent' }}>✎ 编辑</button>
          <button onClick={() => remove(app.id)} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 4, cursor: 'pointer', border: '1px solid #f53f3f', color: '#f53f3f', background: 'transparent' }}>删除</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* 提示文字 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: '#9da5b4' }}>
          点击「✎ 编辑」进入行内编辑，Esc 取消
        </div>
        <button onClick={startAdd} style={{ padding: '6px 16px', background: '#0052d9', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 13 }}>
          + 添加应用
        </button>
      </div>

      {/* 添加应用内联表单 */}
      {showAddForm && (
        <div style={{
          background: '#f8f9fc',
          border: '1px solid #52c41a',
          borderRadius: 8,
          padding: '14px 16px',
          marginBottom: 14,
        }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: '#52c41a' }}>+ 添加应用</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 14px' }}>
            <div>
              <div style={{ fontSize: 11, color: '#6b7a99', marginBottom: 4 }}>应用名称 *</div>
              <input
                style={{ ...inputStyle, height: 32, fontSize: 13 }}
                value={addForm.appName || ''}
                onChange={e => { setAddForm(p => ({ ...p, appName: e.target.value })); setFormError('') }}
                placeholder="如 CTP 交易终端"
                onKeyDown={e => { if (e.key === 'Escape') cancelAdd() }}
                autoFocus
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6b7a99', marginBottom: 4 }}>应用类型</div>
              <select
                style={{ ...inputStyle, height: 32, fontSize: 13 }}
                value={addForm.appType || ''}
                onChange={e => setAddForm(p => ({ ...p, appType: e.target.value }))}
              >
                <option value="">请选择</option>
                {appTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6b7a99', marginBottom: 4 }}>运行状态</div>
              <select
                style={{ ...inputStyle, height: 32, fontSize: 13 }}
                value={addForm.status || 'running'}
                onChange={e => setAddForm(p => ({ ...p, status: e.target.value }))}
              >
                {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 11, color: '#6b7a99', marginBottom: 4 }}>部署路径</div>
              <input
                style={{ ...inputStyle, height: 32, fontSize: 13 }}
                value={addForm.deployPath || ''}
                onChange={e => setAddForm(p => ({ ...p, deployPath: e.target.value }))}
                placeholder="/opt/app"
                onKeyDown={e => { if (e.key === 'Escape') cancelAdd() }}
              />
            </div>
            {addForm.appType === 'futures_trading' && (
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #fff7e6 0%, #fff3dc 100%)',
                  border: '1px solid #ffd591',
                  borderRadius: 7,
                  padding: '10px 12px',
                  marginTop: 4,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 12 }}>🔑</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#d4690a' }}>期货交易 · 账号绑定</span>
                  </div>
                  <JsonEditor
                    value={addForm.accountBinding || ''}
                    onChange={val => setAddForm(p => ({ ...p, accountBinding: val }))}
                  />
                </div>
              </div>
            )}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 11, color: '#6b7a99', marginBottom: 4 }}>备注</div>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: 48 }}
                value={addForm.remark || ''}
                onChange={e => setAddForm(p => ({ ...p, remark: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Escape') cancelAdd() }}
              />
            </div>
          </div>
          {formError && <div style={{ color: '#f53f3f', fontSize: 12, marginTop: 8 }}>{formError}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button onClick={cancelAdd} style={{ padding: '4px 12px', fontSize: 12, border: '1px solid #dde3ee', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>取消</button>
            <button onClick={saveAdd} disabled={addSaving} style={{ padding: '4px 12px', fontSize: 12, border: 'none', borderRadius: 4, background: '#52c41a', color: '#fff', cursor: 'pointer' }}>
              {addSaving ? '保存中...' : '✓ 保存'}
            </button>
          </div>
        </div>
      )}

      {/* 应用列表 */}
      {list.length === 0 && !showAddForm ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9da5b4' }}>暂无应用信息，点击「添加应用」</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {list.map(renderAppCard)}
        </div>
      )}
    </div>
  )
}

export default ApplicationTab
