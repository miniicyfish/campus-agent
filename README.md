# Fudan Walks – 复旦校园 AI 导览 Agent

> 一个为复旦校园参观场景设计的 AI 导览助手，融合预设路线、角色化讲解、地图交互、智能问答与拍照识图，提供轻量、个性化且内容可控的校园探索体验。

## 📖 项目简介

**Fudan Walks** 是一个面向游客、新生、返校校友等不同来访者的校园导览 Demo。它不仅提供静态地图和点位介绍，还通过 AI Agent 的形式，结合用户画像匹配预设路线、提供风格化讲解、支持文字追问和拍照识图，让校园参观变得更自然、有深度且轻松美丽。

当前版本覆盖复旦邯郸校区主校区核心 POI，支持两种参观模式：

- **自由参观**：直接进入地图，点击任意 POI 查看讲解，随时发起 Chatbot 问答或拍照识别。
- **导览模式**：先填写简短问卷，系统自动匹配 6 条预设路线之一（如“学术风 30 分钟”“梦校风 60 分钟”等）和一位专属导览员（如“复旦同学”“校史学者”“校园美学博主”），然后按路线逐点导览。

## ✨ 功能特性

- 🗺️ **校园地图交互** – 静态底图 + 可点击 POI 图标，支持手动点选点位
- 🎭 **角色化讲解** – 三位不同风格的 Agent 人设，讲解稿风格各异
- 📋 **个性化路线匹配** – 基于身份、兴趣、时长、风格等规则匹配预设路线
- 💬 **伴随式 Chatbot** – 半层上拉抽屉，围绕当前点位和路线进行自然语言问答
- 📸 **拍照识图** – 上传图片，结合当前场景获得理解（支持多模态模型与本地 fallback）
- 🧠 **本地知识库 + 检索增强** – 点位知识、讲解稿、RAG 测试问题，模型输出更可控
- 🔁 **完整演示流程** – 无 API Key 时仍可跑通主干流程，适合答辩与评审

## 🛠️ 技术栈

- **前端** – Next.js 14 (App Router) + React 18 + TypeScript
- **样式** – Tailwind CSS / 自定义 CSS
- **图标** – lucide-react
- **后端 API** – Next.js API Routes
- **模型调用** – OpenAI 兼容接口（文本 & 视觉）
- **内容存储** – 本地 JSON + Markdown 文件

## 📦 快速开始

### 环境要求

- Node.js 18+  
- npm 或 yarn

### 安装依赖

```bash
cd campus-agent
npm install
```

### 开发运行

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 生产构建

```bash
npm run build
```

## 🔐 环境变量（可选）

创建 `.env.local` 文件，配置模型服务（未配置时自动使用本地 fallback）：

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_VISION_MODEL=gpt-4o-mini
```

> 不配置 API Key 时，路线匹配、地图浏览、点位讲解、简单问答和拍照兜底仍可运行。配置后 `/api/chat` 会使用模型生成回答，`/api/photo` 会启用真实图片理解能力。

## 📁 项目结构

```
campus-agent/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # 主页面（模式选择、问卷、地图、聊天抽屉）
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/                     # 五个后端接口
│   │       ├── bootstrap/route.ts
│   │       ├── match-route/route.ts
│   │       ├── guide/route.ts
│   │       ├── chat/route.ts
│   │       └── photo/route.ts
│   └── lib/
│       ├── content.ts               # 内容读取与匹配逻辑
│       ├── model.ts                 # 模型调用封装
│       └── types.ts                 # TypeScript 类型定义
├── data/                            # 结构化数据
│   ├── routes.json                  # 6 条预设路线
│   ├── route_matching_rules.json    # 问卷匹配规则
│   ├── photo_targets/
│   ├── photo_targets.json           # 拍照识别候选对象
│   └── spots/                       # 点位坐标与元数据
├── knowledge/                       # 知识库与讲解稿
│   ├── spots/                       # 各点位详细知识 (Markdown)
│   ├── guide_scripts/               # 导览模式讲解稿
│   ├── basic_scripts/               # 自由参观讲解稿
│   └── agents/                      # 三位导览员人设
├── public/assets/                   # 图片资源（地图、图标、导览员形象）
├── package.json
└── README.md
```

## 🧩 API 端点说明

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/bootstrap` | GET | 返回所有点位、路线、导览员基础数据 |
| `/api/match-route` | POST | 接收用户 profile，返回匹配的路线及导览员 |
| `/api/guide` | POST | 根据 spotId、routeId、agentId 返回讲解稿 |
| `/api/chat` | POST | 文本问答，结合当前点位和知识库检索，调用模型或 fallback |
| `/api/photo` | POST | 图片上传，调用视觉模型或返回本地兜底讲解 |

详细请求/响应格式可参考源码中的类型定义 (`src/lib/types.ts`)。

## 🧭 演示模式说明

- **无 API Key**：路线匹配、点位讲解、简单问答（基于关键词匹配 + 本地内容）仍可完整演示；拍照识图会返回当前点位的通用讲解。
- **有 API Key**：问答更自然灵活，拍照识图可真正理解图片内容（但仍会优先结合当前点位上下文）。

## 📌 当前版本能力边界

- 地图为静态图片叠加 POI 图标，非真实 GIS 地图
- 路线推进为手动点击“下一站”或点位图标，**未接入 GPS 自动触发**
- 拍照识图为辅助功能，多候选点位的二次确认尚未实现
- 语音讲解和多轮长期记忆暂未支持

## 📄 许可与说明

本项目为复旦大学AI Agent训练营项目成果，仅供学习与展示使用。  
代码仓库： [https://github.com/miniicyfish/campus-agent](https://github.com/miniicyfish/campus-agent)

---

**Enjoy your walk around Fudan! 🚶‍♀️🎓**
