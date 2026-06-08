# 校园导览 Agent 技术实现方案

## 1. 技术目标

本项目要实现一个面向复旦校园的 AI 导览 App，核心技术目标包括：

- 前端地图与导览交互
- 预设路线匹配
- GPS 到点自动触发讲解
- 半屏 chatbot 问答
- 拍照识图问答
- 轻量 RAG 知识库检索
- 多模态模型 API 调用
- 校园点位知识库和路线数据管理

MVP 的技术原则是：先打通体验闭环，不做复杂后台，不自建底层基础设施。

推荐方案：

```text
前端 / 后端：Next.js
数据库 / 向量库：Supabase PostgreSQL + pgvector
大模型 / embedding / 多模态：OpenAI API
知识库源文件：Markdown
路线源文件：JSON
地图：高德地图或腾讯地图
部署：Vercel + Supabase
```

## 2. 整体架构

```text
用户前端
  -> 地图、路线、GPS、拍照、chatbot

Next.js 后端 API
  -> 路线匹配
  -> GPS 附近点位判断
  -> RAG 检索
  -> 多模态识别
  -> Agent prompt 组装
  -> 大模型调用

内容与数据
  -> 点位知识库 Markdown
  -> 预设路线 JSON
  -> 点位坐标 JSON
  -> Supabase 知识片段向量表

外部服务
  -> OpenAI API
  -> Supabase
  -> 地图服务
```

## 3. 你需要准备的账号和工具

### 3.1 本地开发工具

| 工具 | 用途 | 你做 | AI coding 做 |
| --- | --- | --- | --- |
| VS Code / Cursor | 写代码和使用 AI coding | 安装并登录 | 辅助写代码 |
| Node.js | 运行 Next.js 项目 | 安装 | 生成项目和脚本 |
| Git | 版本管理 | 安装和初始化仓库 | 生成提交建议 |
| GitHub | 备份代码 | 注册账号、创建 repo | 帮你配置 README / 部署说明 |

### 3.2 云服务账号

| 服务 | 用途 | 你做 | AI coding 做 |
| --- | --- | --- | --- |
| OpenAI API | 大模型、embedding、多模态识别 | 注册、充值、创建 API key | 写 API 调用代码 |
| Supabase | 数据库、向量检索 | 注册、创建项目 | 写建表 SQL、接入 SDK |
| 高德 / 腾讯地图 | 地图展示、定位辅助 | 注册、申请地图 key | 接入前端地图 SDK |
| Vercel | 部署前后端 | 注册、连接 GitHub | 配置部署环境变量 |

### 3.3 费用预估

MVP 阶段可以低成本启动：

- OpenAI embedding：很便宜，校园知识库规模通常只是几分钱以内。
- OpenAI 对话 / 多模态：按调用量付费，主要成本来自回答生成和图片识别。
- Supabase：可以先用免费版，后续稳定演示再考虑 Pro。
- 地图服务：MVP 通常可以用免费配额，具体看高德 / 腾讯地图当前政策。
- Vercel：个人开发可先用免费版。

需要注意：API key 不要写进前端代码，必须放在后端环境变量里。

## 4. 内容资产准备

这一部分主要由你负责，AI 可以协助整理格式，但事实准确性需要你确认。

### 4.1 点位知识库

每个点位建议一份 Markdown 文件：

```text
knowledge/spots/
  main_gate.md
  xianghui_hall.md
  guanghua_tower.md
  liberal_arts_library.md
```

单个点位文件建议结构：

```markdown
# 相辉堂

spot_id: xianghui_hall
aliases: 相辉堂, 复旦相辉堂
type: 校史建筑

## 基础介绍

...

## 历史沿革

...

## 建筑特征

...

## 校园生活关联

...

## 趣味故事

...

## 拍照建议

...

## 常见问题

### 相辉堂为什么重要？

...

## 资料来源

...
```

分工：

| 任务 | 你做 | AI coding 做 |
| --- | --- | --- |
| 决定点位清单 | 负责 | 可帮你整理成表 |
| 搜集资料 | 负责 | 可帮你归纳、改写、格式化 |
| 判断事实是否可靠 | 负责 | 不建议完全交给 AI |
| 按模板整理 Markdown | 可手写初稿 | 可自动格式化和补齐字段 |
| 设计资料来源字段 | 负责确认 | 可写解析逻辑 |

### 4.2 预设路线

路线不是 AI 生成，而是提前设计。

建议使用 JSON：

```json
{
  "id": "dream_school_route",
  "name": "梦校风路线",
  "description": "适合第一次来复旦、想感受校园氛围的用户。",
  "duration_minutes": 30,
  "tags": ["高中生", "访客", "拍照", "校园生活"],
  "stops": [
    {
      "spot_id": "main_gate",
      "order": 1,
      "trigger_radius_meters": 60
    },
    {
      "spot_id": "xianghui_hall",
      "order": 2,
      "trigger_radius_meters": 60
    }
  ]
}
```

分工：

| 任务 | 你做 | AI coding 做 |
| --- | --- | --- |
| 设计路线主题 | 负责 | 可给备选建议 |
| 决定点位顺序 | 负责 | 可根据坐标估算顺路程度 |
| 设计适合人群标签 | 负责 | 可帮你归类 |
| 写路线 JSON | 可确认内容 | 可自动生成文件 |
| 写路线匹配规则 | 负责产品判断 | 可实现规则代码 |

### 4.3 点位坐标

每个点位需要经纬度，用于 GPS 到点判断和附近点位检索。

```json
{
  "id": "xianghui_hall",
  "name": "相辉堂",
  "lat": 31.000000,
  "lng": 121.000000,
  "default_trigger_radius_meters": 60
}
```

分工：

| 任务 | 你做 | AI coding 做 |
| --- | --- | --- |
| 找点位坐标 | 负责 | 可写批量校验脚本 |
| 判断触发半径 | 负责体验判断 | 可实现距离计算 |
| GPS 权限降级方案 | 负责产品决策 | 可实现手动点击兜底 |

## 5. RAG 技术方案

### 5.1 RAG 在本项目中的边界

导览模式自动讲解不使用 RAG：

```text
GPS 到达点位
-> 直接读取该点位预设讲解
-> 展示给用户
```

chatbot 问答使用轻量 RAG：

```text
用户提问
-> 根据当前点位 / GPS / 路线过滤知识库
-> 检索相关知识片段
-> 大模型基于片段回答
```

拍照识图使用“多模态 + GPS + RAG”：

```text
用户拍照
-> 多模态模型描述图片
-> 根据 GPS 找附近点位
-> 用图片描述 + 用户问题检索知识库
-> 大模型基于检索结果回答
```

### 5.2 专业名词解释

| 名词 | 解释 |
| --- | --- |
| RAG | 检索增强生成。回答前先从知识库找资料，再让大模型基于资料回答。 |
| chunk | 知识片段。把一篇点位文档按主题切成几小段，每段用于检索。 |
| embedding | 向量化。把文字转换成一串数字，让系统可以按语义相似度搜索。 |
| vector | 向量。embedding 生成出来的数字数组。 |
| vector database | 向量数据库。能快速搜索“和这个问题最相似的知识片段”。 |
| pgvector | PostgreSQL 的向量检索扩展。Supabase 支持它。 |
| top-k | 检索时返回最相关的 k 个结果，例如 top 5。 |
| similarity | 相似度。问题和知识片段在语义上的接近程度。 |

### 5.3 RAG 数据流

建库阶段：

```text
Markdown 点位知识库
-> 切分成 chunks
-> 调用 embedding API
-> 得到每个 chunk 的 vector
-> 存入 Supabase knowledge_chunks 表
```

问答阶段：

```text
用户问题
-> 调用 embedding API 得到 question vector
-> 在 Supabase 中查相似 chunks
-> 根据 currentSpotId / nearbySpotIds 做过滤
-> 取 top 3-5 个 chunks
-> 组装 prompt
-> 调用大模型生成回答
```

### 5.4 RAG 数据表设计

推荐 Supabase 表：

```sql
knowledge_chunks
- id
- chunk_id
- spot_id
- spot_name
- chunk_type
- title
- content
- source_file
- source_note
- embedding
- created_at
- updated_at
```

`chunk_type` 建议包括：

```text
intro
history
architecture
campus_life
story
photo
faq
source
```

分工：

| 任务 | 你做 | AI coding 做 |
| --- | --- | --- |
| 定义 chunk 类型是否符合内容 | 负责确认 | 可给建议 |
| 写建表 SQL | 审核即可 | 负责 |
| 开启 pgvector | 跟着步骤操作 | 给你 SQL 和操作说明 |
| 写切片脚本 | 提供 Markdown | 负责 |
| 写 embedding 索引脚本 | 提供 API key | 负责 |
| 写检索函数 | 定义检索策略 | 负责 |

### 5.5 检索策略

为了轻量但稳定，建议使用分层检索：

```text
1. 如果问题中明确提到点位名，优先锁定该点位。
2. 如果当前在导览模式，优先检索 currentSpotId。
3. 如果在自由探索模式，优先检索 GPS 附近点位。
4. 如果问题类型明显，优先检索对应 chunk_type。
5. 如果结果不足，再放宽到全库检索。
```

问题类型规则可以先做简单关键词：

```text
历史 / 以前 / 由来 -> history
建筑 / 风格 / 外观 -> architecture
拍照 / 打卡 / 好看 -> photo
吃饭 / 自习 / 上课 -> campus_life
故事 / 趣闻 -> story
```

分工：

| 任务 | 你做 | AI coding 做 |
| --- | --- | --- |
| 判断哪些问题类型重要 | 负责 | 可给关键词建议 |
| 写关键词规则 | 审核即可 | 负责 |
| 写向量检索 SQL | 不需要手写 | 负责 |
| 调整 top-k 数量 | 根据效果判断 | 改代码 |
| 验收召回是否准确 | 负责 | 可生成测试报告 |

## 6. 后端 API 设计

### 6.1 路线匹配

```text
POST /api/route/match
```

输入：

```json
{
  "identity": "高中生",
  "interests": ["校园生活", "拍照"],
  "duration": "30 分钟",
  "style": "轻松"
}
```

输出：

```json
{
  "route_id": "dream_school_route",
  "reason": "适合第一次来复旦、想感受校园氛围和拍照打卡的用户。"
}
```

实现方式：

- MVP：规则匹配。
- 之后：AI 从已有路线中选择，只能返回已有 route_id。

### 6.2 导览自动讲解

```text
POST /api/guide/trigger
```

输入：

```json
{
  "route_id": "dream_school_route",
  "spot_id": "xianghui_hall",
  "profile": {}
}
```

输出：

```json
{
  "spot_id": "xianghui_hall",
  "content": "当前点位讲解内容..."
}
```

这里不使用 RAG，直接读取点位预设讲解。

### 6.3 文字问答

```text
POST /api/chat
```

输入：

```json
{
  "question": "这里有什么历史？",
  "mode": "guided",
  "route_id": "dream_school_route",
  "current_spot_id": "xianghui_hall",
  "lat": 31.0,
  "lng": 121.0,
  "profile": {}
}
```

后端流程：

```text
生成 question embedding
-> RAG 检索相关 chunks
-> 组装 prompt
-> 调用大模型
-> 返回回答
```

### 6.4 拍照问答

```text
POST /api/chat/image
```

输入：

```text
图片文件 + 用户问题 + GPS + 当前模式 + 当前路线 / 点位
```

后端流程：

```text
调用多模态模型描述图片
-> 找附近点位
-> 用图片描述 + 用户问题做 RAG
-> 组装 prompt
-> 调用大模型回答
```

分工：

| 任务 | 你做 | AI coding 做 |
| --- | --- | --- |
| 确认 API 行为是否符合产品体验 | 负责 | 可给建议 |
| 写接口代码 | 不需要手写 | 负责 |
| 写 prompt 规则 | 负责产品要求 | 负责落到代码 |
| 处理 API key | 创建并配置 | 读取环境变量 |
| 测试接口 | 负责验收 | 写测试脚本 |

## 7. 前端功能拆解

### 7.1 页面结构

推荐 MVP 页面：

```text
/onboarding
  用户画像问题

/map
  地图首页，展示路线、点位、当前位置

/guide
  导览模式，路线进度 + GPS 到点触发

chatbot sheet
  底部半屏，可在地图和导览中拉起
```

### 7.2 前端核心能力

| 功能 | 你做 | AI coding 做 |
| --- | --- | --- |
| 确定页面信息架构 | 负责 | 可给 wireframe 建议 |
| UI 风格判断 | 负责 | 实现 CSS / 组件 |
| 地图 SDK 接入 | 申请 key | 写代码 |
| GPS 权限调用 | 定义授权文案 | 写代码 |
| 到点触发逻辑 | 判断体验阈值 | 写距离计算和状态 |
| chatbot 半屏交互 | 定义交互方式 | 写组件 |
| 图片上传 / 拍照 | 确认体验 | 写组件和接口调用 |

### 7.3 GPS 到点逻辑

前端或后端都可以计算距离。MVP 建议前端做本地判断，后端做兜底。

逻辑：

```text
每隔一段时间获取当前位置
-> 计算与当前路线下一个点位的距离
-> 小于 trigger_radius_meters
-> 如果该点未触发过，则调用 /api/guide/trigger
-> 标记该点已触发
```

注意：

- 半径不要太小，建议 50-80 米。
- 同一个点位不要重复触发。
- 用户拒绝 GPS 时允许手动点击点位讲解。
- GPS 精度差时提示用户手动选择。

## 8. Prompt 设计

### 8.1 导览自动讲解 prompt

导览自动讲解主要基于预设内容，可以不每次调用大模型。MVP 可以直接展示人工准备好的讲解。

如果想根据 profile 改写，则可以调用大模型：

```text
你是复旦校园导览 Agent。
请基于给定点位资料，为用户生成现场导览讲解。
不要添加资料中没有的事实。
```

### 8.2 RAG 问答 prompt

建议固定规则：

```text
你是复旦校园导览 Agent。

用户上下文：
- 当前模式：{mode}
- 当前路线：{route}
- 当前点位：{spot}
- 用户身份：{identity}
- 用户兴趣：{interests}
- 讲解风格：{style}

用户问题：
{question}

知识库资料：
{retrieved_chunks}

回答要求：
1. 只基于知识库资料回答。
2. 如果资料不足，明确说“我暂时没有查到可靠资料”。
3. 不要编造具体年份、人物、事件。
4. 回答适合现场导览，不要像百科词条。
5. 控制在 150-300 字。
```

分工：

| 任务 | 你做 | AI coding 做 |
| --- | --- | --- |
| 定义 Agent 性格和边界 | 负责 | 可生成草稿 |
| 确认回答长度和风格 | 负责 | 写入 prompt |
| 写 prompt 模板文件 | 审核即可 | 负责 |
| 根据测试结果调 prompt | 负责判断 | 负责修改 |

## 9. 开发阶段拆分

### 阶段 0：项目初始化

目标：搭好工程骨架。

| 步骤 | 你做 | AI coding 做 |
| --- | --- | --- |
| 创建项目目录和 GitHub repo | 负责 | 可给命令 |
| 创建 Next.js 项目 | 执行命令 / 授权 | 负责生成 |
| 配置基础 UI | 选风格方向 | 实现 |
| 配置环境变量模板 | 填 API key | 生成 `.env.example` |

### 阶段 1：内容数据打底

目标：先让路线和点位可被程序读取。

| 步骤 | 你做 | AI coding 做 |
| --- | --- | --- |
| 确定 8-10 个点位 | 负责 | 整理表格 |
| 写每个点位 Markdown | 负责初稿和事实 | 格式化 |
| 设计 3 条路线 | 负责 | 转 JSON |
| 整理坐标 | 负责找坐标 | 校验格式 |
| 写数据读取函数 | 审核即可 | 负责 |

### 阶段 2：导览模式 MVP

目标：不用 RAG，先跑通预设路线导览。

| 步骤 | 你做 | AI coding 做 |
| --- | --- | --- |
| 定义 onboarding 问题 | 负责 | 实现表单 |
| 定义路线匹配规则 | 负责 | 写匹配函数 |
| 地图展示路线点位 | 确认体验 | 实现 |
| GPS 到点触发 | 设定触发半径 | 实现 |
| 点位讲解展示 | 准备内容 | 实现展示 |

### 阶段 3：轻量 RAG

目标：让 chatbot 能基于知识库回答。

| 步骤 | 你做 | AI coding 做 |
| --- | --- | --- |
| 确认 Markdown 模板 | 负责 | 生成示例 |
| 准备 OpenAI API key | 负责 | 接环境变量 |
| 创建 Supabase 项目 | 负责 | 给操作步骤 |
| 开启 pgvector | 按说明操作 | 提供 SQL |
| 建 knowledge_chunks 表 | 审核执行 | 写 SQL |
| 写切片脚本 | 提供文件 | 负责 |
| 写 embedding 脚本 | 提供 key | 负责 |
| 写检索函数 | 确认策略 | 负责 |
| 接入 /api/chat | 测试体验 | 负责 |

### 阶段 4：拍照识图

目标：让用户可以拍照问答。

| 步骤 | 你做 | AI coding 做 |
| --- | --- | --- |
| 定义拍照入口体验 | 负责 | 实现组件 |
| 确认图片上传限制 | 负责 | 实现压缩 / 校验 |
| 接多模态 API | 提供 API key | 负责 |
| 图片描述 + RAG | 确认回答质量 | 负责 |
| GPS 附近点位过滤 | 确认半径 | 负责 |

### 阶段 5：验收和优化

目标：让 demo 稳定可展示。

| 步骤 | 你做 | AI coding 做 |
| --- | --- | --- |
| 准备 20-30 个测试问题 | 负责 | 可生成初稿 |
| 判断召回是否正确 | 负责 | 输出检索结果 |
| 判断回答是否可靠 | 负责 | 改 prompt |
| 调整 chunk 和内容 | 负责 | 批量修改格式 |
| 修复前端交互问题 | 验收 | 负责 |

## 10. 推荐目录结构

```text
campus-agent/
  app/
    onboarding/
    map/
    guide/
    api/
      route/
      guide/
      chat/
  components/
    MapView.tsx
    ChatSheet.tsx
    RoutePanel.tsx
    SpotCard.tsx
  lib/
    routes.ts
    spots.ts
    geo.ts
    rag/
      chunk.ts
      embed.ts
      retrieve.ts
      prompt.ts
    openai.ts
    supabase.ts
  knowledge/
    spots/
      xianghui_hall.md
      guanghua_tower.md
  data/
    spots.json
    routes.json
    chunks.json
  scripts/
    build-chunks.ts
    index-embeddings.ts
  docs/
  .env.example
```

## 11. 最小可行版本范围

如果时间有限，建议 MVP 只做这些：

```text
1. 8-10 个点位
2. 3 条预设路线
3. onboarding 问题匹配路线
4. 地图展示路线
5. GPS 到点触发讲解
6. chatbot 文字问答 + 轻量 RAG
7. 拍照识图基础版
```

暂不做：

```text
1. 知识库管理后台
2. 用户登录系统
3. 复杂 AR
4. 多人导览
5. 自动语音播报
6. 精细室内导航
7. 完整检索评测平台
```

## 12. 你和 AI 的协作方式

你负责：

- 产品体验判断
- 点位和路线内容
- 校园资料事实核验
- 路线主题设计
- Agent 语气边界
- API key 和账号申请
- 最终验收

AI coding 负责：

- 项目脚手架
- 数据结构
- 前端页面和组件
- 后端 API
- RAG 切片脚本
- embedding 索引脚本
- Supabase SQL
- 检索函数
- prompt 模板
- 测试脚本
- 部署配置

最重要的协作原则：

```text
你给清楚产品规则和内容边界，AI coding 负责把规则落成代码。
```

不要让 AI 自己决定校园事实，也不要让 AI 自己随意设计路线。AI 最适合做工程实现、格式转换、脚本生成和代码调试。

## 13. 建议下一步

下一步建议先做内容和工程的最小闭环：

```text
1. 确定 8-10 个点位
2. 确定 3 条路线
3. 给每个点位写一版 Markdown
4. 创建 Next.js 项目
5. 先实现路线匹配和地图展示
6. 再接入轻量 RAG chatbot
```

这样可以先看到可操作的 App，再逐步增强拍照识图和检索质量。
