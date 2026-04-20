import React, { useEffect, useState } from 'react'
import {
  NetworkInfo,
  getNetworkInfos, createNetworkInfo, updateNetworkInfo, deleteNetworkInfo,
  getServer, updateServer,
} from '../api'
import { FormField, FormInput, FormSelect } from './FormField'
import { inputStyle } from '../theme'

const nicPurposeMap: Record<string, string> = {
  management: '管理网', storage: '存储网', bmc: 'BMC',
  market: '行情网', trading: '交易网',
  // 保留 business 用于显示已有数据（不再可选择）
  business: '业务网(已停用)',
}

const emptyNic = (): Partial<NetworkInfo> => ({
  nicName: '', ipAddress: '', nicPurpose: '', remark: '',
})

interface Props { serverId: number }

const NetworkTab: React.FC<Props> = ({ serverId }) => {
  const [list, setList] = useState<NetworkInfo[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Partial<NetworkInfo>>({})
  const [saving, setSaving] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState<Partial<NetworkInfo>>(emptyNic())
  const [addError, setAddError] = useState('')
  const [addSaving, setAddSaving] = useState(false)

  // 网络信息备注（统一管理）
  const [networkRemark, setNetworkRemark] = useState('')
  const [networkRemarkSaved, setNetworkRemarkSaved] = useState(false)
  const [networkRemarkSaving, setNetworkRemarkSaving] = useState(false)

  // 网卡关联路由信息
  const [routeInfo, setRouteInfo] = useState('')
  const [routeInfoSaving, setRouteInfoSaving] = useState(false)
  const [routeInfoSaved, setRouteInfoSaved] = useState(false)

  // 网卡硬件型号
  const [nicModel, setNicModel] = useState('')
  const [nicModelSaving, setNicModelSaving] = useState(false)
  const [nicModelSaved, setNicModelSaved] = useState(false)

  // 服务器级远程接入信息
  const [remoteAccess, setRemoteAccess] = useState('')
  const [remoteAccessSaving, setRemoteAccessSaving] = useState(false)
  const [remoteAccessSaved, setRemoteAccessSaved] = useState(false)

  const loadNics = () => getNetworkInfos(serverId).then(r => setList(r.data))

  const loadRemoteAccess = () => getServer(serverId).then(r => {
    setRemoteAccess(r.data.remoteAccess || '')
    setNetworkRemark(r.data.remark || '')
    setRouteInfo(r.data.routeInfo || '')
    setNicModel(r.data.nicModel || '')
  })

  const saveNicModel = async () => {
    setNicModelSaving(true)
    try {
      await updateServer(serverId, { nicModel })
      await loadRemoteAccess()
      setNicModelSaved(true)
      setTimeout(() => setNicModelSaved(false), 2000)
    } finally { setNicModelSaving(false) }
  }

  const saveRouteInfo = async () => {
    setRouteInfoSaving(true)
    try {
      await updateServer(serverId, { routeInfo })
      await loadRemoteAccess()
      setRouteInfoSaved(true)
      setTimeout(() => setRouteInfoSaved(false), 2000)
    } finally { setRouteInfoSaving(false) }
  }

  const saveNetworkRemark = async () => {
    setNetworkRemarkSaving(true)
    try {
      await updateServer(serverId, { remark: networkRemark } as any)
      await loadRemoteAccess()
      setNetworkRemarkSaved(true)
      setTimeout(() => setNetworkRemarkSaved(false), 2000)
    } finally { setNetworkRemarkSaving(false) }
  }

  const saveRemoteAccess = async () => {
    setRemoteAccessSaving(true)
    try {
      await updateServer(serverId, { remoteAccess } as any)
      await loadRemoteAccess()
      setRemoteAccessSaved(true)
      setTimeout(() => setRemoteAccessSaved(false), 2000)
    } finally { setRemoteAccessSaving(false) }
  }

  useEffect(() => { loadNics(); loadRemoteAccess() }, [serverId])

  // 内联编辑
  const startEdit = (nic: NetworkInfo) => {
    setEditingId(nic.id)
    setEditForm({ ...nic })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({})
  }

  const saveEdit = async () => {
    if (!editForm.nicName?.trim()) return
    setSaving(true)
    try {
      // 过滤掉 null/undefined 值，只发送有意义的字段，避免覆盖数据库已有值
      const payload: Partial<NetworkInfo> = {}
      for (const [k, v] of Object.entries(editForm)) {
        if (v !== null && v !== undefined && v !== '') {
          (payload as any)[k] = v
        }
      }
      await updateNetworkInfo(editingId!, payload)
      await loadNics()
      cancelEdit()
    } finally { setSaving(false) }
  }

  const remove = async (id: number) => {
    if (!window.confirm('确定删除该网卡信息？')) return
    await deleteNetworkInfo(id); loadNics()
  }

  // 添加新网卡
  const startAdd = () => {
    // 第一个带 IP 地址的网卡默认管理网
    const defaultPurpose = list.length === 0 ? 'management' : ''
    setShowAddForm(true)
    setAddForm({ ...emptyNic(), nicPurpose: defaultPurpose })
    setAddError('')
  }
  const cancelAdd = () => { setShowAddForm(false); setAddForm(emptyNic()); setAddError('') }

  const saveAdd = async () => {
    if (!addForm.nicName?.trim()) {
      setAddError('网卡名称不能为空')
      return
    }
    setAddSaving(true)
    try {
      // 过滤掉 null/undefined/空字符串值
      const payload: Partial<NetworkInfo> = { serverId }
      for (const [k, v] of Object.entries(addForm)) {
        if (v !== null && v !== undefined && v !== '') {
          (payload as any)[k] = v
        }
      }
      await createNetworkInfo(payload)
      await loadNics()
      cancelAdd()
    } catch (err: any) {
      setAddError(err.message || '保存失败')
    } finally { setAddSaving(false) }
  }

  const nicPurposeOptions = [
    { value: 'management', label: '管理网' },
    { value: 'storage', label: '存储网' },
    { value: 'bmc', label: 'BMC' },
    { value: 'market', label: '行情网' },
    { value: 'trading', label: '交易网' },
  ]

  // 渲染单个网卡行
  const renderNicRow = (nic: NetworkInfo) => {
    const isEditing = editingId === nic.id

    if (isEditing) {
      return (
        <div key={nic.id} style={{ background: '#fff', border: '1px solid #0052d9', borderRadius: 8, padding: '14px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 14px' }}>
            <div>
              <div style={{ fontSize: 11, color: '#6b7a99', marginBottom: 4 }}>网卡名称 *</div>
              <input
                style={{ ...inputStyle, height: 32, fontSize: 13 }}
                value={editForm.nicName || ''}
                onChange={e => setEditForm(p => ({ ...p, nicName: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Escape') cancelEdit(); if (e.key === 'Enter') saveEdit() }}
                autoFocus
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6b7a99', marginBottom: 4 }}>IP (CIDR)</div>
              <input
                style={{ ...inputStyle, height: 32, fontSize: 13 }}
                value={editForm.ipAddress || ''}
                onChange={e => setEditForm(p => ({ ...p, ipAddress: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Escape') cancelEdit(); if (e.key === 'Enter') saveEdit() }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6b7a99', marginBottom: 4 }}>网卡用途</div>
              <select
                style={{ ...inputStyle, height: 32, fontSize: 13 }}
                value={editForm.nicPurpose || ''}
                onChange={e => setEditForm(p => ({ ...p, nicPurpose: e.target.value }))}
              >
                <option value="">请选择</option>
                {nicPurposeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                {/* 保留已有数据的 business 值（不可选，仅显示） */}
                {editForm.nicPurpose === 'business' && (
                  <option value="business">业务网(已停用)</option>
                )}
              </select>
            </div>
          </div>
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
      <div key={nic.id} style={{ background: '#f8f9fc', border: '1px solid #e5e8f0', borderRadius: 8, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{nic.nicName}</span>
            {nic.nicPurpose && (
              <span style={{ fontSize: 11, padding: '2px 8px', background: '#e8f3ff', color: '#0052d9', borderRadius: 10 }}>
                {nicPurposeMap[nic.nicPurpose] || nic.nicPurpose}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => startEdit(nic)} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 4, cursor: 'pointer', border: '1px solid #0052d9', color: '#0052d9', background: 'transparent' }}>✎ 编辑</button>
            <button onClick={() => remove(nic.id)} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 4, cursor: 'pointer', border: '1px solid #f53f3f', color: '#f53f3f', background: 'transparent' }}>删除</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px 12px', marginTop: 12 }}>
          {[
            ['IP (CIDR)', nic.ipAddress],
          ].map(([k, v]) => v ? (
            <div key={k as string} style={{ fontSize: 12 }}>
              <span style={{ color: '#9da5b4' }}>{k}：</span>
              <span style={{ color: '#1a2438' }}>{v as string}</span>
            </div>
          ) : null)}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* 提示文字 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: '#9da5b4' }}>
          点击「✎ 编辑」进入行内编辑，Enter 保存 / Esc 取消
        </div>
        <button
          onClick={startAdd}
          style={{ padding: '6px 16px', background: '#0052d9', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 13 }}
        >+ 添加网卡</button>
      </div>

      {/* 添加网卡内联表单 */}
      {showAddForm && (
        <div style={{ background: '#fff', border: '1px solid #52c41a', borderRadius: 8, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: '#52c41a' }}>+ 添加新网卡</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 14px' }}>
            <div>
              <div style={{ fontSize: 11, color: '#6b7a99', marginBottom: 4 }}>网卡名称 *</div>
              <input
                style={{ ...inputStyle, height: 32, fontSize: 13, borderColor: addError && !addForm.nicName?.trim() ? '#f53f3f' : undefined }}
                value={addForm.nicName || ''}
                onChange={e => { setAddForm(p => ({ ...p, nicName: e.target.value })); setAddError('') }}
                onKeyDown={e => { if (e.key === 'Escape') cancelAdd(); if (e.key === 'Enter') saveAdd() }}
                placeholder="如 eth0"
                autoFocus
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6b7a99', marginBottom: 4 }}>IP (CIDR)</div>
              <input
                style={{ ...inputStyle, height: 32, fontSize: 13 }}
                value={addForm.ipAddress || ''}
                onChange={e => setAddForm(p => ({ ...p, ipAddress: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Escape') cancelAdd(); if (e.key === 'Enter') saveAdd() }}
                placeholder="如 192.168.1.10/24"
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#6b7a99', marginBottom: 4 }}>网卡用途</div>
              <select
                style={{ ...inputStyle, height: 32, fontSize: 13 }}
                value={addForm.nicPurpose || ''}
                onChange={e => setAddForm(p => ({ ...p, nicPurpose: e.target.value }))}
              >
                <option value="">请选择</option>
                {nicPurposeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                {/* 保留已有数据的 business 值（不可选，仅用于显示） */}
                {addForm.nicPurpose === 'business' && (
                  <option value="business">业务网(已停用)</option>
                )}
              </select>
            </div>
          </div>
          {addError && <div style={{ color: '#f53f3f', fontSize: 12, marginTop: 8 }}>{addError}</div>}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button onClick={cancelAdd} style={{ padding: '4px 12px', fontSize: 12, border: '1px solid #dde3ee', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>取消</button>
            <button onClick={saveAdd} disabled={addSaving} style={{ padding: '4px 12px', fontSize: 12, border: 'none', borderRadius: 4, background: '#52c41a', color: '#fff', cursor: 'pointer' }}>
              {addSaving ? '保存中...' : '✓ 保存'}
            </button>
          </div>
        </div>
      )}

      {/* 网卡列表 */}
      {list.length === 0 && !showAddForm ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9da5b4' }}>暂无网络信息，点击「添加网卡」</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(renderNicRow)}
        </div>
      )}

      {/* 网卡关联路由信息 */}
      <div style={{ marginTop: 20, background: '#f8f9fc', border: '1px solid #e5e8f0', borderRadius: 8, padding: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: '#1a2438', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>▎</span> 网卡关联路由信息
        </div>
        <textarea
          style={{ ...inputStyle, resize: 'vertical', minHeight: 120, fontFamily: 'monospace', fontSize: 12 }}
          value={routeInfo}
          onChange={e => setRouteInfo(e.target.value)}
          placeholder=""
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 10 }}>
          {routeInfoSaved && <span style={{ fontSize: 12, color: '#00b42a' }}>✓ 已保存</span>}
          <button
            onClick={saveRouteInfo}
            disabled={routeInfoSaving}
            style={{ padding: '6px 16px', background: routeInfoSaving ? '#9da5b4' : '#0052d9', color: '#fff', border: 'none', borderRadius: 5, cursor: routeInfoSaving ? 'not-allowed' : 'pointer', fontSize: 13 }}
          >
            {routeInfoSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* 网卡硬件型号 */}
      <div style={{ marginTop: 20, background: '#f8f9fc', border: '1px solid #e5e8f0', borderRadius: 8, padding: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: '#1a2438', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>▎</span> 网卡硬件型号
        </div>
        <textarea
          style={{ ...inputStyle, resize: 'vertical', minHeight: 80, fontFamily: 'monospace', fontSize: 12 }}
          value={nicModel}
          onChange={e => setNicModel(e.target.value)}
          placeholder=""
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 10 }}>
          {nicModelSaved && <span style={{ fontSize: 12, color: '#00b42a' }}>✓ 已保存</span>}
          <button
            onClick={saveNicModel}
            disabled={nicModelSaving}
            style={{ padding: '6px 16px', background: nicModelSaving ? '#9da5b4' : '#0052d9', color: '#fff', border: 'none', borderRadius: 5, cursor: nicModelSaving ? 'not-allowed' : 'pointer', fontSize: 13 }}
          >
            {nicModelSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* 远程接入信息（服务器级别） */}
      <div style={{ marginTop: 20, background: '#f8f9fc', border: '1px solid #e5e8f0', borderRadius: 8, padding: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: '#1a2438', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>▎</span> 远程接入信息
        </div>
        <textarea
          style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
          value={remoteAccess}
          onChange={e => setRemoteAccess(e.target.value)}
          placeholder=""
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 10 }}>
          {remoteAccessSaved && <span style={{ fontSize: 12, color: '#00b42a' }}>✓ 已保存</span>}
          <button
            onClick={saveRemoteAccess}
            disabled={remoteAccessSaving}
            style={{ padding: '6px 16px', background: remoteAccessSaving ? '#9da5b4' : '#0052d9', color: '#fff', border: 'none', borderRadius: 5, cursor: remoteAccessSaving ? 'not-allowed' : 'pointer', fontSize: 13 }}
          >
            {remoteAccessSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      {/* 备注（网络信息末尾） */}
      <div style={{ marginTop: 20, background: '#f8f9fc', border: '1px solid #e5e8f0', borderRadius: 8, padding: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: '#1a2438', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>▎</span> 备注
        </div>
        <textarea
          style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
          value={networkRemark}
          onChange={e => setNetworkRemark(e.target.value)}
          placeholder=""
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 10 }}>
          {networkRemarkSaved && <span style={{ fontSize: 12, color: '#00b42a' }}>✓ 已保存</span>}
          <button
            onClick={saveNetworkRemark}
            disabled={networkRemarkSaving}
            style={{ padding: '6px 16px', background: networkRemarkSaving ? '#9da5b4' : '#0052d9', color: '#fff', border: 'none', borderRadius: 5, cursor: networkRemarkSaving ? 'not-allowed' : 'pointer', fontSize: 13 }}
          >
            {networkRemarkSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default NetworkTab
