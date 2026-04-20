import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getServers, deleteServer, batchDeleteServers, getCompanies, getDatacenters, getOwners, exportServersExcel, importServers, batchImportServers, updateServer, createServer, Server } from '../api'
import { toastService } from '../components/Toast'
import ConfirmDialog from '../components/ConfirmDialog'
import BatchProgressDialog from '../components/BatchProgressDialog'
import StatusBadge from '../components/StatusBadge'
import ServerFormDrawer from '../components/ServerFormDrawer'
import Pagination from '../components/Pagination'
import { colors } from '../theme'

const FIXED_COLUMNS = [
  { key: 'company',    label: '公司名称', width: 140 },
  { key: 'name',       label: '主机名',   width: 160 },
  { key: 'ip',         label: '管理IP',   width: 130 },
  { key: 'brand',      label: '品牌',     width: 100 },
  { key: 'model',      label: '型号',     width: 140 },
  { key: 'sn',         label: '序列号',   width: 140 },
  { key: 'datacenter', label: '机房',     width: 100 },
  { key: 'owner',      label: '资产归属', width: 120 },
  { key: 'actions',    label: '操作',    width: 100 },
]

const ServerListPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [servers, setServers] = useState<Server[]>([])
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(15)
  const [loading, setLoading] = useState(false)
  const [companies, setCompanies] = useState<string[]>([])
  const [datacenters, setDatacenters] = useState<string[]>([])
  const [owners, setOwners] = useState<string[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [editServer, setEditServer] = useState<Server | null>(null)
  const [importVisible, setImportVisible] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importMode, setImportMode] = useState<'single' | 'batch'>('single') // 'single' 或 'batch'
  const [importResult, setImportResult] = useState<{ created: number; updated: number; skipped: number; errors: string[] } | null>(null)
  const [batchImportResult, setBatchImportResult] = useState<{
    files: Array<{
      filename: string;
      success: boolean;
      result?: {
        total: number;
        created: number;
        updated: number;
        skipped: number;
        errors: string[];
      };
      error?: string;
    }>;
    summary: {
      totalFiles: number;
      successFiles: number;
      totalServers: number;
      totalCreated: number;
      totalUpdated: number;
    };
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [searchInput, setSearchInput] = useState('')

  // 批量编辑
  const [batchEditVisible, setBatchEditVisible] = useState(false)
  const [batchEditLoading, setBatchEditLoading] = useState(false)
  const [batchEditForm, setBatchEditForm] = useState({
    status: '', datacenter: '', owner: '',
  })

  // 确认对话框状态
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean
    title: string
    message: React.ReactNode
    onConfirm: () => void
    danger?: boolean
  }>({ visible: false, title: '', message: '', onConfirm: () => {} })

  // 删除缓存（用于撤销）
  const deletedServerCache = useRef<Server | null>(null)

  // 批量操作进度状态
  const [batchProgress, setBatchProgress] = useState({
    visible: false,
    title: '',
    current: 0,
    total: 0,
    successCount: 0,
    failCount: 0,
    failReason: '',
  })

  // 从 URL 参数初始化筛选状态，刷新页面后保持
  const page = Number(searchParams.get('page')) || 1
  const search = searchParams.get('search') || ''
  const filterStatus = searchParams.get('status') || ''
  const filterCompany = searchParams.get('company') || ''
  const filterDatacenter = searchParams.get('datacenter') || ''
  const filterOwner = searchParams.get('owner') || ''
  const sortBy = (searchParams.get('sortBy') as 'company' | 'name' | 'datacenter') || ''
  const sortOrder = searchParams.get('sortOrder') || 'asc'

  // URL 参数变化时同步搜索框
  useEffect(() => {
    setSearchInput(search)
  }, [search])

  const updateFilter = (updates: Record<string, string | number>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(updates)) {
        if (value === '' || value === 1) {
          next.delete(key)
        } else {
          next.set(key, String(value))
        }
      }
      return next
    })
  }

  // 加载公司列表（用于过滤下拉）
  useEffect(() => {
    getCompanies().then(r => setCompanies(r.data)).catch(() => {})
  }, [])

  // 加载机房列表（随公司联动）
  useEffect(() => {
    getDatacenters(filterCompany || undefined)
      .then(r => setDatacenters(r.data))
      .catch(() => setDatacenters([]))
  }, [filterCompany])

  // 加载资产归属列表（随公司联动）
  useEffect(() => {
    getOwners(filterCompany || undefined)
      .then(r => {
        console.log('资产归属数据加载成功:', r.data)
        setOwners(r.data)
      })
      .catch((err) => {
        console.error('资产归属数据加载失败:', err)
        setOwners([])
      })
  }, [filterCompany])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getServers({ page, pageSize, search, status: filterStatus, company: filterCompany, datacenter: filterDatacenter, owner: filterOwner, sortBy: sortBy || undefined, sortOrder: sortOrder as 'asc' | 'desc' })
      setServers(res.data.list)
      setTotal(res.data.total)
    } catch { /* silent fail, fetchData handles error display */ } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, filterStatus, filterCompany, filterDatacenter, filterOwner, sortBy, sortOrder])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSearchChange = (value: string) => {
    setSearchInput(value) // 只更新输入框显示，不触发请求
  }

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = (e.target as HTMLInputElement).value
      updateFilter({ search: val, page: 1 })
    }
  }

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const server = servers.find(s => s.id === id)
    if (!server) return

    // 缓存服务器数据用于撤销
    deletedServerCache.current = server

    setConfirmDialog({
      visible: true,
      title: '确认删除',
      message: `确定要删除服务器「${server.name}」吗？此操作可以撤销。`,
      danger: true,
      onConfirm: async () => {
        try {
          await deleteServer(id)
          toastService.success(`服务器「${server.name}」已删除`, {
            undoAction: async () => {
              // 撤销：恢复服务器
              if (deletedServerCache.current) {
                try {
                  await createServer(deletedServerCache.current)
                  toastService.success('服务器已恢复')
                  fetchData()
                  getCompanies().then(r => setCompanies(r.data)).catch(() => {})
                } catch {
                  toastService.error('恢复失败，请手动重新添加')
                }
              }
            }
          })
          fetchData()
        } catch {
          // 错误已由 request 拦截器处理
        }
        setConfirmDialog(prev => ({ ...prev, visible: false }))
      },
    })
  }

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return

    setConfirmDialog({
      visible: true,
      title: '确认批量删除',
      message: `确定要删除选中的 ${selectedIds.length} 台服务器吗？此操作不可撤销。`,
      danger: true,
      onConfirm: async () => {
        setBatchProgress({
          visible: true,
          title: '批量删除进度',
          current: 0,
          total: selectedIds.length,
          successCount: 0,
          failCount: 0,
          failReason: '',
        })

        let successCount = 0
        let failCount = 0
        const failReasons: string[] = []

        for (const id of selectedIds) {
          try {
            await deleteServer(id)
            successCount++
          } catch (err: any) {
            failCount++
            const server = servers.find(s => s.id === id)
            failReasons.push(`${server?.name || id}: ${err.message}`)
          }
          setBatchProgress(prev => ({
            ...prev,
            current: prev.current + 1,
            successCount,
            failCount,
            failReason: failReasons.slice(0, 3).join('；') + (failReasons.length > 3 ? `等${failReasons.length}条错误` : ''),
          }))
        }

        setSelectedIds([])
        fetchData()
        getCompanies().then(r => setCompanies(r.data)).catch(() => {})

        if (failCount === 0) {
          toastService.success(`成功删除 ${successCount} 台服务器`)
        } else {
          toastService.warning(`删除完成：成功 ${successCount} 台，失败 ${failCount} 台`)
        }

        setConfirmDialog(prev => ({ ...prev, visible: false }))
      },
    })
  }

  const handleExportExcel = async () => {
    try {
      const res: any = await exportServersExcel()
      const url = URL.createObjectURL(new Blob([res], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }))
      const a = document.createElement('a')
      a.href = url
      a.download = `服务器资产_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
      toastService.success('导出成功')
    } catch {
      toastService.error('导出失败，请稍后重试')
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // 检查文件数量和模式
    if (importMode === 'single' && files.length > 1) {
      toastService.warning('单文件导入模式下请选择一个文件')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    if (importMode === 'batch') {
      // 批量导入模式
      const MAX_SIZE = 5 * 1024 * 1024
      const filesArray = Array.from(files)
      
      // 验证所有文件
      for (const file of filesArray) {
        if (!file.name.endsWith('.txt')) {
          toastService.warning(`${file.name}: 仅支持 .txt 格式文件`)
          if (fileInputRef.current) fileInputRef.current.value = ''
          return
        }
        if (file.size > MAX_SIZE) {
          toastService.warning(`${file.name}: 文件大小不能超过 5MB`)
          if (fileInputRef.current) fileInputRef.current.value = ''
          return
        }
      }

      setImportLoading(true)
      setBatchImportResult(null)

      try {
        // 读取所有文件内容
        const filePromises = filesArray.map(async (file) => {
          const content = await file.text()
          return {
            filename: file.name,
            content
          }
        })

        const filesWithContent = await Promise.all(filePromises)
        const res = await batchImportServers(filesWithContent)
        setBatchImportResult(res.data)
        toastService.success(`批量导入完成：${res.data.summary.totalFiles} 个文件，新建 ${res.data.summary.totalCreated} 台，更新 ${res.data.summary.totalUpdated} 台`)
      } catch (err: any) {
        toastService.error(err?.response?.data?.message || err.message || '批量导入失败')
        setBatchImportResult(null)
      } finally {
        setImportLoading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    } else {
      // 单文件导入模式
      const file = files[0]
      if (!file.name.endsWith('.txt')) {
        setImportResult({ created: 0, updated: 0, skipped: 0, errors: ['仅支持 .txt 格式文件'] })
        toastService.warning('仅支持 .txt 格式文件')
        return
      }
      const MAX_SIZE = 5 * 1024 * 1024
      if (file.size > MAX_SIZE) {
        setImportResult({ created: 0, updated: 0, skipped: 0, errors: ['文件大小不能超过 5MB'] })
        toastService.warning('文件大小不能超过 5MB')
        return
      }
      const text = await file.text()
      setImportLoading(true)
      setImportResult(null)
      try {
        const res = await importServers(text)
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
  }

  const handleImportSuccess = () => {
    setImportVisible(false)
    setImportResult(null)
    setBatchImportResult(null)
    fetchData()
    getCompanies().then(r => setCompanies(r.data)).catch(() => {})
    toastService.success('导入成功')
  }

  const handleEdit = (server: Server, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditServer(server)
    setDrawerVisible(true)
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === servers.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(servers.map(s => s.id))
    }
  }

  // 批量编辑
  const openBatchEdit = () => {
    setBatchEditForm({ status: '', datacenter: '', owner: '' })
    setBatchEditVisible(true)
  }

  const handleBatchEdit = async () => {
    if (!batchEditForm.status && !batchEditForm.datacenter && !batchEditForm.owner) {
      toastService.warning('请至少选择一个要修改的字段')
      return
    }

    setConfirmDialog({
      visible: true,
      title: '确认批量修改',
      message: `确定要修改选中的 ${selectedIds.length} 台服务器吗？`,
      onConfirm: async () => {
        setBatchEditLoading(true)
        setBatchProgress({
          visible: true,
          title: '批量编辑进度',
          current: 0,
          total: selectedIds.length,
          successCount: 0,
          failCount: 0,
          failReason: '',
        })

        const payload: any = {}
        if (batchEditForm.status) payload.status = batchEditForm.status
        if (batchEditForm.datacenter) payload.datacenter = batchEditForm.datacenter
        if (batchEditForm.owner) payload.owner = batchEditForm.owner

        let successCount = 0
        let failCount = 0
        const failReasons: string[] = []

        for (const id of selectedIds) {
          try {
            await updateServer(id, payload)
            successCount++
          } catch (err: any) {
            failCount++
            const server = servers.find(s => s.id === id)
            failReasons.push(`${server?.name || id}: ${err.message}`)
          }
          setBatchProgress(prev => ({
            ...prev,
            current: prev.current + 1,
            successCount,
            failCount,
            failReason: failReasons.slice(0, 3).join('；') + (failReasons.length > 3 ? `等${failReasons.length}条错误` : ''),
          }))
        }

        setSelectedIds([])
        setBatchEditVisible(false)
        fetchData()
        getCompanies().then(r => setCompanies(r.data)).catch(() => {})

        if (failCount === 0) {
          toastService.success(`成功修改 ${successCount} 台服务器`)
        } else {
          toastService.warning(`修改完成：成功 ${successCount} 台，失败 ${failCount} 台`)
        }

        setConfirmDialog(prev => ({ ...prev, visible: false }))
        setBatchEditLoading(false)
      },
    })
  }



  const getManagementIp = (server: Server) => {
    // 只显示管理网网卡的 IP（需要同时满足：用途为管理网 + 有 IP 地址）
    const mgmt = server.networkInfos?.find(n => n.nicPurpose === 'management')
    return (mgmt?.ipAddress) ? mgmt.ipAddress : '-'
  }

  return (
    <div>
      {/* 工具栏 - 单行紧凑布局 */}
      <div className="table-toolbar" style={{ 
        background: '#fff', 
        borderRadius: '8px 8px 0 0', 
        display: 'flex', 
        alignItems: 'center', 
        padding: '14px 20px', 
        borderBottom: '1px solid #e5e8f0',
        flexWrap: 'nowrap',
        overflowX: 'auto',
        gap: '10px'
      }}>
        {/* 搜索框 */}
        <input
          type="text"
          placeholder="搜索名称、SN、IP..."
          value={searchInput}
          onChange={e => handleSearchChange(e.target.value)}
          onKeyDown={handleSearch}
          style={{ 
            padding: '7px 12px', 
            border: '1px solid #dde3ee', 
            borderRadius: '5px', 
            fontSize: '13px', 
            width: '180px', 
            outline: 'none', 
            flexShrink: 0 
          }}
        />

        {/* 过滤器组 */}
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <select 
            value={filterCompany} 
            onChange={e => updateFilter({ company: e.target.value, page: 1, datacenter: '' })}
            style={{ 
              padding: '7px 10px', 
              border: '1px solid #dde3ee', 
              borderRadius: '5px', 
              fontSize: '13px', 
              outline: 'none', 
              width: '100px',
              flexShrink: 0
            }}
          >
            <option value="">全部公司</option>
            {companies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select 
            value={filterDatacenter} 
            onChange={e => updateFilter({ datacenter: e.target.value, page: 1 })}
            style={{ 
              padding: '7px 10px', 
              border: '1px solid #dde3ee', 
              borderRadius: '5px', 
              fontSize: '13px', 
              outline: 'none', 
              width: '100px',
              flexShrink: 0
            }}
          >
            <option value="">全部机房</option>
            {datacenters.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select 
            value={filterStatus} 
            onChange={e => updateFilter({ status: e.target.value, page: 1 })}
            style={{ 
              padding: '7px 8px', 
              border: '1px solid #dde3ee', 
              borderRadius: '5px', 
              fontSize: '13px', 
              outline: 'none', 
              width: '80px',
              flexShrink: 0
            }}
          >
            <option value="">全部状态</option>
            <option value="running">运行中</option>
            <option value="offline">已下线</option>
            <option value="maintenance">维护中</option>
          </select>

          <select 
            value={filterOwner} 
            onChange={e => updateFilter({ owner: e.target.value, page: 1 })}
            style={{ 
              padding: '7px 8px', 
              border: '1px solid #dde3ee', 
              borderRadius: '5px', 
              fontSize: '13px', 
              outline: 'none', 
              width: '100px',
              flexShrink: 0
            }}
          >
            <option value="">资产归属</option>
            {owners.length > 0 ? (
              owners.map(owner => <option key={owner} value={owner}>{owner}</option>)
            ) : (
              <option value="">加载中...</option>
            )}
          </select>
        </div>

        {/* 操作按钮组 */}
        <div style={{ 
          marginLeft: 'auto', 
          display: 'flex', 
          gap: '6px', 
          flexShrink: 0,
          alignItems: 'center'
        }}>
          {/* 调试按钮 - 用于检查筛选框 */}
          {true && (
            <button 
              onClick={() => {
                console.log('资产归属筛选框信息:')
                console.log('owners数组:', owners)
                console.log('owners长度:', owners.length)
                console.log('filterOwner:', filterOwner)
                
                // 检查DOM元素
                const ownerSelect = document.querySelector('select[value*="owner"]') || 
                                   document.querySelector('select option[value=""]')
                console.log('筛选框DOM元素:', ownerSelect)
                
                // 检查所有筛选框
                const allSelects = document.querySelectorAll('select')
                console.log('所有select元素:', allSelects.length, allSelects)
              }}
              style={{
                padding: '4px 8px',
                fontSize: '10px',
                background: '#f0f0f0',
                border: '1px solid #ccc',
                borderRadius: '3px',
                marginRight: '8px'
              }}
            >
              调试筛选框
            </button>
          )}
          {selectedIds.length > 0 && (
            <>
              <button onClick={openBatchEdit} className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap' }}>
                ✎ 批量编辑({selectedIds.length})
              </button>
              <button onClick={handleBatchDelete} className="btn btn-danger btn-sm" style={{ whiteSpace: 'nowrap' }}>
                🗑️ 删除
              </button>
            </>
          )}
          <button onClick={handleExportExcel} className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap' }}>
            ↓ 导出
          </button>
          <button onClick={() => { setImportVisible(true); setImportResult(null) }} className="btn btn-outline-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
            ↑ 导入
          </button>
          <button onClick={() => { setEditServer(null); setDrawerVisible(true) }} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
            + 新增
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div style={{ background: '#fff', borderRadius: '0 0 12px 12px', overflow: 'auto', border: '1px solid #E2E8F0', borderTop: 'none' }}>
        <table className="data-table" style={{ width: '100%'}}>
          <thead>
            <tr>
              <th style={{ padding: '8px 2px', width: 24, textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={servers.length > 0 && selectedIds.length === servers.length}
                  onChange={toggleSelectAll}
                  style={{ width: '14px', height: '14px' }}
                />
              </th>
              {FIXED_COLUMNS.map(col => {
                const sortable = col.key === 'company' || col.key === 'datacenter'
                const isSorted = sortBy === col.key
                const nextOrder = isSorted && sortOrder === 'asc' ? 'desc' : 'asc'
                return (
                  <th
                    key={col.key}
                    style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      color: '#6b7a99',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      width: col.width,
                      userSelect: 'none',
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {col.label}
                      {sortable && (
                        <span
                          onClick={() => updateFilter({ sortBy: col.key, sortOrder: nextOrder, page: 1 })}
                          style={{
                            cursor: 'pointer',
                            color: isSorted ? '#0052d9' : '#c2c7d0',
                            fontSize: 14,
                            marginLeft: 4,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: isSorted ? '#e6f0ff' : 'transparent',
                            border: '1px solid ' + (isSorted ? '#0052d9' : '#e5e8f0'),
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontWeight: isSorted ? 700 : 400,
                          }}
                          title={isSorted ? (sortOrder === 'asc' ? '点击降序' : '点击升序') : '点击升序'}
                        >
                          {isSorted && sortOrder === 'asc' ? '↑' : isSorted && sortOrder === 'desc' ? '↓' : '↕'}
                        </span>
                      )}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <>
                {[...Array(5)].map((_, i) => (
                  <tr key={i} style={{ opacity: 1 - i * 0.15 }}>
                    {FIXED_COLUMNS.map((col) => (
                      <td key={col.key} style={{ padding: '12px 16px' }}>
                        <div className="skeleton" style={{
                          height: 16,
                          width: col.key === 'name' ? '80%' : col.key === 'status' ? '60px' : '70%',
                          borderRadius: 4
                        }} />
                      </td>
                    ))}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div className="skeleton" style={{ width: 32, height: 28, borderRadius: 4 }} />
                        <div className="skeleton" style={{ width: 32, height: 28, borderRadius: 4 }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </>
            ) : servers.length === 0 ? (
              <tr>
                <td colSpan={FIXED_COLUMNS.length + 1} style={{ textAlign: 'center', padding: 80, color: '#9da5b4' }}>
                  <div style={{ marginBottom: 16 }}>
                    <svg viewBox="0 0 120 80" width="120" height="80" style={{ opacity: 0.6 }}>
                      <rect x="10" y="30" width="100" height="40" rx="4" fill="#e8f5e9" stroke="#10B981" strokeWidth="2" />
                      <rect x="20" y="40" width="30" height="20" rx="2" fill="#10B981" opacity="0.3" />
                      <rect x="55" y="40" width="30" height="20" rx="2" fill="#10B981" opacity="0.3" />
                      <circle cx="85" cy="50" r="8" fill="#10B981" opacity="0.5" />
                      <rect x="35" y="15" width="50" height="15" rx="2" fill="#e8f5e9" stroke="#10B981" strokeWidth="1.5" />
                      <line x1="60" y1="15" x2="60" y2="30" stroke="#10B981" strokeWidth="1.5" />
                      <line x1="45" y1="22" x2="55" y2="22" stroke="#10B981" strokeWidth="1" />
                      <line x1="65" y1="22" x2="75" y2="22" stroke="#10B981" strokeWidth="1" />
                    </svg>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#4A5568', marginBottom: 6 }}>还没有任何服务器</div>
                  <div style={{ fontSize: 13, marginBottom: 20 }}>点击下方按钮添加第一台服务器</div>
                  <button
                    onClick={() => { setEditServer(null); setDrawerVisible(true) }}
                    style={{
                      padding: '10px 20px',
                      background: colors.primary,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    + 新增第一台服务器
                  </button>
                </td>
              </tr>
            ) : (
              servers.map(server => (
                <tr
                  key={server.id}
                  className={server.status}
                  onClick={() => navigate(`/servers/${server.id}`)}
                >
                  <td style={{ padding: '8px 2px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(server.id)}
                      onChange={() => toggleSelect(server.id)}
                      style={{ width: '14px', height: '14px' }}
                    />
                  </td>
                  {FIXED_COLUMNS.map(col => {
                    if (col.key === 'company') return <td key={col.key} style={{ padding: '10px 12px', color: '#6b7a99' }}>{server.company || '-'}</td>
                    if (col.key === 'name') return <td key={col.key} style={{ padding: '10px 12px', fontWeight: 500, color: '#0052d9' }}>{server.name}</td>
                    if (col.key === 'ip') return <td key={col.key} style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#1a2438' }}>{getManagementIp(server)}</td>
                    if (col.key === 'brand') return <td key={col.key} style={{ padding: '10px 12px', color: '#6b7a99' }}>{server.brand || '-'}</td>
                    if (col.key === 'model') return <td key={col.key} style={{ padding: '10px 12px', color: '#6b7a99' }}>{server.model || '-'}</td>
                    if (col.key === 'sn') return <td key={col.key} style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#6b7a99' }}>{server.sn || '-'}</td>
                    if (col.key === 'datacenter') return <td key={col.key} style={{ padding: '10px 12px', color: '#6b7a99' }}>{server.datacenter || '-'}</td>
                    if (col.key === 'owner') return <td key={col.key} style={{ padding: '10px 12px', color: '#6b7a99' }}>{server.owner || '-'}</td>
                    if (col.key === 'actions') return <td key={col.key} style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={e => handleEdit(server, e)} style={{ fontSize: 12, padding: '3px 10px', border: '1px solid #0052d9', color: '#0052d9', background: 'transparent', borderRadius: 4, cursor: 'pointer' }}>编辑</button>
                        <button onClick={e => handleDelete(server.id, e)} style={{ fontSize: 12, padding: '3px 10px', border: '1px solid #f53f3f', color: '#f53f3f', background: 'transparent', borderRadius: 4, cursor: 'pointer' }}>删除</button>
                      </div>
                    </td>
                    return <td key={col.key} style={{ padding: '10px 12px', color: '#6b7a99' }}>-</td>
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 分页 */}
        <Pagination
          page={page}
          total={total}
          pageSize={pageSize}
          onPageChange={p => updateFilter({ page: p })}
        />
      </div>

      <ServerFormDrawer
        visible={drawerVisible}
        editData={editServer}
        onClose={() => setDrawerVisible(false)}
        onSuccess={() => {
          fetchData()
          setSelectedIds([])
          // 刷新公司过滤下拉
          getCompanies().then(r => setCompanies(r.data)).catch(() => {})
        }}
      />

      {/* 导入资产弹窗 */}
      {importVisible && (
        <>
          <div onClick={() => { setImportVisible(false); setImportResult(null) }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 999 }} />
          <div style={{
            position: 'fixed', top: '25%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#fff', borderRadius: 10, padding: '28px 32px',
            width: 520, zIndex: 1000, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>导入资产</span>
              <button onClick={() => { setImportVisible(false); setImportResult(null); setBatchImportResult(null) }}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 22, color: '#9da5b4', lineHeight: 1 }}>×</button>
            </div>

            {/* 导入模式选择 */}
            <div style={{ marginBottom: 16, display: 'flex', gap: '12px' }}>
              <button
                onClick={() => { setImportMode('single'); setImportResult(null); setBatchImportResult(null) }}
                style={{
                  padding: '8px 16px',
                  border: `1px solid ${importMode === 'single' ? '#0052d9' : '#dce1ea'}`,
                  background: importMode === 'single' ? '#e8f2ff' : '#fff',
                  color: importMode === 'single' ? '#0052d9' : '#1a2438',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: importMode === 'single' ? '500' : '400'
                }}
              >
                单文件导入
              </button>
              <button
                onClick={() => { setImportMode('batch'); setImportResult(null); setBatchImportResult(null) }}
                style={{
                  padding: '8px 16px',
                  border: `1px solid ${importMode === 'batch' ? '#0052d9' : '#dce1ea'}`,
                  background: importMode === 'batch' ? '#e8f2ff' : '#fff',
                  color: importMode === 'batch' ? '#0052d9' : '#1a2438',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: importMode === 'batch' ? '500' : '400'
                }}
              >
                批量导入（多选文件）
              </button>
            </div>

            {/* 文件选择 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontSize: 13, color: '#6b7a99' }}>
                {importMode === 'single' ? '请选择 SeverCollect.txt 格式的文件：' : '请选择多个 SeverCollect.txt 格式的文件（可多选）：'}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                multiple={importMode === 'batch'}
                onChange={handleFileChange}
                disabled={importLoading}
                style={{ fontSize: 13 }}
              />
              {importMode === 'batch' && (
                <div style={{ marginTop: 4, fontSize: 12, color: '#86909c' }}>
                  按住 Ctrl (Windows) 或 Command (Mac) 键可多选文件
                </div>
              )}
            </div>

            {/* 加载状态 */}
            {importLoading && (
              <div style={{ color: '#6b7a99', fontSize: 13, padding: '8px 0' }}>
                {importMode === 'single' ? '正在导入...' : '正在批量导入...'}
              </div>
            )}

            {/* 单文件导入结果 */}
            {importResult && !importLoading && importMode === 'single' && (
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

            {/* 批量导入结果 */}
            {batchImportResult && !importLoading && importMode === 'batch' && (
              <div style={{ marginTop: 16, padding: '16px', background: '#f7f8fa', borderRadius: 8, fontSize: 13, maxHeight: '400px', overflowY: 'auto' }}>
                <div style={{ marginBottom: 12, fontWeight: 500, color: '#1a2438' }}>批量导入完成</div>
                
                {/* 汇总统计 */}
                <div style={{ marginBottom: 16, padding: '12px', background: '#fff', borderRadius: '6px', border: '1px solid #e8f2ff' }}>
                  <div style={{ fontWeight: 500, marginBottom: 6 }}>📊 汇总统计</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '12px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#86909c' }}>文件总数</div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{batchImportResult.summary.totalFiles}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#86909c' }}>成功文件</div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: '#00b42a' }}>{batchImportResult.summary.successFiles}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#86909c' }}>总服务器数</div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{batchImportResult.summary.totalServers}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#86909c' }}>新建服务器</div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: '#00b42a' }}>{batchImportResult.summary.totalCreated}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#86909c' }}>更新服务器</div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: '#0052d9' }}>{batchImportResult.summary.totalUpdated}</div>
                    </div>
                  </div>
                </div>

                {/* 文件详情 */}
                <div style={{ marginBottom: 12, fontWeight: 500, color: '#1a2438' }}>📋 文件详情</div>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                  {batchImportResult.files.map((file, index) => (
                    <div key={index} style={{ 
                      padding: '10px 12px', 
                      borderBottom: index < batchImportResult.files.length - 1 ? '1px solid #f0f2f5' : 'none',
                      background: file.success ? '#f6ffed' : '#fff2f0'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: file.success ? '#52c41a' : '#ff4d4f',
                          marginRight: '8px'
                        }} />
                        <div style={{ fontWeight: 500, fontSize: '12px' }}>{file.filename}</div>
                      </div>
                      {file.success && file.result && (
                        <div style={{ marginLeft: '16px', fontSize: '11px', color: '#86909c' }}>
                          <span>新建: {file.result.created}</span>
                          <span style={{ marginLeft: '8px' }}>更新: {file.result.updated}</span>
                          {file.result.skipped > 0 && (
                            <span style={{ marginLeft: '8px' }}>跳过: {file.result.skipped}</span>
                          )}
                          {file.result.errors.length > 0 && (
                            <div style={{ marginTop: '4px', color: '#ff4d4f' }}>
                              错误: {file.result.errors[0]}
                              {file.result.errors.length > 1 && ` (+${file.result.errors.length - 1} 条)`}
                            </div>
                          )}
                        </div>
                      )}
                      {!file.success && file.error && (
                        <div style={{ marginLeft: '16px', fontSize: '11px', color: '#ff4d4f' }}>
                          错误: {file.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleImportSuccess}
                  style={{ 
                    marginTop: 16, 
                    padding: '8px 24px', 
                    background: '#0052d9', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: '5px', 
                    cursor: 'pointer', 
                    fontSize: '13px',
                    display: 'block',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                  }}
                >
                  关闭
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* 批量编辑弹窗 */}
      {batchEditVisible && (
        <>
          <div onClick={() => setBatchEditVisible(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 999 }} />
          <div style={{
            position: 'fixed', top: '25%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#fff', borderRadius: 10, padding: '28px 32px',
            width: 440, zIndex: 1000, boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 15 }}>批量编辑</span>
                <span style={{ fontSize: 12, color: '#9da5b4', marginLeft: 8 }}>
                  已选择 {selectedIds.length} 台服务器
                </span>
              </div>
              <button onClick={() => setBatchEditVisible(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 22, color: '#9da5b4', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ fontSize: 12, color: '#6b7a99', marginBottom: 16 }}>
              选择要修改的字段并填写新值，留空则不修改该字段
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* 状态 */}
              <div>
                <div style={{ fontSize: 12, color: '#6b7a99', marginBottom: 4 }}>状态</div>
                <select
                  value={batchEditForm.status}
                  onChange={e => setBatchEditForm(p => ({ ...p, status: e.target.value }))}
                  style={{ padding: '7px 10px', border: '1px solid #dde3ee', borderRadius: 5, fontSize: 13, width: '100%', outline: 'none' }}
                >
                  <option value="">不修改</option>
                  <option value="running">运行中</option>
                  <option value="offline">已下线</option>
                  <option value="maintenance">维护中</option>
                </select>
              </div>

              {/* 机房 */}
              <div>
                <div style={{ fontSize: 12, color: '#6b7a99', marginBottom: 4 }}>机房</div>
                <input
                  value={batchEditForm.datacenter}
                  onChange={e => setBatchEditForm(p => ({ ...p, datacenter: e.target.value }))}
                  placeholder="填写新机房名称"
                  style={{ padding: '7px 10px', border: '1px solid #dde3ee', borderRadius: 5, fontSize: 13, width: '100%', outline: 'none' }}
                />
              </div>

              {/* 资产归属 */}
              <div>
                <div style={{ fontSize: 12, color: '#6b7a99', marginBottom: 4 }}>资产归属</div>
                <input
                  value={batchEditForm.owner}
                  onChange={e => setBatchEditForm(p => ({ ...p, owner: e.target.value }))}
                  placeholder="填写新的资产归属"
                  style={{ padding: '7px 10px', border: '1px solid #dde3ee', borderRadius: 5, fontSize: 13, width: '100%', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => setBatchEditVisible(false)}
                style={{ padding: '6px 16px', border: '1px solid #dde3ee', borderRadius: 5, background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                取消
              </button>
              <button onClick={handleBatchEdit} disabled={batchEditLoading}
                style={{ padding: '6px 16px', background: batchEditLoading ? '#9da5b4' : '#0052d9', color: '#fff', border: 'none', borderRadius: 5, cursor: batchEditLoading ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                确认修改
              </button>
            </div>
          </div>
        </>
      )}

      {/* 确认对话框 */}
      <ConfirmDialog
        visible={confirmDialog.visible}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, visible: false }))}
        danger={confirmDialog.danger}
      />

      {/* 批量操作进度对话框 */}
      <BatchProgressDialog
        visible={batchProgress.visible}
        title={batchProgress.title}
        current={batchProgress.current}
        total={batchProgress.total}
        successCount={batchProgress.successCount}
        failCount={batchProgress.failCount}
        failReason={batchProgress.failReason}
        onCancel={() => setBatchProgress(prev => ({ ...prev, visible: false }))}
      />
    </div>
  )
}

export default ServerListPage
