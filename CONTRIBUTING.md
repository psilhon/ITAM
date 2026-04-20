# Commit 规范

本项目遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式。

## 格式

```
<type>(<scope>): <描述>
```

### type（必填）

| 类型 | 说明 | Emoji |
|------|------|-------|
| `feat` | 新功能 | ✅ |
| `fix` | Bug 修复 | 🐛 |
| `docs` | 文档变更 | 📝 |
| `refactor` | 代码重构（不改变功能） | ♻️ |
| `chore` | 构建/工具/杂项 | 🔧 |
| `style` | 代码格式（不影响逻辑） | 💄 |
| `perf` | 性能优化 | ⚡ |
| `test` | 测试相关 | 🧪 |

### scope（可选）

模块名：`server`、`network`、`app`、`device`、`import`、`auth`、`ui` 等

### 示例

```bash
git commit -m "feat(server): 新增服务器批量删除功能"
git commit -m "fix(import): 修复批量导入时中文字符编码问题"
git commit -m "docs: 更新 API 接口文档"
git commit -m "refactor(network): 网络信息查询逻辑优化"
git commit -m "chore: 升级 Prisma 到 5.x"
```

## CHANGELOG 自动更新

push 到 `main` 分支时，GitHub Actions 会自动：
1. 读取上次版本以来的所有 commit
2. 按类型分类生成 CHANGELOG 条目
3. 自动递增修订号
4. 更新 `docs/CHANGELOG.md` 和 `README.md` 版本表
5. 自动提交并推送

手动指定版本号：在 Actions 页面点击 "Update Changelog" → Run workflow，输入版本号（如 `v4.6.0`）。
