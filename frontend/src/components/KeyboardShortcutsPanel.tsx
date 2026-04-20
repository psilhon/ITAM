import React, { useState, useEffect } from 'react'
import { colors } from '../theme'

interface ShortcutItem {
  key: string
  description: string
  category: 'global' | 'list' | 'detail'
}

const SHORTCUTS: ShortcutItem[] = [
  // 全局
  { key: '?', description: '打开快捷键帮助', category: 'global' },
  { key: '/', description: '聚焦搜索框', category: 'global' },
  { key: 'Esc', description: '取消当前操作', category: 'global' },
  // 列表页
  { key: 'N', description: '新增服务器', category: 'list' },
  { key: 'E', description: '批量编辑选中项', category: 'list' },
  { key: 'Delete', description: '删除选中项', category: 'list' },
  { key: 'Ctrl+A', description: '全选', category: 'list' },
  // 详情页
  { key: 'Enter', description: '保存当前字段', category: 'detail' },
  { key: 'Esc', description: '取消编辑', category: 'detail' },
  { key: 'Tab', description: '下一个字段', category: 'detail' },
  { key: 'Shift+Tab', description: '上一个字段', category: 'detail' },
]

interface KeyboardShortcutsPanelProps {
  visible: boolean
  onClose: () => void
}

const KeyboardShortcutsPanel: React.FC<KeyboardShortcutsPanelProps> = ({ visible, onClose }) => {
  if (!visible) return null

  const globalShortcuts = SHORTCUTS.filter(s => s.category === 'global')
  const listShortcuts = SHORTCUTS.filter(s => s.category === 'list')
  const detailShortcuts = SHORTCUTS.filter(s => s.category === 'detail')

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.4)',
    zIndex: 9998,
  }

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#fff',
    borderRadius: 14,
    padding: '24px 28px',
    width: 360,
    maxWidth: '90vw',
    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.2)',
    zIndex: 9999,
    animation: 'scaleIn 0.15s ease-out',
  }

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  }

  const titleStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 600,
    color: colors.text,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }

  const closeBtnStyle: React.CSSProperties = {
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: 6,
    color: colors.textMuted,
  }

  const categoryStyle: React.CSSProperties = {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: 8,
    marginTop: 16,
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #f2f3f5',
  }

  const keyStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 28,
    height: 24,
    padding: '0 8px',
    background: '#f7f8fa',
    border: '1px solid #e5e8f0',
    borderRadius: 5,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: 'monospace',
    color: colors.text,
  }

  const descStyle: React.CSSProperties = {
    fontSize: 13,
    color: colors.textSecondary,
  }

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (visible) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [visible, onClose])

  return (
    <>
      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
      <div style={overlayStyle} onClick={onClose} />
      <div style={panelStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={titleStyle}>
            <svg viewBox="0 0 24 24" fill="none" stroke={colors.text} strokeWidth="2" width="20" height="20">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M6 16h12" strokeLinecap="round" />
            </svg>
            键盘快捷键
          </div>
          <button style={closeBtnStyle} onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div style={categoryStyle}>全局</div>
        {globalShortcuts.map(s => (
          <div key={s.key} style={rowStyle}>
            <span style={descStyle}>{s.description}</span>
            <span style={keyStyle}>{s.key}</span>
          </div>
        ))}

        <div style={categoryStyle}>主机设备</div>
        {listShortcuts.map(s => (
          <div key={s.key} style={rowStyle}>
            <span style={descStyle}>{s.description}</span>
            <span style={keyStyle}>{s.key}</span>
          </div>
        ))}

        <div style={categoryStyle}>服务器详情</div>
        {detailShortcuts.map(s => (
          <div key={s.key} style={rowStyle}>
            <span style={descStyle}>{s.description}</span>
            <span style={keyStyle}>{s.key}</span>
          </div>
        ))}
      </div>
    </>
  )
}

// 首次使用提示气泡
interface FirstTimeHintProps {
  message: string
  onDismiss: () => void
}

export const FirstTimeHint: React.FC<FirstTimeHintProps> = ({ message, onDismiss }) => {
  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      background: colors.text,
      color: '#fff',
      padding: '10px 16px',
      borderRadius: 8,
      fontSize: 13,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      zIndex: 9999,
      animation: 'slideUp 0.25s ease-out',
    }}>
      <span>💡</span>
      <span>{message}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.6)',
          cursor: 'pointer',
          padding: '4px',
          fontSize: 16,
          lineHeight: 1,
        }}
      >
        ×
      </button>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}

// 快捷键 hook
export const useKeyboardShortcuts = (
  shortcuts: { key: string; ctrl?: boolean; handler: () => void }[],
  enabled: boolean = true
) => {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略输入框中的快捷键
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true
        if (e.key === shortcut.key && ctrlMatch) {
          e.preventDefault()
          shortcut.handler()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, enabled])
}

export default KeyboardShortcutsPanel