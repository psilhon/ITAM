import React from 'react'
import { colors } from '../theme'

interface BatchProgressDialogProps {
  visible: boolean
  title: string
  current: number
  total: number
  successCount: number
  failCount: number
  failReason?: string
  onCancel: () => void
}

const BatchProgressDialog: React.FC<BatchProgressDialogProps> = ({
  visible,
  title,
  current,
  total,
  successCount,
  failCount,
  failReason,
  onCancel,
}) => {
  if (!visible) return null

  const progress = total > 0 ? (current / total) * 100 : 0
  const isComplete = current >= total

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.45)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const dialogStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 14,
    padding: '24px 28px',
    width: 440,
    maxWidth: '90vw',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2)',
  }

  const titleStyle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 600,
    color: colors.text,
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }

  const progressBarContainerStyle: React.CSSProperties = {
    height: 8,
    background: '#f0f2f5',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  }

  const progressBarStyle: React.CSSProperties = {
    height: '100%',
    width: `${progress}%`,
    background: isComplete ? (failCount === 0 ? colors.success : colors.warning) : colors.primary,
    borderRadius: 4,
    transition: 'width 0.3s ease-out',
  }

  const statsStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    fontSize: 13,
    marginBottom: 20,
  }

  const statRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }

  const failReasonStyle: React.CSSProperties = {
    padding: '10px 12px',
    background: colors.dangerBg,
    borderRadius: 6,
    fontSize: 12,
    color: colors.danger,
    marginBottom: 16,
    maxHeight: 60,
    overflow: 'auto',
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

  const closeBtnStyle: React.CSSProperties = {
    padding: '8px 18px',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    background: failCount > 0 ? colors.warning : colors.success,
    color: '#fff',
  }

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
      <div style={overlayStyle}>
        <div style={dialogStyle}>
          <div style={titleStyle}>
            {!isComplete && (
              <svg
                style={{ animation: 'pulse 1s infinite' }}
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.primary}
                strokeWidth="2"
                width="20"
                height="20"
              >
                <path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-5.07l-2.83 2.83M9.76 14.24l-2.83 2.83m0-10.14l2.83 2.83m4.48 4.48l2.83 2.83" strokeLinecap="round" />
              </svg>
            )}
            {isComplete && (
              <svg viewBox="0 0 24 24" fill="none" stroke={failCount > 0 ? colors.warning : colors.success} strokeWidth="2" width="20" height="20">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {title}
          </div>

          {/* 进度条 */}
          <div style={progressBarContainerStyle}>
            <div style={progressBarStyle} />
          </div>

          {/* 进度文字 */}
          <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16, textAlign: 'center' }}>
            {current} / {total}
          </div>

          {/* 统计 */}
          <div style={statsStyle}>
            <div style={statRowStyle}>
              <span style={{ color: colors.success }}>✓ 成功</span>
              <span style={{ fontWeight: 600, color: colors.text }}>{successCount} 台</span>
            </div>
            <div style={statRowStyle}>
              <span style={{ color: colors.danger }}>✗ 失败</span>
              <span style={{ fontWeight: 600, color: colors.text }}>{failCount} 台</span>
            </div>
            {failCount > 0 && (
              <div style={{ ...statRowStyle, color: colors.textMuted, fontSize: 12 }}>
                <span>剩余</span>
                <span>{total - current} 台</span>
              </div>
            )}
          </div>

          {/* 失败原因 */}
          {failReason && (
            <div style={failReasonStyle}>
              {failReason}
            </div>
          )}

          {/* 按钮 */}
          <div style={buttonContainerStyle}>
            {!isComplete && (
              <button style={cancelBtnStyle} onClick={onCancel}>
                取消
              </button>
            )}
            {isComplete && (
              <button style={closeBtnStyle} onClick={onCancel}>
                完成
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default BatchProgressDialog