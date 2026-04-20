import React from 'react'
import { colors } from '../theme'

interface PaginationProps {
  page: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  label?: string
}

const Pagination: React.FC<PaginationProps> = ({
  page, total, pageSize, onPageChange, label
}) => {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  const displayLabel = label ?? `共 ${total} 条记录`

  const buildPages = () =>
    Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
      .reduce<(number | string)[]>((acc, p, idx, arr) => {
        if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...')
        acc.push(p)
        return acc
      }, [])

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 20px', borderTop: '1px solid #f2f3f5',
      fontSize: 13, color: '#9da5b4',
    }}>
      <span>{displayLabel}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          style={{
            padding: '5px 12px', border: '1px solid #dde3ee', borderRadius: 4,
            background: '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer',
            fontSize: 13, color: page <= 1 ? '#c2c7d0' : colors.primary,
          }}
        >
          上一页
        </button>
        {buildPages().map((p, idx) =>
          p === '...' ? (
            <span key={`ellipsis-${idx}`} style={{ padding: '5px 8px', color: '#9da5b4' }}>···</span>
          ) : (
            <button
              key={idx}
              onClick={() => onPageChange(p as number)}
              style={{
                padding: '5px 10px', border: '1px solid',
                borderRadius: 4, cursor: 'pointer', fontSize: 13,
                background: page === p ? colors.primary : '#fff',
                color: page === p ? '#fff' : '#1a2438',
                borderColor: page === p ? colors.primary : '#dde3ee',
              }}
            >
              {p}
            </button>
          )
        )}
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          style={{
            padding: '5px 12px', border: '1px solid #dde3ee', borderRadius: 4,
            background: '#fff', cursor: page >= totalPages ? 'not-allowed' : 'pointer',
            fontSize: 13, color: page >= totalPages ? '#c2c7d0' : colors.primary,
          }}
        >
          下一页
        </button>
      </div>
    </div>
  )
}

export default Pagination
