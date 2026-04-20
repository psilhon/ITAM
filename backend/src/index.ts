import express, { RequestHandler } from 'express'
import cors from 'cors'
import morgan from 'morgan'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import cookieParser from 'cookie-parser'
import path from 'path'
import https from 'https'
import http from 'http'
import fs from 'fs'
// v1 API 路由
import v1Routes from './routes/v1'
// 向后兼容的旧路由（逐步迁移到v1）
import serverRoutes from './routes/servers'
import networkRoutes from './routes/networks'
import applicationRoutes from './routes/applications'

import statsRoutes from './routes/stats'

import { auditMiddleware, getAuditLogs } from './middleware/audit'
import { globalErrorHandler } from './middleware/errorHandler'
import { versionMiddleware } from './middleware/version'
import { requestIdMiddleware } from './middleware/requestId'
import { info, error as logError } from './logger'
import { accessControl, login, logout, isAuthEnabled } from './middleware/auth'
import prisma from './utils/prisma'

const app = express()
const PORT = parseInt(process.env.PORT || '3001', 10)
const isProduction = process.env.NODE_ENV === 'production'
const HOST = process.env.HOST || '127.0.0.1'

// 应用版本号
export const APP_VERSION = process.env.APP_VERSION || 'v4.5.8'

// ─── 启动时环境变量校验（fail-fast）──────────────────────────────
function validateEnvironment(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error('[ENV] DATABASE_URL is required but not set')
  }
  if (isProduction && isAuthEnabled() && (process.env.ACCESS_PASSWORD?.length ?? 0) < 8) {
    throw new Error('[ENV] ACCESS_PASSWORD must be at least 8 characters in production')
  }
  if (isProduction && !process.env.HOST) {
    logError('[ENV] HOST is not set, defaulting to 127.0.0.1 (this is fine for local production)', undefined)
  }
}
validateEnvironment()

// 安全中间件：设置安全响应头
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // React CSS-in-JS 需要，但已限制为同源
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"], // 禁止嵌入iframe
      baseUri: ["'self'"],
      formAction: ["'self'"],
      objectSrc: ["'none'"], // 禁止插件
      scriptSrcAttr: ["'none'"], // 禁止内联事件处理器
      upgradeInsecureRequests: [], // 自动升级HTTP到HTTPS
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}))

// CORS 配置：支持环境变量 CORS_ORIGINS（逗号分隔）
const corsOrigins = (() => {
  if (process.env.CORS_ORIGINS) {
    return process.env.CORS_ORIGINS.split(',').map(s => s.trim())
  }
  return isProduction
    ? [`https://${HOST}:${PORT}`]
    : ['https://127.0.0.1:5173']
})()

app.use(cors({
  origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-request-id'],
}))

// 压缩响应
app.use(compression())

// 请求日志
app.use(morgan(isProduction ? 'combined' : 'dev'))

// API 限流：防止暴力攻击
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 300, // 每个 IP 限制 300 次请求
  message: { success: false, message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/', limiter)

// 请求体解析（限制大小，防止超大请求）
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
// Cookie 解析
app.use(cookieParser())

// RequestId 中间件（生成/传递请求追踪 ID）
app.use(requestIdMiddleware)

// API 版本控制中间件
app.use('/api', versionMiddleware)

// 审计日志中间件
app.use('/api/', auditMiddleware)



// 健康检查（验证 DB 连接，K8s/负载均衡依赖此判断）
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() })
  } catch {
    res.status(503).json({ status: 'degraded', db: 'disconnected', timestamp: new Date().toISOString() })
  }
})

// 系统版本号（前端动态获取）
app.get('/api/version', (_req, res) => {
  res.json({ success: true, data: APP_VERSION })
})

// 登录/登出接口（无需认证）
app.post('/api/auth/login', login)
app.post('/api/auth/logout', logout)

// API 路由全部需要认证
const authOnly: RequestHandler[] = [accessControl as RequestHandler]

app.use('/api/v1', authOnly, v1Routes)
app.use('/api/servers', authOnly, serverRoutes)
app.use('/api/networks', authOnly, networkRoutes)
app.use('/api/applications', authOnly, applicationRoutes)
app.use('/api/stats', authOnly, statsRoutes)

// 审计日志查询接口（开发环境）
if (!isProduction) {
  app.get('/api/audit-logs', getAuditLogs)
}

// 生产环境：serve 前端静态文件（仅在非 Docker 模式下启用）
// Docker 部署时使用 nginx 服务前端，此处跳过
if (isProduction && process.env.SERVE_STATIC !== 'false') {
  const publicDir = path.resolve(__dirname, 'public')
  app.use(express.static(publicDir, {
    maxAge: '1d', // 1天缓存
    etag: true,
    lastModified: true,
  }))
  // SPA fallback: 非 /api 路径都返回 index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(publicDir, 'index.html'))
  })
}

// 全局错误处理（使用新的错误处理中间件）
app.use(globalErrorHandler)

// ─── 优雅关闭（Graceful Shutdown）──────────────────────────────
let isShuttingDown = false

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return
  isShuttingDown = true

  info(`[Shutdown] Received ${signal}, starting graceful shutdown...`)
  console.log(`\n[Shutdown] 收到 ${signal}，正在优雅关闭...`)

  server.close(async () => {
    info('[Shutdown] HTTP server closed')
    console.log('[Shutdown] HTTP server 已关闭')

    try {
      await prisma.$disconnect()
      info('[Shutdown] Prisma connection pool closed')
      console.log('[Shutdown] Prisma 连接池已关闭')
    } catch (e) {
      logError('[Shutdown] Prisma disconnect error', e as Error)
    }

    process.exit(0)
  })

  // 强制退出（防止事务阻塞导致永远无法关闭）
  setTimeout(() => {
    logError('[Shutdown] Forced exit after timeout', undefined)
    console.error('[Shutdown] 超过关闭超时，强制退出')
    process.exit(1)
  }, 10_000)
}

// HTTPS 配置
const sslDir = path.resolve(__dirname, '../ssl')
const sslKey = path.join(sslDir, 'server.key')
const sslCert = path.join(sslDir, 'server.crt')

let server: https.Server

if (isProduction && fs.existsSync(sslKey) && fs.existsSync(sslCert)) {
  const httpsOptions: https.ServerOptions = {
    key: fs.readFileSync(sslKey),
    cert: fs.readFileSync(sslCert),
  }
  server = https.createServer(httpsOptions, app)
  server.listen(PORT, HOST, () => {
    info('Server started (HTTPS)', { host: HOST, port: PORT, env: process.env.NODE_ENV || 'development' })
    console.log(`🚀 服务器启动成功，监听 ${HOST}:${PORT} (HTTPS)`)
    console.log(`📡 API v1 地址: https://${HOST}:${PORT}/api/v1`)
  })
} else {
  // 开发模式或没有证书时降级为 HTTP（仅用于本地开发）
  server = http.createServer(app) as unknown as https.Server
  server.listen(PORT, HOST, () => {
    info('Server started (HTTP fallback)', { host: HOST, port: PORT, env: process.env.NODE_ENV || 'development' })
    console.log(`🚀 服务器启动成功，监听 ${HOST}:${PORT} (HTTP)`)
    console.log(`📡 API v1 地址: http://${HOST}:${PORT}/api/v1`)
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))  // Ctrl+C

export default app