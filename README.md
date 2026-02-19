# 日记助手 App

一个 AI 驱动的日记应用，支持对话式写日记、自动分类、情绪分析、周报月报年报生成。

## 功能特点

- 💬 **AI 对话** - 和 AI 聊天写日记
- 🎤 **语音输入** - 语音转文字
- 🏷️ **自动分类** - 情绪标签、生活领域、事件类型
- 😊 **情绪评分** - 自动分析情绪分数
- 📊 **情绪趋势** - 可视化情绪变化
- 📅 **日历视图** - 按日期查看日记
- � **补记日记** - 支持补记过往日期的日记
- �📈 **时间线** - 时间线浏览历史
- 📋 **AI 报告** - 周报/月报/年报自动生成
- 🌓 **深色模式** - 支持深色/浅色主题切换

## 运行要求

- Node.js 18+ 或 Bun

## 快速开始

### 1. 安装依赖

```bash
npm install
# 或
bun install
```

### 2. 配置 API 密钥

复制配置模板并填入你的 API 密钥：

```bash
cp .z-ai-config.example .z-ai-config
```

然后编辑 `.z-ai-config`：

```json
{
  "apiKey": "你的真实API密钥"
}
```

**注意：** 密钥值必须用双引号包裹！

### 3. 配置数据库

本地开发使用 SQLite 数据库（默认配置）：

```bash
# 生成 Prisma 客户端
npx prisma generate

# 创建数据库
npx prisma db push
```

### 4. 启动

```bash
npm run dev
# 或
bun run dev
```

### 5. 访问

打开浏览器访问 http://localhost:3000

## 数据存储

- **本地开发**：SQLite 数据库位于 `prisma/dev.db`
- **NAS 部署**：数据库文件存储在你指定的 NAS 路径

### NAS 部署配置

部署到 NAS 时，修改 `.env` 文件中的数据库路径：

```env
DATABASE_URL="file:/你的NAS路径/diary.db"
```

然后运行：

```bash
npx prisma generate
npx prisma db push
```

数据文件位置请参考 `DEPLOYMENT.md` 部署文档。

### 备份数据

由于日记数据存储在 SQLite 文件中，你可以直接复制数据库文件进行备份：

- 本地开发：`prisma/dev.db`
- NAS 部署：你配置的数据库路径

## 调试模式

默认跳过密码锁（调试模式）。如需启用密码锁，编辑 `src/app/page.tsx`：

```typescript
// 将 true 改回 false
const [isUnlocked, setIsUnlocked] = useState(false);
```

## 部署

详细部署指南请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)
