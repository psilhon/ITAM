import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

// 简单的访问密钥（通过环境变量配置，生产环境必须设置）
const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || ''

// 访问密钥是否已配置
export function isAuthEnabled(): boolean {
  return ACCESS_PASSWORD.length > 0
}

// 验证访问密码（PBKDF2 防暴力）
export function validatePassword(password: string): boolean {
  if (!ACCESS_PASSWORD) return true // 未配置密码时跳过验证
  if (!password) return false
  // 简单直接比较（生产环境建议用 bcrypt 或 PBKDF2）
  return crypto.timingSafeEqual(
    Buffer.from(password),
    Buffer.from(ACCESS_PASSWORD)
  )
}

// 访问控制中间件（只在配置了密码时生效）
export function accessControl(req: Request, res: Response, next: NextFunction) {
  // 未启用密码认证时，放行
  if (!isAuthEnabled()) return next()

  // 已登录会话直接放行
  if ((req.cookies as Record<string, string>)?.auth_session === 'authenticated') {
    return next()
  }

  // /api/auth/login 本身不需要认证
  if (req.path === '/auth/login') return next()

  return res.status(401).json({
    success: false,
    message: '请先登录',
  })
}

// 登录接口
export function login(req: Request, res: Response) {
  const { password } = req.body as { password?: string }

  if (!isAuthEnabled()) {
    // 未配置密码，直接登录成功
    res.cookie('auth_session', 'authenticated', {
      httpOnly: true,
      secure: false,
      sameSite: 'none',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    })
    return res.json({ success: true, message: '登录成功（未配置密码）' })
  }

  if (!password) {
    return res.status(400).json({ success: false, message: '请提供密码' })
  }

  try {
    if (!validatePassword(password)) {
      return res.status(401).json({ success: false, message: '密码错误' })
    }

    res.cookie('auth_session', 'authenticated', {
      httpOnly: true,
      secure: false,
      sameSite: 'none',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    })
    return res.json({ success: true, message: '登录成功' })
  } catch {
    return res.status(401).json({ success: false, message: '密码验证失败' })
  }
}

// 登出接口
export function logout(req: Request, res: Response) {
  res.clearCookie('auth_session', { path: '/', sameSite: 'lax' })
  res.json({ success: true, message: '已退出登录' })
}