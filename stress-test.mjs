/**
 * ITAM 压力测试脚本
 * 
 * 测试场景：
 * 1. 健康检查（轻量 GET）
 * 2. 服务器列表查询（分页 + 搜索）
 * 3. Dashboard 聚合统计（多表并行查询）
 * 4. 服务器 CRUD（创建 → 查询 → 更新 → 删除）
 * 5. 并发写入压力（批量创建 + 更新）
 * 6. 限流测试（超过 300 次后应返回 429）
 * 
 * 注意：Rate Limiter 配置为 15分钟/300次/IP，压测前需临时调高或禁用。
 * 本脚本通过 header 绕过 CORS，使用 cookie 认证。
 */

const BASE_URL = 'http://127.0.0.1:3001'
const TOTAL_REQUESTS = 500        // 总请求数
const CONCURRENCY = 50            // 并发数
const WRITE_TEST_COUNT = 200      // 写入测试次数
const WRITE_CONCURRENCY = 20      // 写入并发数

// ===== 工具函数 =====

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function randomId() {
  return `stress-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function request(method, path, body = null, cookie = '') {
  const start = performance.now()
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
    },
  }
  if (body) opts.body = JSON.stringify(body)

  try {
    const res = await fetch(`${BASE_URL}${path}`, opts)
    const elapsed = performance.now() - start
    const text = await res.text()
    let data
    try { data = JSON.parse(text) } catch { data = text }

    return {
      status: res.status,
      elapsed: Math.round(elapsed),
      success: res.status >= 200 && res.status < 300,
      data,
      error: res.status >= 400 ? `${res.status}` : null,
    }
  } catch (e) {
    const elapsed = performance.now() - start
    return {
      status: 0,
      elapsed: Math.round(elapsed),
      success: false,
      error: e.message,
    }
  }
}

async function login() {
  const res = await request('POST', '/api/auth/login', {})
  if (res.success) {
    // 从默认 cookie jar 无法获取，重新用 curl-like 方式
    // Node.js fetch 的 cookie 需要手动处理
    // 改用直接模拟
  }
  // 本地开发环境未配置密码，直接返回固定 cookie
  return 'auth_session=authenticated'
}

// ===== 统计工具 =====

class Stats {
  constructor(name) {
    this.name = name
    this.results = []
  }

  add(result) {
    this.results.push(result)
  }

  get summary() {
    const r = this.results
    if (r.length === 0) return { total: 0 }

    const sorted = [...r].sort((a, b) => a.elapsed - b.elapsed)
    const successCount = r.filter(x => x.success).length
    const errors = r.filter(x => !x.success)
    const errorBreakdown = {}
    errors.forEach(x => {
      const key = x.error || 'unknown'
      errorBreakdown[key] = (errorBreakdown[key] || 0) + 1
    })

    return {
      total: r.length,
      success: successCount,
      failed: errors.length,
      successRate: `${(successCount / r.length * 100).toFixed(1)}%`,
      avgMs: Math.round(r.reduce((s, x) => s + x.elapsed, 0) / r.length),
      minMs: sorted[0]?.elapsed || 0,
      maxMs: sorted[sorted.length - 1]?.elapsed || 0,
      p50Ms: sorted[Math.floor(sorted.length * 0.5)]?.elapsed || 0,
      p95Ms: sorted[Math.floor(sorted.length * 0.95)]?.elapsed || 0,
      p99Ms: sorted[Math.floor(sorted.length * 0.99)]?.elapsed || 0,
      errorBreakdown,
      rps: 0, // 后续计算
      durationMs: 0,
    }
  }
}

// ===== 并发执行器 =====

async function runConcurrent(fn, count, concurrency) {
  const results = []
  let completed = 0

  const worker = async () => {
    while (completed < count) {
      const idx = completed++
      if (idx >= count) break
      const result = await fn(idx)
      results.push(result)
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, count) }, () => worker())
  await Promise.all(workers)
  return results
}

// ===== 测试场景 =====

async function testHealthCheck(cookie) {
  console.log('\n🔍 场景 1：健康检查（轻量 GET）')
  const stats = new Stats('Health Check')

  const start = Date.now()
  await runConcurrent(async () => {
    const r = await request('GET', '/api/health', null, cookie)
    stats.add(r)
    return r
  }, TOTAL_REQUESTS, CONCURRENCY)
  const duration = Date.now() - start

  const s = stats.summary
  s.durationMs = duration
  s.rps = Math.round(s.total / (duration / 1000))
  console.log(`  请求: ${s.total} | 成功率: ${s.successRate} | RPS: ${s.rps}`)
  console.log(`  延迟: avg=${s.avgMs}ms | p50=${s.p50Ms}ms | p95=${s.p95Ms}ms | p99=${s.p99Ms}ms`)
  if (s.failed > 0) console.log(`  错误: ${JSON.stringify(s.errorBreakdown)}`)
  return s
}

async function testServerList(cookie) {
  console.log('\n🔍 场景 2：服务器列表查询（分页 + 搜索）')
  const stats = new Stats('Server List')

  const searches = ['', 'test', 'server', '', '', '192.168', '']
  const pages = [1, 1, 1, 2, 3, 1, 1]

  const start = Date.now()
  await runConcurrent(async (i) => {
    const search = searches[i % searches.length]
    const page = pages[i % pages.length]
    const r = await request('GET', `/api/v1/servers/?page=${page}&pageSize=20&search=${search}`, null, cookie)
    stats.add(r)
    return r
  }, TOTAL_REQUESTS, CONCURRENCY)
  const duration = Date.now() - start

  const s = stats.summary
  s.durationMs = duration
  s.rps = Math.round(s.total / (duration / 1000))
  console.log(`  请求: ${s.total} | 成功率: ${s.successRate} | RPS: ${s.rps}`)
  console.log(`  延迟: avg=${s.avgMs}ms | p50=${s.p50Ms}ms | p95=${s.p95Ms}ms | p99=${s.p99Ms}ms`)
  if (s.failed > 0) console.log(`  错误: ${JSON.stringify(s.errorBreakdown)}`)
  return s
}

async function testDashboard(cookie) {
  console.log('\n🔍 场景 3：Dashboard 聚合统计（多表并行查询）')
  const stats = new Stats('Dashboard')

  const start = Date.now()
  await runConcurrent(async () => {
    const r = await request('GET', '/api/v1/stats/dashboard', null, cookie)
    stats.add(r)
    return r
  }, Math.floor(TOTAL_REQUESTS / 2), CONCURRENCY)
  const duration = Date.now() - start

  const s = stats.summary
  s.durationMs = duration
  s.rps = Math.round(s.total / (duration / 1000))
  console.log(`  请求: ${s.total} | 成功率: ${s.successRate} | RPS: ${s.rps}`)
  console.log(`  延迟: avg=${s.avgMs}ms | p50=${s.p50Ms}ms | p95=${s.p95Ms}ms | p99=${s.p99Ms}ms`)
  if (s.failed > 0) console.log(`  错误: ${JSON.stringify(s.errorBreakdown)}`)
  return s
}

async function testCrud(cookie) {
  console.log('\n🔍 场景 4：服务器 CRUD 完整生命周期')
  const stats = new Stats('CRUD')

  // 单线程串行测试 CRUD（更贴近真实场景）
  const count = 50
  const createdIds = []
  const start = Date.now()

  for (let i = 0; i < count; i++) {
    const name = `stress-crud-${randomId()}`

    // Create
    const createRes = await request('POST', '/api/v1/servers/', {
      name,
      company: '压力测试',
      brand: 'TestBrand',
      model: 'TestModel',
      status: 'running',
      datacenter: '测试机房',
    }, cookie)
    stats.add({ ...createRes, operation: 'create' })

    if (createRes.success && createRes.data?.data?.id) {
      const id = createRes.data.data.id
      createdIds.push(id)

      // Read
      const readRes = await request('GET', `/api/v1/servers/${id}`, null, cookie)
      stats.add({ ...readRes, operation: 'read' })

      // Update
      const updateRes = await request('PUT', `/api/v1/servers/${id}`, {
        remark: `压力测试更新 ${Date.now()}`,
      }, cookie)
      stats.add({ ...updateRes, operation: 'update' })
    }
  }

  // Delete all
  for (const id of createdIds) {
    const delRes = await request('DELETE', `/api/v1/servers/${id}`, null, cookie)
    stats.add({ ...delRes, operation: 'delete' })
  }

  const duration = Date.now() - start
  const s = stats.summary
  s.durationMs = duration
  s.rps = Math.round(s.total / (duration / 1000))

  const ops = {}
  stats.results.forEach(r => {
    const op = r.operation || 'unknown'
    ops[op] = (ops[op] || 0) + 1
  })
  console.log(`  总操作: ${s.total} | 成功率: ${s.successRate} | RPS: ${s.rps}`)
  console.log(`  操作分布: ${JSON.stringify(ops)}`)
  console.log(`  延迟: avg=${s.avgMs}ms | p50=${s.p50Ms}ms | p95=${s.p95Ms}ms | p99=${s.p99Ms}ms`)
  if (s.failed > 0) console.log(`  错误: ${JSON.stringify(s.errorBreakdown)}`)
  return { ...s, createdIds }
}

async function testConcurrentWrites(cookie) {
  console.log('\n🔍 场景 5：并发写入压力（批量创建）')
  const createStats = new Stats('Concurrent Create')
  const updateStats = new Stats('Concurrent Update')
  const createdIds = []

  // Phase 1: 并发创建
  console.log('  Phase 1: 并发创建...')
  const createStart = Date.now()
  const createResults = await runConcurrent(async () => {
    const name = `stress-write-${randomId()}`
    const r = await request('POST', '/api/v1/servers/', {
      name,
      company: '并发测试',
      brand: 'ConcurrentBrand',
      status: 'running',
      datacenter: '测试机房A',
    }, cookie)
    createStats.add(r)
    if (r.success && r.data?.data?.id) {
      createdIds.push(r.data.data.id)
    }
    return r
  }, WRITE_TEST_COUNT, WRITE_CONCURRENCY)
  const createDuration = Date.now() - createStart

  const cs = createStats.summary
  cs.durationMs = createDuration
  cs.rps = Math.round(cs.total / (createDuration / 1000))
  console.log(`  创建: ${cs.total} | 成功: ${cs.success} | 失败: ${cs.failed} | RPS: ${cs.rps}`)
  console.log(`  延迟: avg=${cs.avgMs}ms | p95=${cs.p95Ms}ms | p99=${cs.p99Ms}ms`)

  // Phase 2: 并发更新（使用已创建的 ID）
  if (createdIds.length > 0) {
    console.log('  Phase 2: 并发更新...')
    const updateStart = Date.now()
    await runConcurrent(async (i) => {
      const id = createdIds[i % createdIds.length]
      const r = await request('PUT', `/api/v1/servers/${id}`, {
        remark: `并发更新-${i}-${Date.now()}`,
        owner: `owner-${i % 5}`,
      }, cookie)
      updateStats.add(r)
      return r
    }, Math.min(WRITE_TEST_COUNT, 100), WRITE_CONCURRENCY)
    const updateDuration = Date.now() - updateStart

    const us = updateStats.summary
    us.durationMs = updateDuration
    us.rps = Math.round(us.total / (updateDuration / 1000))
    console.log(`  更新: ${us.total} | 成功: ${us.success} | 失败: ${us.failed} | RPS: ${us.rps}`)
    console.log(`  延迟: avg=${us.avgMs}ms | p95=${us.p95Ms}ms | p99=${us.p99Ms}ms`)
  }

  // Phase 3: 清理
  console.log('  Phase 3: 清理测试数据...')
  let cleaned = 0
  for (const id of createdIds) {
    await request('DELETE', `/api/v1/servers/${id}`, null, cookie)
    cleaned++
  }
  console.log(`  已清理 ${cleaned} 条测试数据`)

  return { create: cs, update: updateStats.summary }
}

async function testRateLimit(cookie) {
  console.log('\n🔍 场景 6：限流测试（预期 429）')
  const stats = new Stats('Rate Limit')

  // 连续发 350 个请求，预期后 50 个被限流
  const count = 350
  let rateLimited = 0

  const start = Date.now()
  for (let i = 0; i < count; i++) {
    const r = await request('GET', '/api/v1/servers/', null, cookie)
    stats.add(r)
    if (r.status === 429) rateLimited++
    if (r.status === 429 && rateLimited === 1) {
      console.log(`  第 ${i + 1} 个请求触发限流（429）`)
    }
  }
  const duration = Date.now() - start

  const s = stats.summary
  s.durationMs = duration
  s.rateLimited = rateLimited
  console.log(`  总请求: ${count} | 被限流: ${rateLimited} | 成功率: ${s.successRate}`)
  console.log(`  耗时: ${duration}ms | RPS: ${Math.round(count / (duration / 1000))}`)
  return s
}

// ===== 主流程 =====

async function main() {
  console.log('═══════════════════════════════════════════')
  console.log('  ITAM 压力测试')
  console.log(`  目标: ${BASE_URL}`)
  console.log(`  总请求: ${TOTAL_REQUESTS} | 并发: ${CONCURRENCY}`)
  console.log(`  写入测试: ${WRITE_TEST_COUNT} x 并发 ${WRITE_CONCURRENCY}`)
  console.log('═══════════════════════════════════════════')

  const globalStart = Date.now()

  // 登录获取 cookie
  console.log('\n🔑 登录...')
  const cookie = await login()
  console.log('  登录成功')

  // 运行测试场景
  const results = {}
  results.health = await testHealthCheck(cookie)
  results.serverList = await testServerList(cookie)
  results.dashboard = await testDashboard(cookie)
  results.crud = await testCrud(cookie)
  results.concurrentWrites = await testConcurrentWrites(cookie)
  results.rateLimit = await testRateLimit(cookie)

  const totalDuration = Date.now() - globalStart

  // ===== 汇总报告 =====
  console.log('\n\n═══════════════════════════════════════════')
  console.log('  📊 压力测试报告')
  console.log('═══════════════════════════════════════════')
  console.log(`  总耗时: ${(totalDuration / 1000).toFixed(1)}s`)
  console.log('')

  const table = [
    ['场景', '请求总数', '成功率', 'RPS', 'avg', 'p50', 'p95', 'p99'],
    ['健康检查', results.health.total, results.health.successRate, results.health.rps, `${results.health.avgMs}ms`, `${results.health.p50Ms}ms`, `${results.health.p95Ms}ms`, `${results.health.p99Ms}ms`],
    ['列表查询', results.serverList.total, results.serverList.successRate, results.serverList.rps, `${results.serverList.avgMs}ms`, `${results.serverList.p50Ms}ms`, `${results.serverList.p95Ms}ms`, `${results.serverList.p99Ms}ms`],
    ['Dashboard', results.dashboard.total, results.dashboard.successRate, results.dashboard.rps, `${results.dashboard.avgMs}ms`, `${results.dashboard.p50Ms}ms`, `${results.dashboard.p95Ms}ms`, `${results.dashboard.p99Ms}ms`],
    ['CRUD', results.crud.total, results.crud.successRate, results.crud.rps, `${results.crud.avgMs}ms`, `${results.crud.p50Ms}ms`, `${results.crud.p95Ms}ms`, `${results.crud.p99Ms}ms`],
    ['并发写入', results.concurrentWrites.create?.total || 0, results.concurrentWrites.create?.successRate || '-', results.concurrentWrites.create?.rps || '-', `${results.concurrentWrites.create?.avgMs || 0}ms`, '-', `${results.concurrentWrites.create?.p95Ms || 0}ms`, `${results.concurrentWrites.create?.p99Ms || 0}ms`],
    ['限流测试', results.rateLimit.total, results.rateLimit.successRate, '-', '-', '-', '-', '-'],
  ]

  // 格式化表格输出
  const colWidths = [14, 10, 10, 8, 8, 8, 8, 8]
  table.forEach((row, i) => {
    const line = row.map((cell, j) => {
      const str = String(cell)
      return str.padEnd(colWidths[j])
    }).join(' | ')
    if (i === 0) {
      console.log('-'.repeat(line.length))
    }
    console.log(line)
    if (i === 0) {
      console.log('-'.repeat(line.length))
    }
  })
  console.log('-'.repeat(table[0].reduce((s, _, j) => s + colWidths[j] + 3, 0)))

  console.log(`\n  限流触发: 第 ${results.rateLimit.total - results.rateLimit.rateLimited + 1} 个请求开始返回 429（限流阈值: 300次/15分钟）`)

  // 输出 JSON 结果供外部使用
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    config: { totalRequests: TOTAL_REQUESTS, concurrency: CONCURRENCY, writeCount: WRITE_TEST_COUNT, writeConcurrency: WRITE_CONCURRENCY },
    totalDurationMs: totalDuration,
    results: {
      health: { ...results.health, results: undefined },
      serverList: { ...results.serverList, results: undefined },
      dashboard: { ...results.dashboard, results: undefined },
      crud: { ...results.crud, results: undefined, createdIds: undefined },
      concurrentWrites: {
        create: { ...results.concurrentWrites.create, results: undefined },
        update: results.concurrentWrites.update ? { ...results.concurrentWrites.update, results: undefined } : null,
      },
      rateLimit: { total: results.rateLimit.total, successRate: results.rateLimit.successRate, rateLimited: results.rateLimit.rateLimited, durationMs: results.rateLimit.durationMs },
    },
  }

  // 输出 JSON 报告到 stdout（可通过重定向捕获）
  console.log('\n\n--- JSON_REPORT_START ---')
  console.log(JSON.stringify(report, null, 2))
  console.log('--- JSON_REPORT_END ---')
}

main().catch(console.error)
