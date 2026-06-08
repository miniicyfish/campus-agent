# 校园导览 Agent 内容准备规范

## 1. 文档目标

这份文档用于指导校园导览 Agent 的内容准备工作，核心目标是让内容可以被后续技术实现稳定读取、检索和调用。

内容准备包括：

- 校园点位知识库
- 点位坐标数据
- 预设路线数据
- 路线匹配规则
- 导览自动讲解内容
- Agent 人设与回答规则
- 拍照识图候选对象
- RAG 测试问题集

重要原则：

```text
内容可以有自然语言表达，但关键字段必须结构化。
每个点位、路线、Agent 都必须有稳定 ID。
后续代码会依赖这些 ID 做匹配、检索和调用。
```

## 2. 推荐目录结构

建议把内容资产放在项目的 `knowledge/` 和 `data/` 目录下：

```text
campus-agent/
  knowledge/
    spots/
      main_gate.md
      old_gate.md
      xianghui_hall.md
      zibin_yard.md
      guanghua_tower.md
      liberal_arts_library.md
      teaching_building_3.md
      school_history_museum.md
      guanghua_lawn.md
      xiyuan.md
      teaching_building_4.md
    agents/
      history_association.md
      student_guide.md
      xiaohongshu_curator.md
    guide_scripts/
      xianghui_hall.json
      guanghua_tower.json
  data/
    spots.json
    routes.json
    route_matching_rules.json
    photo_targets.json
    rag_eval_questions.json
```

说明：

- `knowledge/spots/*.md`：每个点位一份详细知识库文档。
- `knowledge/agents/*.md`：每个导览员 Agent 的人设和表达规则。
- `knowledge/guide_scripts/*.json`：导览模式下直接展示或播放的预设讲解。
- `data/spots.json`：点位基础信息、坐标、触发半径。
- `data/routes.json`：预设路线。
- `data/route_matching_rules.json`：用户回答到路线的映射规则。
- `data/photo_targets.json`：每个点位可被拍照识别的对象。
- `data/rag_eval_questions.json`：RAG 问答测试集。

## 3. 通用命名规则

所有技术可读 ID 使用英文小写 + 下划线：

```text
xianghui_hall
guanghua_tower
dream_school_route
history_association
```

不要使用：

```text
相辉堂
XianghuiHall
xianghui-hall
xianghui hall
```

命名规则：

| 类型 | 字段 | 示例 |
| --- | --- | --- |
| 点位 ID | `spot_id` | `xianghui_hall` |
| 路线 ID | `route_id` | `dream_school_route` |
| Agent ID | `agent_id` | `student_guide` |
| 知识片段类型 | `chunk_type` | `history` |
| 文件名 | 与 ID 保持一致 | `xianghui_hall.md` |

## 4. 点位知识库 Markdown

### 4.1 文件位置

每个点位一份 Markdown：

```text
knowledge/spots/{spot_id}.md
```

示例：

```text
knowledge/spots/xianghui_hall.md
```

### 4.2 文件格式

每个点位 Markdown 必须包含两部分：

```text
1. YAML frontmatter：给程序读取的结构化字段
2. 正文内容：给 RAG 切片和 Agent 回答使用
```

示例：

```markdown
---
spot_id: xianghui_hall
name: 相辉堂
aliases:
  - 相辉堂
  - 复旦相辉堂
type: 校史建筑
campus: 邯郸校区
tags:
  - 校史
  - 建筑
  - 仪式空间
recommended_audiences:
  - 新生
  - 访客
  - 校友
  - 高中生
source_status: 待核验
---

# 相辉堂

## 基础介绍

相辉堂是复旦校园中具有代表性的公共建筑之一，也是许多校园活动和集体记忆的重要发生地。

## 历史沿革

这里填写经过核验的历史信息。涉及年份、人物、事件时必须谨慎，最好保留资料来源。

## 建筑特征

这里填写建筑外观、空间位置、周边环境、和校园轴线或景观的关系。

## 校园生活关联

这里填写学生在此参加活动、路过、集合、拍照、毕业留念等生活关联。

## 趣味故事

这里填写适合轻松讲解的故事，但不要编造。

## 拍照建议

这里填写适合拍照的位置、角度、时间段和构图建议。

## 常见问题

### 相辉堂为什么重要？

这里填写回答。

### 第一次来这里应该看什么？

这里填写回答。

## 资料来源

- 来源 1：链接或书目信息
- 来源 2：链接或书目信息
```

### 4.3 必填字段

YAML frontmatter 必填：

| 字段 | 类型 | 说明 | 示例 |
| --- | --- | --- | --- |
| `spot_id` | string | 点位唯一 ID | `xianghui_hall` |
| `name` | string | 中文展示名 | `相辉堂` |
| `aliases` | string[] | 别名，用于识别用户提问 | `["相辉堂", "复旦相辉堂"]` |
| `type` | string | 点位类型 | `校史建筑` |
| `campus` | string | 所属校区 | `邯郸校区` |
| `tags` | string[] | 内容标签 | `["校史", "建筑"]` |
| `recommended_audiences` | string[] | 适合人群 | `["新生", "访客"]` |
| `source_status` | string | 资料状态 | `已核验` / `待核验` |

正文必填章节：

```text
## 基础介绍
## 历史沿革
## 建筑特征
## 校园生活关联
## 拍照建议
## 常见问题
## 资料来源
```

可选章节：

```text
## 趣味故事
## 相关人物
## 重要事件
## 周边推荐
## 英文讲解素材
```

### 4.4 RAG 切片规则

后续技术实现会按二级标题 `##` 切分知识片段。

例如：

```text
## 历史沿革
```

会生成一个 chunk：

```json
{
  "spot_id": "xianghui_hall",
  "chunk_type": "history",
  "title": "历史沿革",
  "content": "这里填写经过核验的历史信息..."
}
```

建议每个二级标题下的正文长度：

```text
200-500 中文字较合适
```

不要过短：

```text
只有一句话，检索价值低。
```

也不要过长：

```text
超过 1000 字，容易混入多个主题，检索不精准。
```

### 4.5 章节到 chunk_type 的映射

| Markdown 标题 | chunk_type |
| --- | --- |
| 基础介绍 | `intro` |
| 历史沿革 | `history` |
| 建筑特征 | `architecture` |
| 校园生活关联 | `campus_life` |
| 趣味故事 | `story` |
| 拍照建议 | `photo` |
| 常见问题 | `faq` |
| 相关人物 | `people` |
| 重要事件 | `event` |
| 周边推荐 | `nearby` |
| 英文讲解素材 | `english` |
| 资料来源 | `source` |

## 5. 点位基础信息与坐标

### 5.1 文件位置

```text
data/spots.json
```

### 5.2 格式要求

```json
[
  {
    "spot_id": "xianghui_hall",
    "name": "相辉堂",
    "aliases": ["相辉堂", "复旦相辉堂"],
    "campus": "邯郸校区",
    "type": "校史建筑",
    "lat": 31.000000,
    "lng": 121.000000,
    "default_trigger_radius_meters": 60,
    "map_icon": "hall",
    "summary": "复旦校园中具有代表性的公共建筑和仪式空间。",
    "available": true
  }
]
```

### 5.3 字段说明

| 字段 | 是否必填 | 说明 |
| --- | --- | --- |
| `spot_id` | 必填 | 必须和 Markdown 文件名、frontmatter 一致 |
| `name` | 必填 | 前端展示名 |
| `aliases` | 必填 | 用户提问和拍照识别时的别名匹配 |
| `campus` | 必填 | 所属校区 |
| `type` | 必填 | 点位类型 |
| `lat` | 必填 | 纬度 |
| `lng` | 必填 | 经度 |
| `default_trigger_radius_meters` | 必填 | GPS 自动触发半径，建议 50-80 |
| `map_icon` | 可选 | 地图图标类型 |
| `summary` | 必填 | 点位一句话介绍 |
| `available` | 必填 | 是否在当前 MVP 启用 |

### 5.4 坐标准备要求

每个点位至少需要一个中心点坐标。

如果点位范围较大，例如草坪、图书馆、宿舍区，可以先取主要入口或中心点。

触发半径建议：

| 点位类型 | 建议半径 |
| --- | --- |
| 建筑入口 | 40-60 米 |
| 大型建筑 | 60-80 米 |
| 草坪 / 广场 | 80-120 米 |
| 道路 / 景观带 | 80-150 米 |

## 6. 预设路线数据

### 6.1 文件位置

```text
data/routes.json
```

### 6.2 格式要求

```json
[
  {
    "route_id": "dream_school_route",
    "name": "梦校风路线",
    "description": "适合第一次来复旦、想感受校园氛围和拍照打卡的用户。",
    "duration_minutes": 30,
    "distance_meters": 1200,
    "tags": ["高中生", "访客", "拍照", "校园生活"],
    "suitable_for": ["高中生", "访客", "家长"],
    "interests": ["校园生活", "拍照", "校史"],
    "style": "轻松",
    "start_spot_id": "main_gate",
    "stops": [
      {
        "spot_id": "main_gate",
        "order": 1,
        "estimated_stay_minutes": 5,
        "trigger_radius_meters": 60,
        "guide_script_id": "main_gate_dream_school"
      },
      {
        "spot_id": "xianghui_hall",
        "order": 2,
        "estimated_stay_minutes": 8,
        "trigger_radius_meters": 60,
        "guide_script_id": "xianghui_hall_dream_school"
      }
    ],
    "ending_message": "这条路线适合快速建立对复旦校园氛围的第一印象。"
  }
]
```

### 6.3 字段说明

| 字段 | 是否必填 | 说明 |
| --- | --- | --- |
| `route_id` | 必填 | 路线唯一 ID |
| `name` | 必填 | 前端展示名称 |
| `description` | 必填 | 路线说明 |
| `duration_minutes` | 必填 | 预计时长 |
| `distance_meters` | 可选 | 预计步行距离 |
| `tags` | 必填 | 路线标签 |
| `suitable_for` | 必填 | 适合人群 |
| `interests` | 必填 | 适合兴趣 |
| `style` | 可选 | 默认讲解风格 |
| `start_spot_id` | 必填 | 起点 |
| `stops` | 必填 | 点位顺序 |
| `ending_message` | 可选 | 路线结束提示 |

`stops` 内字段：

| 字段 | 是否必填 | 说明 |
| --- | --- | --- |
| `spot_id` | 必填 | 点位 ID |
| `order` | 必填 | 路线顺序 |
| `estimated_stay_minutes` | 必填 | 建议停留时间 |
| `trigger_radius_meters` | 必填 | 此路线中的触发半径 |
| `guide_script_id` | 必填 | 对应预设讲解 ID |

## 7. 路线匹配规则

### 7.1 文件位置

```text
data/route_matching_rules.json
```

### 7.2 格式要求

MVP 可以先用规则匹配，不必让 AI 动态生成路线。

```json
[
  {
    "rule_id": "high_school_photo_30min",
    "priority": 100,
    "conditions": {
      "identities": ["高中生"],
      "interests_any": ["拍照", "校园生活", "校史"],
      "duration_minutes_max": 30,
      "styles_any": ["轻松", "有趣", "亲切"]
    },
    "route_id": "dream_school_route",
    "reason": "高中生第一次来访且时间较短，优先推荐能快速感受校园氛围的梦校风路线。"
  },
  {
    "rule_id": "architecture_lover",
    "priority": 90,
    "conditions": {
      "identities": ["访客", "在校生", "校友"],
      "interests_any": ["建筑", "人文"],
      "duration_minutes_max": 60
    },
    "route_id": "academic_route",
    "reason": "用户对建筑和人文感兴趣，推荐学术风路线。"
  }
]
```

### 7.3 字段说明

| 字段 | 说明 |
| --- | --- |
| `rule_id` | 规则唯一 ID |
| `priority` | 优先级，数字越大越优先 |
| `conditions` | 匹配条件 |
| `route_id` | 命中的路线 |
| `reason` | 推荐理由，给前端展示 |

建议先准备 5-10 条规则，覆盖主要用户：

- 高中生
- 新生
- 访客
- 家长
- 校友
- 建筑兴趣用户
- 校史兴趣用户
- 拍照兴趣用户

## 8. 导览自动讲解内容

导览模式下，到点自动触发的内容建议提前准备，不依赖 RAG。

### 8.1 文件位置

```text
knowledge/guide_scripts/{spot_id}.json
```

示例：

```text
knowledge/guide_scripts/xianghui_hall.json
```

### 8.2 格式要求

```json
[
  {
    "guide_script_id": "xianghui_hall_dream_school",
    "spot_id": "xianghui_hall",
    "route_id": "dream_school_route",
    "agent_id": "student_guide",
    "audience": "高中生",
    "style": "轻松",
    "language": "zh",
    "duration_seconds": 60,
    "title": "相辉堂：复旦校园里的仪式感",
    "content": "现在你看到的是相辉堂。对很多复旦人来说，这里不只是一个建筑，更像是校园记忆里的一个坐标...",
    "follow_up_suggestions": [
      "这里有什么历史？",
      "适合在哪里拍照？",
      "附近还有什么值得看？"
    ]
  }
]
```

### 8.3 字段说明

| 字段 | 是否必填 | 说明 |
| --- | --- | --- |
| `guide_script_id` | 必填 | 讲解唯一 ID |
| `spot_id` | 必填 | 所属点位 |
| `route_id` | 必填 | 所属路线 |
| `agent_id` | 必填 | 默认讲解 Agent |
| `audience` | 必填 | 目标用户 |
| `style` | 必填 | 讲解风格 |
| `language` | 必填 | `zh` / `en` / `zh_en` |
| `duration_seconds` | 必填 | 讲解时长 |
| `title` | 必填 | 讲解标题 |
| `content` | 必填 | 讲解正文 |
| `follow_up_suggestions` | 可选 | 建议追问 |

### 8.4 内容要求

建议每段自动讲解：

```text
30 秒版：100-180 中文字
60 秒版：200-350 中文字
2 分钟版：500-800 中文字
```

MVP 建议先做 60 秒版。

内容结构建议：

```text
1. 你现在看到的是什么
2. 它为什么值得看
3. 和当前路线主题有什么关系
4. 可以观察什么细节
5. 引导用户继续追问或前往下一站
```

## 9. Agent 人设内容

### 9.1 文件位置

```text
knowledge/agents/{agent_id}.md
```

示例：

```text
knowledge/agents/student_guide.md
```

### 9.2 格式要求

```markdown
---
agent_id: student_guide
name: 普通大学生
tone: 亲切、自然、像学长学姐
default_language: zh
---

# 普通大学生

## 人设定位

你是一位熟悉复旦校园生活的在校学生，讲解时像学长学姐带路。

## 适合场景

- 新生熟悉校园
- 高中生参观
- 家长了解学生生活
- 自由探索中的轻松问答

## 表达规则

- 用自然口语，不要像百科。
- 可以讲生活经验，但不要编造具体个人经历。
- 遇到不确定的校史信息，要说明资料不足。
- 回答控制在 150-300 字。

## 禁止事项

- 不要编造年份、人物和事件。
- 不要承诺开放时间、门禁政策等可能变化的信息。
- 不要给出危险或违规进入建议。
```

MVP 可以先准备 3 个：

- `history_association`：校史协会成员
- `student_guide`：普通大学生
- `xiaohongshu_curator`：小红薯主理人

## 10. 拍照识图候选对象

### 10.1 文件位置

```text
data/photo_targets.json
```

### 10.2 格式要求

```json
[
  {
    "target_id": "xianghui_hall_front",
    "spot_id": "xianghui_hall",
    "name": "相辉堂正立面",
    "aliases": ["相辉堂正门", "相辉堂外立面", "礼堂正面"],
    "visual_features": [
      "建筑正立面",
      "入口台阶",
      "门头或牌匾",
      "开阔前场"
    ],
    "likely_questions": [
      "这是什么建筑？",
      "这里有什么历史？",
      "适合在哪里拍照？"
    ],
    "related_chunk_types": ["intro", "history", "architecture", "photo"]
  }
]
```

### 10.3 字段说明

| 字段 | 是否必填 | 说明 |
| --- | --- | --- |
| `target_id` | 必填 | 拍照对象唯一 ID |
| `spot_id` | 必填 | 所属点位 |
| `name` | 必填 | 对象名称 |
| `aliases` | 必填 | 可能的叫法 |
| `visual_features` | 必填 | 视觉特征，帮助多模态结果匹配 |
| `likely_questions` | 可选 | 用户可能问的问题 |
| `related_chunk_types` | 必填 | 拍照后优先检索的知识类型 |

这个文件的作用是帮助系统把图片描述和校园点位知识库连接起来。

## 11. RAG 测试问题集

### 11.1 文件位置

```text
data/rag_eval_questions.json
```

### 11.2 格式要求

```json
[
  {
    "id": "q_xianghui_history_001",
    "question": "相辉堂有什么历史？",
    "mode": "guided",
    "current_spot_id": "xianghui_hall",
    "nearby_spot_ids": ["xianghui_hall", "guanghua_lawn"],
    "expected_spot_ids": ["xianghui_hall"],
    "expected_chunk_types": ["history", "intro"],
    "notes": "应优先召回相辉堂历史沿革，不应召回光华楼。"
  },
  {
    "id": "q_photo_nearby_001",
    "question": "这里适合拍照吗？",
    "mode": "free_explore",
    "current_spot_id": null,
    "nearby_spot_ids": ["xianghui_hall", "guanghua_lawn"],
    "expected_spot_ids": ["xianghui_hall", "guanghua_lawn"],
    "expected_chunk_types": ["photo"],
    "notes": "应召回附近点位的拍照建议。"
  }
]
```

### 11.3 准备要求

MVP 建议准备 20-30 个测试问题，覆盖：

- 当前点位追问
- 自由探索问附近
- 拍照识图后提问
- 校史问题
- 建筑问题
- 拍照打卡问题
- 校园生活问题
- 问题资料不足时的兜底

这部分非常重要，用来判断 RAG 是否真的检索到了正确内容。

## 12. 内容准备优先级

### P0：必须准备

```text
1. 8-10 个点位 Markdown
2. data/spots.json
3. 3 条预设路线 routes.json
4. 每条路线每个点位的 60 秒自动讲解
5. 1 个默认 Agent 人设
6. 20 个 RAG 测试问题
```

### P1：建议准备

```text
1. 3 个 Agent 人设
2. photo_targets.json
3. 每个点位的拍照建议
4. 每个点位 3-5 个 FAQ
5. 路线匹配规则
```

### P2：后续增强

```text
1. 英文讲解内容
2. 2 分钟深度讲解
3. 校友怀旧版本
4. 亲子版本
5. 更多点位和跨校区路线
```

## 13. 内容质量检查清单

每个点位完成后检查：

- `spot_id` 是否和文件名一致。
- `spot_id` 是否和 `data/spots.json` 一致。
- 是否有坐标。
- 是否有至少 5 个二级标题章节。
- 是否有资料来源。
- 是否避免编造具体年份、人物、事件。
- 是否包含拍照建议。
- 是否能支持至少 3 个常见追问。

每条路线完成后检查：

- `route_id` 是否唯一。
- `stops` 中的每个 `spot_id` 是否存在。
- 每个 stop 是否有 `guide_script_id`。
- 路线总时长是否合理。
- 点位顺序是否符合实际步行体验。
- 是否有清晰适合人群和路线主题。

RAG 测试集完成后检查：

- 是否覆盖主要点位。
- 是否覆盖主要问题类型。
- 是否有预期召回点位。
- 是否有预期 chunk_type。
- 是否包含资料不足的测试问题。

## 14. 给 AI coding 的内容解析要求

后续让 AI coding 实现时，可以直接使用以下要求：

```text
请根据 docs/content_preparation_guide.md 实现内容解析。

要求：
1. 读取 knowledge/spots/*.md。
2. 解析 YAML frontmatter，提取 spot_id、name、aliases、type、campus、tags。
3. 按二级标题 ## 切分正文。
4. 根据标题映射 chunk_type。
5. 每个 chunk 输出 chunk_id、spot_id、spot_name、chunk_type、title、content、source_file。
6. 读取 data/spots.json 校验 spot_id 是否存在。
7. 读取 data/routes.json 校验路线中的 spot_id 和 guide_script_id 是否存在。
8. 输出 data/chunks.json。
9. 如果字段缺失，输出明确错误信息。
```

## 15. 最小示例集合

如果先做技术验证，最小内容集可以是：

```text
点位：
- main_gate
- xianghui_hall
- guanghua_tower

路线：
- dream_school_route

Agent：
- student_guide

测试问题：
- 相辉堂有什么历史？
- 这里适合拍照吗？
- 附近还有什么值得看？
- 光华楼有什么建筑特点？
- 如果我只有 30 分钟该怎么逛？
```

先用这个最小集合跑通技术链路，再扩展到完整 MVP 内容。
