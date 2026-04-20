import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  getNetworkDevices, deleteNetworkDevice, batchDeleteNetworkDevices,
  getNetworkDeviceDatacenters, NetworkDevice,
  exportNetworkDevicesExcel, exportNetworkDevicesCsv, importNetworkDevices
} from '../api/networkDeviceApi'
import StatusBadge from '../components/StatusBadge'
import NetworkDeviceFormDrawer from '../components/NetworkDeviceFormDrawer'
import ConfirmDialog from '../components/ConfirmDialog'
import { toastService } from '../components/Toast'
import Pagination from '../components/Pagination'

const COLUMNS = [
  { key: 'name',         label: '设备名称',   width: 160, sortable: false },
  { key: 'managementIp', label: '管理IP',    width: 130, sortable: false },
  { key: 'brand',        label: '品牌',      width: 90,  sortable: false },
  { key: 'model',        label: '型号',      width: 130, sortable: false },
  { key: 'datacenter',    label: '机房',      width: 100, sortable: true },
  { key: 'cabinet',      label: '机柜',      width: 90,  sortable: false },
  { key: 'owner',        label: '资产归属',   width: 100, sortable: false },
  { key: 'actions',      label: '操作',      width: 110, sortable: false },
]

const DEVICE_TYPE_MAP: Record<string, string> = {
  switch: '交换机',
  router: '路由器',
  firewall: '防火墙',
  lb: '负载均衡',
  other: '其他',
}

const NetworkDeviceListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [devices, setDevices] = useState<NetworkDevice[]>([])
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(15)
  const [loading, setLoading] = useState(false)
  const [datacenters, setDatacenters] = useState<string[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [editDevice, setEditDevice] = useState<NetworkDevice | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [importVisible, setImportVisible] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; updated: number; skipped: number; errors: string[] } | null>(null)
  const [exportMenuVisible, setExportMenuVisible] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 确认对话框状态
  const [confirmState, setConfirmState] = useState<{
    visible: boolean
    title: string
    message: string
    danger: boolean
    onConfirm: () => void
  }>({ visible: false, title: '', message: '', danger: false, onConfirm: () => {} })

  const page = Number(searchParams.get('page')) || 1
  const search = searchParams.get('search') || ''
  const filterStatus = searchParams.get('status') || ''
  const filterDeviceType = searchParams.get('deviceType') || ''
  const filterDatacenter = searchParams.get('datacenter') || ''

  useEffect(() => { setSearchInput(search) }, [search])

  const updateFilter = (updates: Record<string, string | number>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(updates)) {
        if (value === '' || value === 1) next.delete(key)
        else next.set(key, String(value))
      }
      return next
    })
  }

  useEffect(() => {
    getNetworkDeviceDatacenters()
      .then(r => setDatacenters(r.data))
      .catch(() => setDatacenters([]))
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getNetworkDevices({
        page, pageSize, search,
        status: filterStatus || undefined,
        deviceType: filterDeviceType || undefined,
        datacenter: filterDatacenter || undefined,
      })
      setDevices(res.data.list)
      setTotal(res.data.total)
    } catch { /* 列表加载失败静默处理，保留旧数据 */ } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, filterStatus, filterDeviceType, filterDatacenter])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSearchChange = (value: string) => { setSearchInput(value) }

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      updateFilter({ search: (e.target as HTMLInputElement).value, page: 1 })
    }
  }

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const device = devices.find(d => d.id === id)
    setConfirmState({
      visible: true,
      title: '确认删除',
      message: `确定要删除设备「${device?.name || id}」吗？此操作不可撤销。`,
      danger: true,
      onConfirm: async () => {
        try {
          await deleteNetworkDevice(id)
          toastService.success('删除成功')
          fetchData()
        } catch {
          toastService.error('删除失败')
        }
      },
    })
  }

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return
    setConfirmState({
      visible: true,
      title: '确认批量删除',
      message: `确定要删除选中的 ${selectedIds.length} 台设备吗？此操作不可撤销。`,
      danger: true,
      onConfirm: async () => {
        try {
          await batchDeleteNetworkDevices(selectedIds)
          toastService.success(`成功删除 ${selectedIds.length} 台设备`)
          setSelectedIds([])
          fetchData()
        } catch {
          toastService.error('批量删除失败')
        }
      },
    })
  }

  const handleEdit = (device: NetworkDevice, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditDevice(device)
    setDrawerVisible(true)
  }

  const handleAdd = () => {
    setEditDevice(null)
    setDrawerVisible(true)
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === devices.length) setSelectedIds([])
    else setSelectedIds(devices.map(d => d.id))
  }

  // 导出 Excel
  const handleExportExcel = async () => {
    setExportMenuVisible(false)
    try {
      const res: any = await exportNetworkDevicesExcel()
      const url = URL.createObjectURL(new Blob([res], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }))
      const a = document.createElement('a')
      a.href = url
      a.download = `网络设备资产_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toastService.success('导出成功')
    } catch {
      toastService.error('导出失败，请稍后重试')
    }
  }

  // 导出 CSV
  const handleExportCsv = async () => {
    setExportMenuVisible(false)
    try {
      const res: any = await exportNetworkDevicesCsv()
      const url = URL.createObjectURL(new Blob([res], { type: 'text/csv;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `network-devices_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toastService.success('导出成功')
    } catch {
      toastService.error('导出失败，请稍后重试')
    }
  }

  // 将文件转换为 base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // 去掉 data:image/...;base64, 前缀
        const base64 = result.split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // 处理文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 文件类型限制：支持 .csv 和 .xlsx
    const isCsv = file.name.endsWith('.csv')
    const isExcel = file.name.endsWith('.xlsx')
    if (!isCsv && !isExcel) {
      setImportResult({ created: 0, updated: 0, skipped: 0, errors: ['仅支持 .csv 和 .xlsx 格式文件'] })
      toastService.warning('仅支持 .csv 和 .xlsx 格式文件')
      return
    }

    // 文件大小限制：5MB
    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      setImportResult({ created: 0, updated: 0, skipped: 0, errors: ['文件大小不能超过 5MB'] })
      toastService.warning('文件大小不能超过 5MB')
      return
    }

    const text = isCsv ? await file.text() : await fileToBase64(file)
    setImportLoading(true)
    setImportResult(null)
    try {
      const format = isCsv ? 'csv' : 'xlsx'
      const res = await importNetworkDevices(text, format)
      setImportResult(res.data)
      toastService.success(`导入完成：新建 ${res.data.created} 台，更新 ${res.data.updated} 台`)
    } catch (err: any) {
      setImportResult({ created: 0, updated: 0, skipped: 0, errors: [err?.response?.data?.message || err.message || '导入失败'] })
      toastService.error(err?.response?.data?.message || err.message || '导入失败')
    } finally {
      setImportLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // 导入成功后关闭对话框
  const handleImportSuccess = () => {
    setImportVisible(false)
    setImportResult(null)
    fetchData()
    getNetworkDeviceDatacenters().then(r => setDatacenters(r.data)).catch(() => {})
    toastService.success('导入成功')
  }



  return (
    <div>
      {/* 工具栏 */}
      <div className="table-toolbar" style={{ background: '#fff', borderRadius: '8px 8px 0 0', display: 'flex', gap: 12, padding: '14px 20px', flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid #e5e8f0' }}>
        <input
          type="text"
          placeholder="搜索：名称、型号、SN、管理IP..."
          value={searchInput}
          onChange={e => handleSearchChange(e.target.value)}
          onKeyDown={handleSearch}
          style={{ padding: '7px 12px', border: '1px solid #dde3ee', borderRadius: 5, fontSize: 13, width: 260, outline: 'none' }}
        />

        <select value={filterDeviceType} onChange={e => updateFilter({ deviceType: e.target.value, page: 1 })}
          style={{ padding: '7px 10px', border: '1px solid #dde3ee', borderRadius: 5, fontSize: 13, outline: 'none', minWidth: 110 }}>
          <option value="">全部类型</option>
          <option value="switch">交换机</option>
          <option value="router">路由器</option>
          <option value="firewall">防火墙</option>
          <option value="lb">负载均衡</option>
          <option value="other">其他</option>
        </select>

        <select value={filterStatus} onChange={e => updateFilter({ status: e.target.value, page: 1 })}
          style={{ padding: '7px 10px', border: '1px solid #dde3ee', borderRadius: 5, fontSize: 13, outline: 'none', minWidth: 100 }}>
          <option value="">全部状态</option>
          <option value="running">运行中</option>
          <option value="maintenance">维护中</option>
          <option value="offline">已下线</option>
        </select>

        <select value={filterDatacenter} onChange={e => updateFilter({ datacenter: e.target.value, page: 1 })}
          style={{ padding: '7px 10px', border: '1px solid #dde3ee', borderRadius: 5, fontSize: 13, outline: 'none', minWidth: 110 }}>
          <option value="">全部机房</option>
          {datacenters.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {selectedIds.length > 0 && (
            <button onClick={handleBatchDelete} className="btn btn-danger btn-sm">
              🗑️ 删除选中({selectedIds.length})
            </button>
          )}
          <button onClick={() => { setImportVisible(true); setImportResult(null) }} className="btn btn-outline-primary btn-sm">
            ↑ 导入资产
          </button>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setExportMenuVisible(!exportMenuVisible)} className="btn btn-secondary btn-sm">
              ↓ 导出资产 ▾
            </button>
            {exportMenuVisible && (
              <>
                <div onClick={() => setExportMenuVisible(false)} style={{ position: 'fixed', inset: 0, zIndex: 99 }} />
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4,
                  background: '#fff', border: '1px solid #e5e8f0', borderRadius: 6,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, minWidth: 120,
                }}>
                  <div onClick={handleExportExcel} style={{ padding: '8px 16px', cursor: 'pointer', fontSize: 13, borderRadius: '6px 6px 0 0' }}
                    onMouseEnter={e => (e.target as HTMLElement).style.background = '#f5f7fa'}
                    onMouseLeave={e => (e.target as HTMLElement).style.background = 'transparent'}>
                    导出 Excel
                  </div>
                  <div onClick={handleExportCsv} style={{ padding: '8px 16px', cursor: 'pointer', fontSize: 13, borderRadius: '0 0 6px 6px' }}
                    onMouseEnter={e => (e.target as HTMLElement).style.background = '#f5f7fa'}
                    onMouseLeave={e => (e.target as HTMLElement).style.background = 'transparent'}>
                    导出 CSV
                  </div>
                </div>
              </>
            )}
          </div>
          <button onClick={handleAdd} className="btn btn-primary">
            + 新增设备
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div style={{ background: '#fff', borderRadius: '0 0 12px 12px', overflow: 'auto', border: '1px solid #E2E8F0', borderTop: 'none' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ padding: '10px 12px', width: 40, textAlign: 'center' }}>
                <input type="checkbox" checked={devices.length > 0 && selectedIds.length === devices.length}
                  onChange={toggleSelectAll} />
              </th>
              {COLUMNS.map(col => (
                <th key={col.key} style={{ padding: '10px 12px', width: col.width, textAlign: 'left', color: '#64748B', fontWeight: 600 }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} style={{ textAlign: 'center', padding: 40, color: '#94A3B8' }}>加载中...</td>
              </tr>
            ) : devices.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>
                  {search || filterStatus || filterDeviceType || filterDatacenter ? '没有符合条件的设备' : '暂无网络设备，点击右上角「新增设备」添加第一台设备'}
                </td>
              </tr>
            ) : devices.map(device => (
              <tr key={device.id}
                onClick={() => handleEdit(device, {} as any)}>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}
                  onClick={e => { e.stopPropagation(); toggleSelect(device.id) }}>
                  <input type="checkbox" checked={selectedIds.includes(device.id)}
                    onChange={() => toggleSelect(device.id)} />
                </td>
                <td style={{ padding: '10px 12px', color: '#1a2438', fontWeight: 500 }}>{device.name}</td>
                <td style={{ padding: '10px 12px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 3, fontSize: 12, background: '#e8f3ff', color: '#0052d9' }}>
                    {DEVICE_TYPE_MAP[device.deviceType] || device.deviceType}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', color: '#6b7a99' }}>{device.managementIp || '-'}</td>
                <td style={{ padding: '10px 12px', color: '#6b7a99' }}>{device.brand || '-'}</td>
                <td style={{ padding: '10px 12px', color: '#6b7a99' }}>{device.model || '-'}</td>
                <td style={{ padding: '10px 12px', color: '#6b7a99' }}>{device.datacenter || '-'}</td>
                <td style={{ padding: '10px 12px', color: '#6b7a99' }}>{device.cabinet || '-'}</td>
                <td style={{ padding: '10px 12px', color: '#6b7a99' }}>{device.owner || '-'}</td>
                <td style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={e => handleEdit(device, e)}
                      style={{ fontSize: 12, padding: '3px 10px', borderRadius: 4, border: '1px solid #0052d9', color: '#0052d9', background: 'transparent', cursor: 'pointer' }}>
                      编辑
                    </button>
                    <button onClick={e => handleDelete(device.id, e)}
                      style={{ fontSize: 12, padding: '3px 10px', borderRadius: 4, border: '1px solid #f53f3f', color: '#f53f3f', background: 'transparent', cursor: 'pointer' }}>
                      删除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 分页 */}
        <Pagination
          page={page}
          total={total}
          pageSize={pageSize}
          onPageChange={p => updateFilter({ page: p })}
          label={`共 ${total} 台设备`}
        />
      </div>

      <NetworkDeviceFormDrawer
        visible={drawerVisible}
        editData={editDevice}
        onClose={() => setDrawerVisible(false)}
        onSuccess={() => { fetchData(); setDrawerVisible(false) }}
      />

      <ConfirmDialog
        visible={confirmState.visible}
        title={confirmState.title}
        message={confirmState.message}
        danger={confirmState.danger}
        onConfirm={() => { confirmState.onConfirm(); setConfirmState(s => ({ ...s, visible: false })) }}
        onCancel={() => setConfirmState(s => ({ ...s, visible: false }))}
      />

      {/* 导入资产弹窗 */}
      {importVisible && (
        <>
          <div onClick={() => { setImportVisible(false); setImportResult(null) }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 999 }} />
          <div style={{
            position: 'fixed', top: '25%', left: '50%',
            width: 520, zIndex: 1000, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <div style={{ background: '#fff', borderRadius: 8, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>导入网络设备</span>
                <button onClick={() => { setImportVisible(false); setImportResult(null) }}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 22, color: '#9da5b4', lineHeight: 1 }}>×</button>
              </div>

              {/* 文件选择 */}
              <div style={{ marginBottom: 16 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFileChange}
                  disabled={importLoading}
                  style={{ fontSize: 13 }}
                />
                <div style={{ fontSize: 12, color: '#9da5b4', marginTop: 8 }}>
                  支持 .csv 和 .xlsx 格式，文件大小不超过 5MB
                </div>
              </div>

              {/* 加载状态 */}
              {importLoading && (
                <div style={{ color: '#6b7a99', fontSize: 13, padding: '8px 0' }}>正在导入...</div>
              )}

              {/* 导入结果 */}
              {importResult && !importLoading && (
                <div style={{ marginTop: 16, padding: '12px 16px', background: '#f7f8fa', borderRadius: 8, fontSize: 13 }}>
                  <div style={{ marginBottom: 8, fontWeight: 500, color: '#1a2438' }}>导入完成</div>
                  <div style={{ color: '#00b42a', marginBottom: 4 }}>✓ 新建：{importResult.created} 台</div>
                  <div style={{ color: '#0052d9', marginBottom: 4 }}>✓ 更新：{importResult.updated} 台</div>
                  {importResult.skipped > 0 && (
                    <div style={{ color: '#ff7d00', marginBottom: 4 }}>⚠ 跳过：{importResult.skipped} 台</div>
                  )}
                  {importResult.errors.length > 0 && (
                    <div style={{ marginTop: 8, color: '#f53f3f', fontSize: 12 }}>
                      {importResult.errors.slice(0, 3).join('；')}
                      {importResult.errors.length > 3 && ` 等${importResult.errors.length}条错误`}
                    </div>
                  )}
                  <button
                    onClick={handleImportSuccess}
                    style={{ marginTop: 12, padding: '6px 20px', background: '#0052d9', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 13 }}
                  >
                    关闭
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default NetworkDeviceListPage
