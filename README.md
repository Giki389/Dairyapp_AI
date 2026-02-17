# 日记助手 App

一个 AI 驱动的日记应用，支持对话式写日记、自动分类、情绪分析、周报月报年报生成。

## 功能特点

- 💬 **AI 对话** - 和 AI 聊天写日记
- 🎤 **语音输入** - 语音转文字
- 🏷️ **自动分类** - 情绪标签、生活领域、事件类型
- 😊 **情绪评分** - 自动分析情绪分数
- 📊 **情绪趋势** - 可视化情绪变化
- 📅 **日历视图** - 按日期查看日记
- 📈 **时间线** - 时间线浏览历史
- 📋 **AI 报告** - 周报/月报/年报自动生成

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

### 3. 启动

```bash
npm run dev
# 或
bun run dev
```

### 4. 访问

打开浏览器访问 http://localhost:3000

## 添加到 iPhone 主屏幕

1. 用 Safari 打开 http://localhost:3000
2. 点击底部分享按钮
3. 选择「添加到主屏幕」
4. 像原生 App 一样使用

## 数据存储

- 所有数据存储在浏览器 IndexedDB 中
- 数据完全本地化，隐私安全

## 调试模式

默认跳过密码锁（调试模式）。如需启用密码锁，编辑 `src/app/page.tsx`：

```typescript
// 将 true 改回 false
const [isUnlocked, setIsUnlocked] = useState(false);
```
