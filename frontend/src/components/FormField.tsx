import React from 'react'
import { inputStyle, labelStyle } from '../theme'

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
  style?: React.CSSProperties
}

/**
 * 统一表单字段组件
 * 封装：标签 + 输入控件 + 错误提示
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  error,
  children,
  style,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', ...style }}>
    <label style={labelStyle}>
      {label}
      {required && <span style={{ color: '#f53f3f', marginLeft: 2 }}>*</span>}
    </label>
    {children}
    {error && (
      <span style={{ fontSize: 11, color: '#f53f3f', marginTop: 3 }}>{error}</span>
    )}
  </div>
)

/**
 * 统一文本输入 + 错误提示
 */
export const FormInput: React.FC<{
  value: string
  onChange: (val: string) => void
  placeholder?: string
  type?: string
  error?: string
  style?: React.CSSProperties
  disabled?: boolean
}> = ({ value, onChange, placeholder, type = 'text', error, style, disabled }) => (
  <div>
    <input
      style={{
        ...inputStyle,
        borderColor: error ? '#f53f3f' : undefined,
        ...style,
      }}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      disabled={disabled}
    />
    {error && <span style={{ fontSize: 11, color: '#f53f3f', marginTop: 3 }}>{error}</span>}
  </div>
)

/**
 * 统一下拉选择 + 错误提示
 */
export const FormSelect: React.FC<{
  value: string
  onChange: (val: string) => void
  options: Array<{ value: string; label: string }>
  error?: string
  style?: React.CSSProperties
  placeholder?: string
}> = ({ value, onChange, options, error, style, placeholder }) => (
  <div>
    <select
      style={{
        ...inputStyle,
        borderColor: error ? '#f53f3f' : undefined,
        ...style,
      }}
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <span style={{ fontSize: 11, color: '#f53f3f', marginTop: 3 }}>{error}</span>}
  </div>
)

/**
 * 统一多行文本 + 错误提示
 */
export const FormTextarea: React.FC<{
  value: string
  onChange: (val: string) => void
  placeholder?: string
  error?: string
  style?: React.CSSProperties
  rows?: number
}> = ({ value, onChange, placeholder, error, style, rows = 3 }) => (
  <div>
    <textarea
      style={{
        ...inputStyle,
        resize: 'vertical',
        minHeight: 64,
        borderColor: error ? '#f53f3f' : undefined,
        ...style,
      }}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
    />
    {error && <span style={{ fontSize: 11, color: '#f53f3f', marginTop: 3 }}>{error}</span>}
  </div>
)
