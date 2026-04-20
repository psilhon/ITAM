import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Server, createServer, updateServer } from '../api'
import NetworkTab from './NetworkTab'
import ApplicationTab from './ApplicationTab'
import { toastService } from './Toast'
import { inputStyle } from '../theme'
import { FormField } from './FormField'

interface ServerFormDrawerProps {
  visible: boolean
  editData?: Server | null
  onClose: () => void
  onSuccess: () => void
}

type DrawerTab = 'basic' | 'network' | 'app'

type FormState = {
  company: string; name: string; status: 'running' | 'offline' | 'maintenance'
  brand: string; model: string; sn: string
  cpu: string; cpuCores: string; logicalCores: string; cpuArch: string
  memory: string; memoryModules: string
  disk: string; diskType: string
  os: string; osKernel: string; osManagement: string; oobManagement: string
  owner: string; datacenter: string; cabinet: string; rackUnit: string
  onlineDate: string; offlineDate: string; remark: string
}

type FormErrors = Partial<Record<keyof FormState, string>>

// 实时校验函数
const validateField = (key: keyof FormState, value: string, form: FormState): string | null => {
  switch (key) {
    case 'name':
      if (!value.trim()) return '主机名不能为空'
      return null
    case 'onlineDate':
      if (value && form.offlineDate && value > form.offlineDate) {
        return '上线日期不能晚于下线日期'
      }
      return null
    case 'offlineDate':
      if (value && form.onlineDate && value < form.onlineDate) {
        return '下线日期不能早于上线日期'
      }
      return null
    default:
      return null
  }
}

const ServerFormDrawer: React.FC<ServerFormDrawerProps> = ({ visible, editData, onClose, onSuccess }) => {
  const isEdit = !!editData

  const initForm = (): FormState => ({
    company: '', name: '', status: 'running',
    brand: '', model: '', sn: '',
    cpu: '', cpuCores: '', logicalCores: '', cpuArch: '',
    memory: '', memoryModules: '',
    disk: '', diskType: '',
    os: '', osKernel: '', osManagement: '', oobManagement: '',
    owner: '', datacenter: '', cabinet: '', rackUnit: '',
    onlineDate: '', offlineDate: '', remark: '',
  })

  const [activeTab, setActiveTab] = useState<DrawerTab>('basic')
  const [form, setForm] = useState<FormState>(initForm())
  // 编辑模式：记录打开时的初始值，用于提交时 diff（只发送变更字段）
  const [originalForm, setOriginalForm] = useState<FormState | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  // 新建模式：基础信息保存后拿到的 serverId
  const [newServerId, setNewServerId] = useState<number | null>(null)
  // 草稿相关
  const draftKey = 'serverFormDraft'
  const lastSavedRef = useRef<string>('')

  // 加载草稿
  useEffect(() => {
    if (visible && !editData) {
      const draft = localStorage.getItem(draftKey)
      if (draft) {
        try {
          const parsed = JSON.parse(draft)
          // 检查草稿是否过期（24小时）
          if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
            const shouldRestore = window.confirm('检测到未保存的草稿，是否恢复？')
            if (shouldRestore) {
              setForm(parsed.form)
              toastService.info('已恢复草稿')
            } else {
              localStorage.removeItem(draftKey)
            }
          } else {
            localStorage.removeItem(draftKey)
          }
        } catch {
          localStorage.removeItem(draftKey)
        }
      }
    }
  }, [visible, editData])

  // 自动保存草稿（每30秒或字段失焦时）
  useEffect(() => {
    if (!visible || isEdit) return

    const formJson = JSON.stringify(form)
    if (formJson !== lastSavedRef.current) {
      lastSavedRef.current = formJson
      localStorage.setItem(draftKey, JSON.stringify({
        form,
        timestamp: Date.now(),
      }))
    }
  }, [form, visible, isEdit])

  // 清除草稿
  const clearDraft = () => {
    localStorage.removeItem(draftKey)
    lastSavedRef.current = ''
  }

  useEffect(() => {
    if (visible && editData) {
      const { networkInfos, applications, createdAt, updatedAt, id, ...rest } = editData
      const filled: FormState = { ...initForm(), ...rest }
      setForm(filled)
      // 记住原始值，提交时用于 diff
      setOriginalForm(filled)
    } else if (visible && !editData) {
      setForm(initForm())
      setOriginalForm(null)
      setNewServerId(null)
    }
    setActiveTab('basic')
    setErrors({})
    setSubmitError('')
  }, [visible, editData])

  const handleChange = (key: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
    // 实时校验
    const error = validateField(key, value, { ...form, [key]: value })
    setErrors(prev => ({ ...prev, [key]: error || undefined }))
  }

  const handleSubmit = async () => {
    // 提交前校验所有字段
    const newErrors: FormErrors = {}
    let hasError = false
    for (const key of Object.keys(form) as (keyof FormState)[]) {
      const error = validateField(key, form[key], form)
      if (error) {
        newErrors[key] = error
        hasError = true
      }
    }
    setErrors(newErrors)
    if (hasError) {
      setSubmitError('请修正表单中的错误后重试')
      return
    }
    if (!form.name.trim()) {
      setErrors({ name: '主机名不能为空' })
      setSubmitError('主机名不能为空')
      return
    }
    setLoading(true)
    setSubmitError('')
    try {
      if (isEdit && editData) {
        // 编辑模式：只提交变更过的字段（diff），避免空字符串覆盖数据库已有值
        const changes: Record<string, string> = {}
        if (originalForm) {
          for (const key of Object.keys(form) as (keyof FormState)[]) {
            if (form[key] !== originalForm[key]) {
              changes[key] = form[key]
            }
          }
        }
        // name 是必填字段，始终发送；status 同理
        if (!('name' in changes)) changes.name = form.name
        if (!('status' in changes)) changes.status = form.status
        await updateServer(editData.id, changes)
        clearDraft()
        onSuccess()
        onClose()
      } else {
        // 新建模式：提交全部字段
        const { company, name, status, brand, model, sn, cpu, cpuCores, logicalCores, cpuArch, memory, memoryModules, disk, diskType, os, osKernel, osManagement, oobManagement, owner, datacenter, cabinet, rackUnit, onlineDate, offlineDate, remark } = form
        const res = await createServer({ company, name, status, brand, model, sn, cpu, cpuCores, logicalCores, cpuArch, memory, memoryModules, disk, diskType, os, osKernel, osManagement, oobManagement, owner, datacenter, cabinet, rackUnit, onlineDate, offlineDate, remark })
        const created = res.data
        setNewServerId(created.id)
        clearDraft()
        onSuccess() // 刷新列表
        setActiveTab('network')
      }
    } catch (err: any) {
      setSubmitError(err.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  // 使用 Portal 将 Drawer 挂载到 body 上，避免受父容器 flex 布局影响
  // 同时锁定背景滚动
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [visible])

  if (!visible) return null

  // 所有模式都显示三个 Tab；新建时 network/app Tab 在服务器创建前不可点
  const tabs: { key: DrawerTab; label: string }[] = [
    { key: 'basic', label: '基础信息' },
    { key: 'network', label: '网络信息' },
    { key: 'app', label: '应用信息' },
  ]
  // 当前可用的 serverId（编辑用 editData.id，新建用 newServerId）
  const activeServerId = isEdit ? editData?.id : newServerId
  // 网络/应用 Tab 是否可点
  const canSwitchSubTab = !!activeServerId

  const drawerContent = (
    <>
      {/* 遮罩 */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 999,
        }}
      />
      {/* 抽屉 */}
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 660,
        background: '#fff', zIndex: 1000, boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', // 抽屉本身不滚动，内容区内部滚动
      }}>
        {/* 头部 */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #e5e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{isEdit ? `编辑服务器：${editData?.name}` : '新增服务器'}</span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, color: '#9da5b4', lineHeight: 1 }}>×</button>
        </div>

        {/* Tab 导航 */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e8f0', padding: '0 24px' }}>
          {tabs.map(tab => {
            const disabled = tab.key !== 'basic' && !canSwitchSubTab
            return (
              <button
                key={tab.key}
                onClick={() => !disabled && setActiveTab(tab.key)}
                title={disabled ? '请先保存基础信息' : undefined}
                style={{
                  padding: '10px 20px', border: 'none', background: 'transparent',
                  cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13,
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  color: disabled ? '#c0c7d6' : activeTab === tab.key ? '#0052d9' : '#6b7a99',
                  borderBottom: activeTab === tab.key ? '2px solid #0052d9' : '2px solid transparent',
                  transition: 'all 0.15s', marginBottom: -1,
                }}
              >
                {tab.label}
                {disabled && <span style={{ fontSize: 10, marginLeft: 4, color: '#c0c7d6' }}>🔒</span>}
              </button>
            )
          })}
        </div>

        {/* 内容区 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* ── 基础信息 Tab ── */}
          {activeTab === 'basic' && (
            <div style={{ marginBottom: 20 }}>
              {!isEdit && (
                <div style={{ fontWeight: 600, fontSize: 13, color: '#0052d9', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>▎</span> 基础信息
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
                {/* ── 第1组：身份标识 ── */}
                <FormField label="公司名称">
                  <input key="company" style={inputStyle} value={form.company} onChange={e => handleChange('company', e.target.value)} placeholder="" />
                </FormField>
                <FormField label="主机名" required error={errors.name}>
                  <input key="name" style={{ ...inputStyle, borderColor: errors.name ? '#f53f3f' : undefined }} value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="" />
                </FormField>
                <FormField label="资产状态">
                  <select key="status" style={inputStyle} value={form.status} onChange={e => handleChange('status', e.target.value as any)}>
                    <option value="running">运行中</option>
                    <option value="offline">已下线</option>
                    <option value="maintenance">维护中</option>
                  </select>
                </FormField>

                {/* ── 第2组：硬件规格 ── */}
                <FormField label="品牌">
                  <input key="brand" style={inputStyle} value={form.brand} onChange={e => handleChange('brand', e.target.value)} placeholder="" />
                </FormField>
                <FormField label="型号">
                  <input key="model" style={inputStyle} value={form.model} onChange={e => handleChange('model', e.target.value)} placeholder="" />
                </FormField>
                <FormField label="序列号">
                  <input key="sn" style={inputStyle} value={form.sn} onChange={e => handleChange('sn', e.target.value)} placeholder="" />
                </FormField>
                <FormField label="CPU">
                  <input key="cpu" style={inputStyle} value={form.cpu} onChange={e => handleChange('cpu', e.target.value)} placeholder="" />
                </FormField>
                <FormField label="物理核心数">
                  <input key="cpuCores" style={inputStyle} value={form.cpuCores} onChange={e => handleChange('cpuCores', e.target.value)} placeholder="" />
                </FormField>
                <FormField label="逻辑核心数">
                  <input key="logicalCores" style={inputStyle} value={form.logicalCores} onChange={e => handleChange('logicalCores', e.target.value)} placeholder="" />
                </FormField>
                <FormField label="CPU架构">
                  <input key="cpuArch" style={inputStyle} value={form.cpuArch} onChange={e => handleChange('cpuArch', e.target.value)} placeholder="" />
                </FormField>
                <FormField label="内存">
                  <input key="memory" style={inputStyle} value={form.memory} onChange={e => handleChange('memory', e.target.value)} placeholder="" />
                </FormField>
                <FormField label="内存模块">
                  <input key="memoryModules" style={inputStyle} value={form.memoryModules} onChange={e => handleChange('memoryModules', e.target.value)} placeholder="" />
                </FormField>
                <FormField label="磁盘容量">
                  <input key="disk" style={inputStyle} value={form.disk} onChange={e => handleChange('disk', e.target.value)} placeholder="" />
                </FormField>
                <FormField label="磁盘类型">
                  <input key="diskType" style={inputStyle} value={form.diskType} onChange={e => handleChange('diskType', e.target.value)} placeholder="" />
                </FormField>

                {/* ── 第3组：系统与网络 ── */}
                <FormField label="操作系统">
                  <input key="os" style={inputStyle} value={form.os} onChange={e => handleChange('os', e.target.value)} placeholder="" />
                </FormField>
                <FormField label="内核版本">
                  <input key="osKernel" style={inputStyle} value={form.osKernel} onChange={e => handleChange('osKernel', e.target.value)} placeholder="" />
                </FormField>
                <div style={{ gridColumn: '1 / -1' }}>
                  <FormField label="操作系统管理">
                    <textarea key="osManagement" style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} value={form.osManagement} onChange={e => handleChange('osManagement', e.target.value)} placeholder="" />
                  </FormField>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <FormField label="带外管理">
                    <textarea key="oobManagement" style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} value={form.oobManagement} onChange={e => handleChange('oobManagement', e.target.value)} placeholder="" />
                  </FormField>
                </div>
                {/* ── 第4组：运营信息 ── */}
                <FormField label="资产归属">
                  <input key="owner" style={inputStyle} value={form.owner} onChange={e => handleChange('owner', e.target.value)} placeholder="" />
                </FormField>
                <FormField label="机房">
                  <input key="datacenter" style={inputStyle} value={form.datacenter} onChange={e => handleChange('datacenter', e.target.value)} placeholder="" />
                </FormField>
                <FormField label="机柜">
                  <input key="cabinet" style={inputStyle} value={form.cabinet} onChange={e => handleChange('cabinet', e.target.value)} placeholder="" />
                </FormField>
                <FormField label="机位">
                  <input key="rackUnit" style={inputStyle} value={form.rackUnit || ''} onChange={e => handleChange('rackUnit', e.target.value)} placeholder="" />
                </FormField>
                <FormField label="上线日期" error={errors.onlineDate}>
                  <input key="onlineDate" style={{ ...inputStyle, borderColor: errors.onlineDate ? '#f53f3f' : undefined }} type="date" value={form.onlineDate} onChange={e => handleChange('onlineDate', e.target.value)} />
                </FormField>
                <FormField label="下线日期" error={errors.offlineDate}>
                  <input key="offlineDate" style={{ ...inputStyle, borderColor: errors.offlineDate ? '#f53f3f' : undefined }} type="date" value={form.offlineDate} onChange={e => handleChange('offlineDate', e.target.value)} />
                </FormField>
                <div style={{ gridColumn: '1 / -1' }}>
                  <FormField label="备注">
                    <textarea key="remark" style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} value={form.remark} onChange={e => handleChange('remark', e.target.value)} placeholder="" />
                  </FormField>
                </div>
              </div>
            </div>
          )}

          {/* ── 网络信息 Tab ── */}
          {activeTab === 'network' && activeServerId && (
            <NetworkTab serverId={activeServerId} />
          )}

          {/* ── 应用信息 Tab ── */}
          {activeTab === 'app' && activeServerId && (
            <ApplicationTab serverId={activeServerId} />
          )}
        </div>

        {/* 底部操作栏（固定在 Drawer 底部，内容滚动时保持可见） */}
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '14px 24px',
          borderTop: '1px solid #e5e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          background: '#fff',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
          zIndex: 10,
        }}>
          {submitError && <span style={{ color: '#f53f3f', fontSize: 13, flex: 1, alignSelf: 'center' }}>{submitError}</span>}

          {isEdit ? (
            <>
              {/* 编辑模式：始终显示保存按钮 */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  padding: '7px 20px', border: 'none', borderRadius: 5,
                  background: loading ? '#9da5b4' : '#52c41a', color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13,
                }}
              >
                {loading ? '保存中...' : '保存修改'}
              </button>
              <button
                onClick={onClose}
                style={{ padding: '7px 20px', border: '1px solid #dde3ee', borderRadius: 5, background: '#fff', cursor: 'pointer', fontSize: 13 }}
              >
                取消
              </button>
            </>
          ) : (
            <>
              {/* 新建模式：basic Tab 显示创建按钮，其他 Tab 显示完成 */}
              {activeTab === 'basic' ? (
                <>
                  <span style={{ fontSize: 12, color: '#9da5b4', alignSelf: 'center' }}>
                    {newServerId ? '服务器已创建，可继续添加网络/应用信息' : '创建后可继续完善网络和应用信息'}
                  </span>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                      padding: '7px 20px', border: 'none', borderRadius: 5,
                      background: loading ? '#9da5b4' : '#0052d9', color: '#fff',
                      cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13,
                    }}
                  >
                    {loading ? '保存中...' : (newServerId ? '已创建 ✓' : '创建并继续')}
                  </button>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 12, color: '#6b7a99', alignSelf: 'center' }}>
                    网络/应用信息可随时在详情页继续编辑
                  </span>
                  <button
                    onClick={onClose}
                    style={{ padding: '7px 20px', border: 'none', borderRadius: 5, background: '#0052d9', color: '#fff', cursor: 'pointer', fontSize: 13 }}
                  >
                    完成
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )

  return createPortal(drawerContent, document.body)
}

export default ServerFormDrawer
