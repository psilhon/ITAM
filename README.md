# ITAM — IT 资产管理系统

> 企业级服务器与网络设备全生命周期管理平台

## 功能特性

- **服务器管理** — CRUD、搜索筛选、分页排序、状态追踪（运行中/已下线/维护中）
- **网络设备管理** — 交换机、路由器、防火墙、负载均衡等设备的统一管理
- **网络信息** — 网卡、IP、网关、DNS、用途（管理/业务/存储/BMC/交易）等关联管理
- **应用信息** — 应用部署、运行状态、部署路径、账号绑定（支持期货/证券场景）
- **批量导入** — 支持 txt 文本文件单文件/多文件批量导入，智能匹配已有资产并补全空字段
- **数据导出** — 支持 CSV 和 Excel（每公司一个 Sheet）格式导出
- **数据看板** — 资产概览、机房分布、OS 统计、归属统计
- **操作审计** — 完整的变更前后状态对比日志
- **安全防护** — 密码认证、CSRF 防护、Rate Limiting、Helmet 安全头、CORS 控制

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18 + TypeScript + Vite |
| UI | TDesign React + Recharts + Framer Motion |
| 后端 | Node.js + Express 4 |
| ORM | Prisma 5 |
| 数据库 | SQLite |
| 部署 | PM2 进程管理 |
| 校验 | Zod 4 |

## 系统架构

```
生产模式（单体部署）:
┌─────────────────────────────────────────┐
│           PM2 (itam-backend)            │
│  ┌───────────────────────────────────┐  │
│  │  Express (Node.js)                │  │
│  │  ├── /api/*   → REST API         │  │
│  │  └── /*       → 前端静态页面      │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │  SQLite (backend/prisma/dev.db)  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
  访问地址: http://localhost:3001
```

## 快速开始

### 环境要求

- Node.js >= 18
- PM2（`npm install -g pm2`）

### 安装与启动

```bash
# 克隆仓库
git clone https://github.com/psilhon/ITAM.git
cd ITAM

# 安装依赖（首次运行）
./start-local.sh install

# 启动服务
./start-local.sh start

# 访问
open http://localhost:3001
```

### 开发模式

```bash
./start-local.sh dev
# 前端: http://localhost:5173（Vite 热重载）
# 后端: http://localhost:3001（ts-node-dev 热重载）
```

### 其他命令

```bash
./start-local.sh stop     # 停止
./start-local.sh restart  # 重启
./start-local.sh logs     # 查看日志
./start-local.sh status   # 查看状态
```

## 项目结构

```
ITAM/
├── start-local.sh              # 启动脚本（install/dev/start/stop/restart/logs/status）
├── ecosystem.config.js         # PM2 进程配置
├── docs/                       # 项目文档
│   ├── CHANGELOG.md            # 版本更新日志
│   └── ...                     # 功能说明文档
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # 数据模型（Server/NetworkInfo/Application/NetworkDevice）
│   └── src/
│       ├── controllers/        # 路由处理层
│       ├── services/           # 业务逻辑层
│       ├── repositories/       # 数据访问层（Prisma）
│       ├── domain/             # 领域实体
│       ├── validators/         # Zod 输入校验
│       ├── middleware/          # 认证/审计/限流/错误处理
│       ├── events/             # 事件总线
│       ├── routes/             # 路由定义
│       ├── utils/              # 工具函数（拼音/清洗）
│       └── index.ts            # 应用入口
└── frontend/
    └── src/
        ├── pages/              # 页面（Dashboard/ServerList/ServerDetail/NetworkDeviceList）
        ├── components/         # 组件（表单抽屉/网络Tab/应用Tab/Toast等）
        ├── api/                # API 调用封装
        ├── utils/              # Axios 封装
        └── theme.ts            # 主题变量
```

## 数据模型

### Server（服务器）

| 字段 | 说明 | 字段 | 说明 |
|------|------|------|------|
| name | 主机名（唯一） | cpu / cpuCores / cpuArch | CPU 信息 |
| status | running/offline/maintenance | memory / memoryModules | 内存 |
| company | 所属公司 | disk / diskType | 磁盘 |
| datacenter / cabinet / rackUnit | 物理位置 | os / osKernel | 操作系统 |
| brand / model / sn | 硬件标识 | oobManagement / remoteAccess | 管理方式 |
| owner | 资产归属 | onlineDate / offlineDate | 生命周期 |

### NetworkInfo（网络信息）

| 字段 | 说明 |
|------|------|
| nicName | 网卡名称（eth0, bond0 等） |
| ipAddress / netmask / gateway / dns | 网络配置 |
| nicPurpose | management / business / storage / bmc / market / trading |
| nicStatus | UP / DOWN |

### Application（应用信息）

| 字段 | 说明 |
|------|------|
| appName | 应用名称 |
| appType | web / database / middleware / cache / futures_trading / stock_trading 等 |
| status | running / stopped / error |
| deployPath | 部署路径 |

### NetworkDevice（网络设备）

| 字段 | 说明 |
|------|------|
| name | 设备名称（唯一） |
| deviceType | switch / router / firewall / lb / other |
| managementIp | 管理 IP |
| ports | 端口规格（如 "48x10G + 6x100G"） |
| firmware | 固件版本 |

## API 概览

| 模块 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 系统 | GET | `/api/health` | 健康检查 |
| 系统 | GET | `/api/version` | 版本信息 |
| 服务器 | GET/POST | `/api/servers` | 列表/创建 |
| 服务器 | PUT/DELETE | `/api/servers/:id` | 更新/删除 |
| 服务器 | POST | `/api/servers/import` | 单文件导入 |
| 服务器 | POST | `/api/servers/batch-import` | 多文件批量导入 |
| 服务器 | GET | `/api/servers/export/csv` | CSV 导出 |
| 服务器 | GET | `/api/servers/export/excel` | Excel 导出 |
| 网络信息 | CRUD | `/api/networks/*` | 网卡管理 |
| 应用 | CRUD | `/api/applications/*` | 应用管理 |
| 网络设备 | CRUD | `/api/network-devices/*` | 设备管理 |
| 看板 | GET | `/api/stats/dashboard` | 仪表盘统计 |

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v4.5.3 | 2026-04-10 | 批量导入接口 + 前端多文件导入模式 |
| v4.5.2 | 2026-04-09 | 导入匹配支持大小写不敏感 |
| v4.5.1 | 2026-04-08 | 备份增强 + 更新验证流程 |
| v4.5.0 | 2026-04-08 | Docker → PM2 部署迁移 |

完整变更记录见 [CHANGELOG.md](docs/CHANGELOG.md)。

## License

Private — All rights reserved.
