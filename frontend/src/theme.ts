/**
 * 设计令牌和公共样式常量
 * 统一管理颜色、输入框、按钮等通用样式，消除各组件中的重复定义
 */

// ─── 颜色系统 ──────────────────────────────────────────────
export const colors = {
  primary:     '#10B981',
  primaryHover: '#059669',
  primaryBg:   'rgba(16, 185, 129, 0.1)',
  success:     '#10B981',
  successBg:   'rgba(16, 185, 129, 0.1)',
  danger:      '#EF4444',
  dangerBg:    'rgba(239, 68, 68, 0.1)',
  warning:     '#F59E0B',
  warningBg:   'rgba(245, 158, 11, 0.1)',
  purple:      '#8B5CF6',
  purpleBg:    'rgba(139, 92, 246, 0.1)',
  teal:        '#14B8A6',
  tealBg:      'rgba(20, 184, 166, 0.1)',

  text:        '#1a1a2e',
  textSecondary: '#4A5568',
  textMuted:   '#718096',
  textDisabled: '#A0AEC0',

  border:      '#d9dde3',
  borderLight: '#e8eaed',
  borderLighter: '#f0f1f3',

  bg:          'rgba(255, 255, 255, 0.7)',
  bgWhite:     '#ffffff',

  // 侧边栏渐变色（绿色玻璃风格）
  sidebarStart: 'rgba(5, 46, 36, 0.92)',
  sidebarEnd:   'rgba(6, 78, 59, 0.95)',
}

// ─── 输入框 ────────────────────────────────────────────────
export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  fontSize: 13,
  outline: 'none',
  background: colors.bgWhite,
  color: colors.text,
  transition: 'all 0.15s ease',
}

/** 文本域扩展样式 */
export const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: 'vertical' as const,
  minHeight: 64,
}

// ─── 标签 ──────────────────────────────────────────────────
export const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: colors.textSecondary,
  marginBottom: 4,
  display: 'block',
}

// ─── 按钮 ──────────────────────────────────────────────────
export const btnPrimary: React.CSSProperties = {
  padding: '8px 16px',
  background: colors.primary,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
}

export const btnSecondary: React.CSSProperties = {
  padding: '8px 16px',
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  background: colors.bgWhite,
  cursor: 'pointer',
  fontSize: 13,
  color: colors.text,
}

export const btnOutlinePrimary: React.CSSProperties = {
  fontSize: 12,
  padding: '6px 12px',
  borderRadius: 6,
  border: `1px solid ${colors.primary}`,
  color: colors.primary,
  background: 'transparent',
  cursor: 'pointer',
}

export const btnOutlineDanger: React.CSSProperties = {
  fontSize: 12,
  padding: '6px 12px',
  borderRadius: 6,
  border: `1px solid ${colors.danger}`,
  color: colors.danger,
  background: 'transparent',
  cursor: 'pointer',
}

export const btnSmall: React.CSSProperties = {
  fontSize: 12,
  padding: '5px 10px',
  border: `1px solid ${colors.primary}`,
  color: colors.primary,
  background: 'transparent',
  borderRadius: 6,
  cursor: 'pointer',
}

export const btnSmallDanger: React.CSSProperties = {
  ...btnSmall,
  borderColor: colors.danger,
  color: colors.danger,
}

// ─── 卡片 ──────────────────────────────────────────────────
export const cardStyle: React.CSSProperties = {
  background: colors.bgWhite,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: 12,
  overflow: 'hidden',
}

// ─── 状态颜色映射 ──────────────────────────────────────────
export const statusColors: Record<string, string> = {
  running: colors.success,
  offline: colors.danger,
  maintenance: colors.warning,
}

export const statusLabels: Record<string, string> = {
  running: '运行中',
  offline: '已下线',
  maintenance: '维护中',
}
