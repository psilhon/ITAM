import React, { useState, useEffect, useRef } from 'react'
import { createNetworkDevice, updateNetworkDevice, NetworkDevice } from '../api/networkDeviceApi'
import { inputStyle } from '../theme'
import { FormField } from './FormField'
import { toastService } from './Toast'

interface Props {
  visible: boolean
  editData?: NetworkDevice | null
  onClose: () => void
  onSuccess: () => void
}

type FormState = Pick<NetworkDevice,
  'name' | 'deviceType' | 'brand' | 'model' | 'sn' | 'managementIp'
  | 'ports' | 'firmware' | 'datacenter' | 'cabinet' | 'rackUnit'
  | 'status' | 'onlineDate' | 'offlineDate' | 'owner' | 'remark'
>

const initForm = (): FormState => ({
  name: '', deviceType: 'switch', brand: '', model: '', sn: '',
  managementIp: '', ports: '', firmware: '',
  datacenter: '', cabinet: '', rackUnit: '',
  status: 'running', onlineDate: '', offlineDate: '', owner: '', remark: '',
})

const NetworkDeviceFormDrawer: React.FC<Props> = ({ visible, editData, onClose, onSuccess }) => {
  const isEdit = !!editData
  const [form, setForm] = useState<FormState>(initForm)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const draftKey = 'networkDeviceFormDraft'
  const lastSavedRef = useRef<string>('')

  // 加载草稿
  useEffect(() => {
    if (visible && !editData) {
      const draft = localStorage.getItem(draftKey)
      if (draft) {
        try {
          const parsed = JSON.parse(draft)
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

  // 自动保存草稿
  useEffect(() => {
    if (!visible || isEdit) return
    const formJson = JSON.stringify(form)
    if (formJson !== lastSavedRef.current) {
      lastSavedRef.current = formJson
      localStorage.setItem(draftKey, JSON.stringify({ form, timestamp: Date.now() }))
    }
  }, [form, visible, isEdit])

  const clearDraft = () => {
    localStorage.removeItem(draftKey)
    lastSavedRef.current = ''
  }

  useEffect(() => {
    if (visible && editData) {
      setForm({
        name: editData.name,
        deviceType: editData.deviceType,
        brand: editData.brand || '',
        model: editData.model || '',
        sn: editData.sn || '',
        managementIp: editData.managementIp || '',
        ports: editData.ports || '',
        firmware: editData.firmware || '',
        datacenter: editData.datacenter || '',
        cabinet: editData.cabinet || '',
        rackUnit: editData.rackUnit || '',
        status: editData.status,
        onlineDate: editData.onlineDate || '',
        offlineDate: editData.offlineDate || '',
        owner: editData.owner || '',
        remark: editData.remark || '',
      })
    } else if (visible) {
      setForm(initForm())
    }
    setSubmitError('')
  }, [visible, editData])

  const handleChange = (key: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { setSubmitError('设备名称不能为空'); return }
    setLoading(true)
    setSubmitError('')
    try {
      // 过滤掉 null/undefined/空字符串值，避免覆盖数据库已有值
      const payload: FormState = {} as FormState
      for (const [k, v] of Object.entries(form)) {
        if (v !== null && v !== undefined && v !== '') {
          (payload as any)[k] = v
        }
      }
      if (isEdit && editData) {
        await updateNetworkDevice(editData.id, payload)
        toastService.success('保存成功')
        onSuccess()
        onClose()
      } else {
        await createNetworkDevice(payload)
        clearDraft()
        toastService.success('添加成功')
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || err.message || '保存失败')
    } finally {
      setLoading(false)
    }
  }

  if (!visible) return null

  return (
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
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(660px, 100vw)',
        background: '#fff', zIndex: 1000, boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* 头部 */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #e5e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>
            {isEdit ? `编辑网络设备：${editData?.name}` : '新增网络设备'}
          </span>
          <button onClick={onClose} style={{
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 20, color: '#9da5b4', lineHeight: 1,
          }}>×</button>
        </div>

        {/* 内容区 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {submitError && (
            <div style={{
              marginBottom: 16, padding: '10px 14px',
              background: '#fff1f0', border: '1px solid #ffccc7',
              borderRadius: 5, color: '#f53f3f', fontSize: 13,
            }}>
              {submitError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
            {/* 身份信息 */}
            <FormField label="设备名称" required error={!form.name.trim() && submitError ? '设备名称不能为空' : undefined}>
              <input style={inputStyle} value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="如：core-sw-01" />
            </FormField>
            <FormField label="设备类型">
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.deviceType}
                onChange={e => handleChange('deviceType', e.target.value)}>
                <option value="switch">交换机</option>
                <option value="router">路由器</option>
                <option value="firewall">防火墙</option>
                <option value="lb">负载均衡</option>
                <option value="other">其他</option>
              </select>
            </FormField>

            {/* 硬件信息 */}
            <FormField label="品牌">
              <input style={inputStyle} value={form.brand}
                onChange={e => handleChange('brand', e.target.value)}
                placeholder="如：华为、华三、Juniper" />
            </FormField>
            <FormField label="型号">
              <input style={inputStyle} value={form.model}
                onChange={e => handleChange('model', e.target.value)}
                placeholder="如：S5720-28P" />
            </FormField>
            <FormField label="序列号">
              <input style={inputStyle} value={form.sn}
                onChange={e => handleChange('sn', e.target.value)}
                placeholder="设备序列号" />
            </FormField>
            <FormField label="管理IP">
              <input style={inputStyle} value={form.managementIp}
                onChange={e => handleChange('managementIp', e.target.value)}
                placeholder="如：10.0.1.1" />
            </FormField>
            <FormField label="端口数">
              <input style={inputStyle} value={form.ports}
                onChange={e => handleChange('ports', e.target.value)}
                placeholder="如：48×10G + 6×100G" />
            </FormField>
            <FormField label="固件版本">
              <input style={inputStyle} value={form.firmware}
                onChange={e => handleChange('firmware', e.target.value)}
                placeholder="如：V5.20" />
            </FormField>

            {/* 运营信息 */}
            <FormField label="机房">
              <input style={inputStyle} value={form.datacenter}
                onChange={e => handleChange('datacenter', e.target.value)}
                placeholder="如：BJ-AZ-01" />
            </FormField>
            <FormField label="机柜">
              <input style={inputStyle} value={form.cabinet}
                onChange={e => handleChange('cabinet', e.target.value)}
                placeholder="如：A-18" />
            </FormField>
            <FormField label="状态">
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.status}
                onChange={e => handleChange('status', e.target.value)}>
                <option value="running">运行中</option>
                <option value="maintenance">维护中</option>
                <option value="offline">已下线</option>
              </select>
            </FormField>
            <FormField label="资产归属">
              <input style={inputStyle} value={form.owner}
                onChange={e => handleChange('owner', e.target.value)}
                placeholder="资产归属人/部门" />
            </FormField>

            {/* 日期 */}
            <FormField label="上线日期">
              <input type="date" style={inputStyle} value={form.onlineDate}
                onChange={e => handleChange('onlineDate', e.target.value)} />
            </FormField>
            <FormField label="下线日期">
              <input type="date" style={inputStyle} value={form.offlineDate}
                onChange={e => handleChange('offlineDate', e.target.value)} />
            </FormField>

            {/* 备注 */}
            <div style={{ gridColumn: '1 / -1' }}>
              <FormField label="备注">
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
                  value={form.remark}
                  onChange={e => handleChange('remark', e.target.value)}
                  placeholder="其他备注信息..." />
              </FormField>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #e5e8f0',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button onClick={onClose} style={{
            padding: '8px 18px', border: '1px solid #dde3ee', borderRadius: 5,
            background: '#fff', cursor: 'pointer', fontSize: 13, color: '#6b7a99',
          }}>
            取消
          </button>
          <button onClick={handleSubmit} disabled={loading} style={{
            padding: '8px 18px', border: 'none', borderRadius: 5,
            background: loading ? '#9da5b4' : '#10B981',
            color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13,
          }}>
            {loading ? '保存中...' : (isEdit ? '保存修改' : '确认添加')}
          </button>
        </div>
      </div>
    </>
  )
}

export default NetworkDeviceFormDrawer
