import React from 'react'
import { colors } from '../theme'

interface ConfirmDialogProps {
  visible: boolean
  title: string
  message: React.ReactNode
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean  // 是否是危险操作（红色确认按钮）
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  danger = false,
}) => {
  if (!visible) return null

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.45)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'fadeIn 0.15s ease-out',
  }

  const dialogStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 14,
    padding: '24px 28px',
    width: 400,
    maxWidth: '90vw',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2)',
    animation: 'scaleIn 0.15s ease-out',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 600,
    color: colors.text,
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }

  const messageStyle: React.CSSProperties = {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 1.6,
    marginBottom: 24,
  }

  const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
  }

  const cancelBtnStyle: React.CSSProperties = {
    padding: '8px 18px',
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    background: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    color: colors.text,
  }

  const confirmBtnStyle: React.CSSProperties = {
    padding: '8px 18px',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    background: danger ? colors.danger : colors.primary,
    color: '#fff',
  }

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div style={overlayStyle} onClick={onCancel}>
        <div style={dialogStyle} onClick={e => e.stopPropagation()}>
          <div style={titleStyle}>
            {danger ? (
              <svg viewBox="0 0 24 24" fill="none" stroke={colors.danger} strokeWidth="2" width="20" height="20">
                <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke={colors.warning} strokeWidth="2" width="20" height="20">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
                <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
              </svg>
            )}
            {title}
          </div>
          <div style={messageStyle}>{message}</div>
          <div style={buttonContainerStyle}>
            <button style={cancelBtnStyle} onClick={onCancel}>
              {cancelText}
            </button>
            <button style={confirmBtnStyle} onClick={onConfirm}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ConfirmDialog