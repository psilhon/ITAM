import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { colors } from '../theme'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  persistent?: boolean
  undoAction?: () => void
}

interface ToastContextValue {
  toasts: Toast[]
  success: (message: string, options?: { persistent?: boolean; undoAction?: () => void }) => string
  error: (message: string, options?: { persistent?: boolean; undoAction?: () => void }) => string
  warning: (message: string, options?: { persistent?: boolean; undoAction?: () => void }) => string
  info: (message: string, options?: { persistent?: boolean; undoAction?: () => void }) => string
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastId = 0

// 全局 Toast 服务（可在 React 组件外调用）
class ToastService {
  private listeners: Array<(toast: Toast) => void> = []

  addListener(listener: (toast: Toast) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  success(message: string, options?: { persistent?: boolean; undoAction?: () => void }) {
    const id = `toast-${++toastId}`
    const toast: Toast = { id, type: 'success', message, ...options }
    this.notify(toast, options?.persistent)
    return id
  }

  error(message: string, options?: { persistent?: boolean; undoAction?: () => void }) {
    const id = `toast-${++toastId}`
    const toast: Toast = { id, type: 'error', message, ...options }
    this.notify(toast, options?.persistent)
    return id
  }

  warning(message: string, options?: { persistent?: boolean; undoAction?: () => void }) {
    const id = `toast-${++toastId}`
    const toast: Toast = { id, type: 'warning', message, ...options }
    this.notify(toast, options?.persistent)
    return id
  }

  info(message: string, options?: { persistent?: boolean; undoAction?: () => void }) {
    const id = `toast-${++toastId}`
    const toast: Toast = { id, type: 'info', message, ...options }
    this.notify(toast, options?.persistent)
    return id
  }

  private notify(toast: Toast, persistent?: boolean) {
    this.listeners.forEach(listener => listener(toast))
    if (!persistent) {
      setTimeout(() => {
        this.listeners.forEach(listener => listener({ ...toast, id: `${toast.id}-remove` } as Toast))
      }, 3000)
    }
  }
}

export const toastService = new ToastService()

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // 订阅全局 toast 服务
  useEffect(() => {
    const removeListener = toastService.addListener((toast) => {
      if (toast.id.endsWith('-remove')) {
        // 移除 toast
        const realId = toast.id.replace('-remove', '')
        const timer = timersRef.current.get(realId)
        if (timer) {
          clearTimeout(timer)
          timersRef.current.delete(realId)
        }
        setToasts(prev => prev.filter(t => t.id !== realId))
      } else {
        // 添加 toast
        // 检查是否已存在相同 id
        setToasts(prev => {
          if (prev.some(t => t.id === toast.id)) return prev
          return [...prev, toast]
        })
        // 非持久性 toast 3秒后自动消失
        if (!toast.persistent) {
          const timer = setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== toast.id))
          }, 3000)
          timersRef.current.set(toast.id, timer)
        }
      }
    })
    return removeListener
  }, [])

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const success = useCallback((message: string, options?: { persistent?: boolean; undoAction?: () => void }) => {
    return toastService.success(message, options)
  }, [])

  const error = useCallback((message: string, options?: { persistent?: boolean; undoAction?: () => void }) => {
    return toastService.error(message, options)
  }, [])

  const warning = useCallback((message: string, options?: { persistent?: boolean; undoAction?: () => void }) => {
    return toastService.warning(message, options)
  }, [])

  const info = useCallback((message: string, options?: { persistent?: boolean; undoAction?: () => void }) => {
    return toastService.info(message, options)
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, success, error, warning, info, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    // 如果不在 provider 内，使用全局服务
    return {
      success: (message: string, options?: { persistent?: boolean; undoAction?: () => void }) =>
        toastService.success(message, options),
      error: (message: string, options?: { persistent?: boolean; undoAction?: () => void }) =>
        toastService.error(message, options),
      warning: (message: string, options?: { persistent?: boolean; undoAction?: () => void }) =>
        toastService.warning(message, options),
      info: (message: string, options?: { persistent?: boolean; undoAction?: () => void }) =>
        toastService.info(message, options),
      removeToast: () => {},
      toasts: [],
    }
  }
  return context
}

// Toast 图标 SVG
const ToastIcon: React.FC<{ type: ToastType }> = ({ type }) => {
  const iconStyle: React.CSSProperties = { width: 18, height: 18, flexShrink: 0 }

  switch (type) {
    case 'success':
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2.5">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'error':
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke={colors.danger} strokeWidth="2.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" strokeLinecap="round" />
          <line x1="9" y1="9" x2="15" y2="15" strokeLinecap="round" />
        </svg>
      )
    case 'warning':
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke={colors.warning} strokeWidth="2.5">
          <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    case 'info':
      return (
        <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke={colors.purple} strokeWidth="2.5">
          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
  }
}

// Toast 条目组件
const ToastItem: React.FC<{ toast: Toast; onClose: () => void }> = ({ toast, onClose }) => {
  const bgColors: Record<ToastType, string> = {
    success: colors.successBg,
    error: colors.dangerBg,
    warning: colors.warningBg,
    info: colors.purpleBg,
  }

  const borderColors: Record<ToastType, string> = {
    success: colors.success,
    error: colors.danger,
    warning: colors.warning,
    info: colors.purple,
  }

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 16px',
    background: bgColors[toast.type],
    border: `1px solid ${borderColors[toast.type]}30`,
    borderLeft: `3px solid ${borderColors[toast.type]}`,
    borderRadius: 10,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
    minWidth: 280,
    maxWidth: 400,
    backdropFilter: 'blur(10px)',
  }

  const messageStyle: React.CSSProperties = {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 1.5,
  }

  const handleUndo = () => {
    if (toast.undoAction) {
      toast.undoAction()
      onClose()
    }
  }

  return (
    <div style={itemStyle}>
      <ToastIcon type={toast.type} />
      <span style={messageStyle}>{toast.message}</span>
      {toast.undoAction && (
        <button
          onClick={handleUndo}
          style={{
            padding: '4px 10px',
            background: borderColors[toast.type],
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          撤销
        </button>
      )}
      <button
        onClick={onClose}
        style={{
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          color: colors.textMuted,
          padding: 0,
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
          <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

// 全局 Toast 容器组件
export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast()

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 20,
    right: 20,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    pointerEvents: 'none',
  }

  const itemStyle: React.CSSProperties = {
    pointerEvents: 'auto',
    animation: 'toastSlideIn 0.25s ease-out',
  }

  return (
    <>
      <style>{`
        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
      <div style={containerStyle}>
        {toasts.map(toast => (
          <div key={toast.id} style={itemStyle}>
            <ToastItem toast={toast} onClose={() => removeToast(toast.id)} />
          </div>
        ))}
      </div>
    </>
  )
}

export default ToastProvider