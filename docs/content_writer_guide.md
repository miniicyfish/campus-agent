# 校园导览 Agent 内容交付指南（代码库可用版）

## 1. 这份指南解决什么问题

这份文档给没有技术背景的内容同学使用，但最终目标不是交付 Word 文档或自由格式文本，而是交付**可以直接放进代码库使用的内容文件**。

所以规则是：

```text
说明可以用中文，正文可以用中文；
但文件名、字段名、ID 必须使用固定英文格式。
```

原因很简单：后续程序会按这些英文文件名和字段读取内容。如果字段被改成中文，代码就无法稳定解析。

## 2. 内容同学最终要交付哪些文件

内容同学交付的文件会直接放进代码库。可以把它理解成：你写的不是普通文档，而是 App 后续会读取的“内容数据”。

不同文件负责不同用途：

| 文件类型 | 中文解释 | 后续怎么用 |
| --- | --- | --- |
| 点位知识库 | 每个校园地点的完整资料，比如基础介绍、历史、建筑特征、拍照建议、常见问题 | 用于 chatbot 问答和 RAG 知识库检索 |
| 到点自动讲解稿 | 用户走到某个点位后，App 自动弹出的固定讲解内容 | 用于导览模式的 GPS 到点自动讲解 |
| 点位坐标表 | 每个点位的经纬度、触发半径、地图展示信息 | 用于地图展示、GPS 到点判断、附近点位判断 |
| 路线数据 | 提前设计好的导览路线，包括路线主题、点位顺序、停留时间 | 用于路线展示和导览模式 |
| 路线匹配规则 | 什么用户适合哪条路线，比如高中生 30 分钟适合梦校风路线 | 用于根据用户回答推荐预设路线 |
| 拍照识图候选对象 | 每个点位有哪些可能被用户拍到的对象，比如建筑正面、牌匾、展板 | 用于拍照识图后辅助判断用户拍到了什么 |
| Agent 人设 | 不同导览员的说话风格和边界，比如普通大学生、校史协会成员 | 用于控制 chatbot 和讲解风格 |
| RAG 测试问题 | 模拟真实用户会问的问题，以及期望系统检索到哪些资料 | 用于测试问答系统是否能找对内容 |

### 2.1 点位相关文件

点位相关文件用于描述校园里每一个地点。比如“相辉堂”“光华楼”“正门”都各自是一组点位内容。

每个点位至少需要交付：

```text
knowledge/spots/{spot_id}.md
knowledge/guide_scripts/{spot_id}.json
data/spots.json 中对应的一条记录
```

含义：

- `knowledge/spots/{spot_id}.md`：这个点位的完整知识库文档，后续用于问答检索。
- `knowledge/guide_scripts/{spot_id}.json`：这个点位在导览路线里的自动讲解稿，用户走到这里时直接展示。
- `data/spots.json`：这个点位的基础信息和坐标，包括经纬度、GPS 触发半径、地图展示摘要。

示例：

```text
knowledge/spots/xianghui_hall.md
knowledge/guide_scripts/xianghui_hall.json
data/spots.json 里的 xianghui_hall 记录
```

### 2.2 路线相关文件

路线相关文件用于描述提前设计好的导览路线，以及用户回答问题后应该匹配到哪条路线。

每条路线至少需要交付：

```text
data/routes.json
data/route_matching_rules.json
```

含义：

- `data/routes.json`：所有预设路线，包括路线名称、点位顺序、预计时间、每站停留时间。
- `data/route_matching_rules.json`：用户回答问题后，系统应该推荐哪条路线。

### 2.3 问答、拍照和 Agent 相关文件

这些文件用于支持 chatbot 问答、拍照识图和不同导览员风格。

需要交付：

```text
data/photo_targets.json
data/rag_eval_questions.json
knowledge/agents/{agent_id}.md
```

含义：

- `data/photo_targets.json`：所有可拍照识别对象的清单。
- `data/rag_eval_questions.json`：问答测试题集合，用来检查 RAG 是否检索正确。
- `knowledge/agents/{agent_id}.md`：导览员人设，比如普通大学生、校史协会成员、小红薯主理人。

### 2.4 推荐目录结构

推荐目录结构：

```text
campus-agent/
  knowledge/
    spots/
      main_gate.md
      old_gate.md
      xianghui_hall.md
      guanghua_tower.md
    guide_scripts/
      main_gate.json
      xianghui_hall.json
    agents/
      student_guide.md
      history_association.md
      xiaohongshu_curator.md
  data/
    spots.json
    routes.json
    route_matching_rules.json
    photo_targets.json
    rag_eval_questions.json
```

## 3. 最重要的固定规则

### 3.1 ID 和文件名必须保持一致

每个点位都要写一个稳定的 `spot_id`。`spot_id` 用英文小写和下划线，文件名也要和它保持一致。

例如：

| 中文名 | spot_id | 文件名 |
| --- | --- | --- |
| 相辉堂 | `xianghui_hall` | `xianghui_hall.md` |
| 光华楼 | `guanghua_tower` | `guanghua_tower.md` |
| 正门 | `main_gate` | `main_gate.md` |

不要写成：

```text
相辉堂.md
xianghui-hall.md
XianghuiHall.md
```

### 3.2 字段名必须保持英文

正确：

```yaml
spot_id: xianghui_hall
name: 相辉堂
aliases:
  - 相辉堂
  - 复旦相辉堂
```

错误：

```yaml
点位ID：xianghui_hall
点位名称：相辉堂
别名：相辉堂、复旦相辉堂
```

中文字段虽然更好懂，但代码不能稳定读取，所以不能作为最终交付格式。

### 3.3 JSON 文件必须是合法 JSON

JSON 里：

- 字段名要用英文双引号
- 字符串要用双引号
- 最后一项后面不能多逗号
- 不要写注释

正确：

```json
{
  "spot_id": "xianghui_hall",
  "name": "相辉堂"
}
```

错误：

```json
{
  spot_id: "xianghui_hall", // 这是相辉堂
  "name": "相辉堂",
}
```

## 4. 点位知识库文件

### 4.1 文件位置

```text
knowledge/spots/{spot_id}.md
```

示例：

```text
knowledge/spots/xianghui_hall.md
```

### 4.2 可直接使用的模板

复制下面模板，修改内容，不要改字段名和标题结构。

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

用 150-300 字介绍这个点位是什么，为什么值得看。

## 历史沿革

用 200-500 字介绍和这个点位有关的历史。涉及年份、人物、事件时必须写清来源。

## 建筑特征

用 200-500 字介绍用户站在现场可以观察到什么，比如外观、位置、尺度、周边环境、和其他点位的关系。

## 校园生活关联

用 150-400 字说明这个地方和学生日常、校园活动、毕业、上课、自习、拍照、集合等有什么关系。

## 趣味故事

写 1-3 个可以轻松讲给用户听的小故事。没有可靠故事可以写“暂无可靠资料”。

## 拍照建议

写 100-300 字，说明哪里适合拍、什么时候适合拍、拍什么细节。

## 常见问题

### 这里最值得看什么？

回答。

### 这里有什么历史？

回答。

### 这里适合拍照吗？

回答。

## 资料来源

- 来源 1：
- 来源 2：
- 来源 3：
```

### 4.3 必须保留的字段

| 字段 | 能不能改字段名 | 内容怎么填 |
| --- | --- | --- |
| `spot_id` | 不能改 | 自己为点位填写的英文 ID，要和文件名一致 |
| `name` | 不能改 | 中文展示名 |
| `aliases` | 不能改 | 用户可能会叫它的名字 |
| `type` | 不能改 | 点位类型，如校史建筑、草坪、图书馆 |
| `campus` | 不能改 | 所属校区 |
| `tags` | 不能改 | 内容标签 |
| `recommended_audiences` | 不能改 | 适合人群 |
| `source_status` | 不能改 | `待补充` / `待核验` / `已核验` / `可上线` |

### 4.4 必须保留的章节标题

这些二级标题不要改名，因为后续 RAG 会按标题切分内容：

```text
## 基础介绍
## 历史沿革
## 建筑特征
## 校园生活关联
## 趣味故事
## 拍照建议
## 常见问题
## 资料来源
```

可以增加章节，但不要删除上述章节。

## 5. 点位坐标文件

### 5.1 文件位置

```text
data/spots.json
```

这个文件是程序判断 GPS 到点、地图展示点位、附近点位检索的基础，必须保留坐标。

### 5.2 可直接使用的格式

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

| 字段 | 是否必填 | 内容同学要做什么 |
| --- | --- | --- |
| `spot_id` | 必填 | 和点位 Markdown 里的 `spot_id` 完全一致 |
| `name` | 必填 | 中文名 |
| `aliases` | 必填 | 补充用户可能叫法 |
| `campus` | 必填 | 所属校区 |
| `type` | 必填 | 点位类型 |
| `lat` | 必填 | 纬度，需要真实坐标 |
| `lng` | 必填 | 经度，需要真实坐标 |
| `default_trigger_radius_meters` | 必填 | GPS 触发半径，一般 50-80 |
| `map_icon` | 可选 | 图标类型 |
| `summary` | 必填 | 一句话介绍 |
| `available` | 必填 | MVP 是否启用，填 `true` 或 `false` |

### 5.4 坐标填写建议

可以用地图软件查经纬度。每个点位至少填写一个中心点坐标。

触发半径建议：

| 点位类型 | 建议半径 |
| --- | --- |
| 建筑入口 | 40-60 米 |
| 大型建筑 | 60-80 米 |
| 草坪 / 广场 | 80-120 米 |
| 道路 / 景观带 | 80-150 米 |

如果不确定坐标准确性，把 `source_status` 或备注标为 `待核验`，不要随便填。

## 6. 到点自动讲解文件

### 6.1 文件位置

```text
knowledge/guide_scripts/{spot_id}.json
```

示例：

```text
knowledge/guide_scripts/xianghui_hall.json
```

### 6.2 可直接使用的格式

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
    "content": "现在你看到的是相辉堂。对很多第一次来复旦的人来说，这里很容易成为一个有记忆点的地方。你可以先观察它和周围开阔空间之间的关系，再留意建筑入口、立面和周边人流。",
    "follow_up_suggestions": [
      "这里有什么历史？",
      "适合在哪里拍照？",
      "附近还有什么值得看？"
    ]
  }
]
```

### 6.3 内容要求

| 项目 | 要求 |
| --- | --- |
| 60 秒讲解 | 200-350 中文字 |
| 30 秒讲解 | 100-180 中文字 |
| 2 分钟讲解 | 500-800 中文字 |
| 建议追问 | 2-3 个 |

讲解正文建议包含：

```text
1. 你现在看到的是什么
2. 它为什么值得看
3. 它和当前路线有什么关系
4. 用户可以现场观察什么
5. 可以继续追问什么
```

## 7. 路线文件

### 7.1 文件位置

```text
data/routes.json
```

### 7.2 可直接使用的格式

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
        "guide_script_id": "main_gate_dream_school",
        "reason": "作为进入校园的第一印象，适合建立来到复旦的仪式感。"
      },
      {
        "spot_id": "xianghui_hall",
        "order": 2,
        "estimated_stay_minutes": 8,
        "trigger_radius_meters": 60,
        "guide_script_id": "xianghui_hall_dream_school",
        "reason": "适合讲校园公共空间、仪式感和拍照记忆。"
      }
    ],
    "ending_message": "这条路线适合快速建立对复旦校园的第一印象。"
  }
]
```

### 7.3 路线设计要求

- 30 分钟路线建议 3-5 个点位。
- 1 小时路线建议 5-8 个点位。
- 每个 stop 都必须有 `spot_id`、`order`、`guide_script_id`。
- `spot_id` 必须能在 `data/spots.json` 找到。
- `guide_script_id` 必须能在 `knowledge/guide_scripts/*.json` 找到。

## 8. 路线匹配规则文件

### 8.1 文件位置

```text
data/route_matching_rules.json
```

### 8.2 可直接使用的格式

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
  }
]
```

内容同学重点填写：

- 什么用户适合什么路线
- 推荐理由是什么
- 规则优先级大概谁更高

## 9. 拍照识图候选对象文件

### 9.1 文件位置

```text
data/photo_targets.json
```

### 9.2 可直接使用的格式

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
      "这里适合拍照吗？"
    ],
    "related_chunk_types": ["intro", "history", "architecture", "photo"]
  }
]
```

每个点位建议准备 2-4 个可拍对象：

- 建筑整体
- 入口或牌匾
- 周边空间
- 重要展板或雕塑
- 适合拍照的角度

## 10. Agent 人设文件

### 10.1 文件位置

```text
knowledge/agents/{agent_id}.md
```

示例：

```text
knowledge/agents/student_guide.md
```

### 10.2 可直接使用的格式

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

## 11. RAG 测试问题文件

### 11.1 文件位置

```text
data/rag_eval_questions.json
```

### 11.2 可直接使用的格式

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
  }
]
```

每个点位至少准备 5 个问题：

```text
1. 这是什么地方？
2. 这里有什么历史？
3. 这里最值得看什么？
4. 这里适合拍照吗？
5. 附近还有什么值得看？
```

## 12. 内容质量要求

### 12.1 事实要求

涉及这些内容必须有来源或标注待核验：

- 年份
- 人物
- 历史事件
- 建筑设计单位
- 开放时间
- 门禁政策
- 校园规定

### 12.2 表达要求

内容要适合现场导览：

- 看得见
- 听得懂
- 能引导观察
- 能支持追问
- 不要像百科词条
- 不要像宣传稿

### 12.3 资料状态

统一使用：

```text
待补充
待核验
已核验
可上线
```

## 13. 交付检查清单

### 13.1 点位 Markdown

- 文件名是否是 `{spot_id}.md`。
- `spot_id` 是否和文件名一致。
- frontmatter 字段名是否是英文。
- 是否保留所有固定二级标题。
- 是否有资料来源。
- 是否有拍照建议。
- 是否至少有 3 个常见问题。

### 13.2 spots.json

- 每个点位是否有 `lat` 和 `lng`。
- 经纬度是否是真实坐标。
- `spot_id` 是否和 Markdown 文件一致。
- `default_trigger_radius_meters` 是否合理。
- `available` 是否填写。

### 13.3 routes.json

- 每条路线是否有 `route_id`。
- 每个 stop 是否有 `spot_id`。
- 每个 stop 是否有 `guide_script_id`。
- 点位顺序是否符合实际步行体验。
- 路线时长是否合理。

### 13.4 guide_scripts

- `guide_script_id` 是否唯一。
- `spot_id` 是否存在。
- `route_id` 是否存在。
- `content` 是否控制在目标长度。
- 是否有建议追问。

### 13.5 photo_targets

- 每个对象是否有 `target_id`。
- 每个对象是否绑定 `spot_id`。
- 是否写了视觉特征。
- 是否写了相关知识类型。

## 14. 内容同学不要做什么

不要做：

- 不要把英文字段改成中文字段。
- 不要自己改 `spot_id`、`route_id`、`agent_id`。
- 不要删除固定标题。
- 不要把多个点位写在一个 Markdown 里。
- 不要提交 Word / PDF 作为最终格式。
- 不要写不合法 JSON。
- 不要把没有来源的事实写死。
- 不要为了有趣编故事。

## 15. 最小交付版本

如果时间紧，每个点位至少交付：

```text
1. knowledge/spots/{spot_id}.md
2. data/spots.json 中该点位的一条记录
3. knowledge/guide_scripts/{spot_id}.json 中至少一段 60 秒讲解
4. data/photo_targets.json 中至少 2 个可拍对象
5. data/rag_eval_questions.json 中至少 5 个测试问题
```

每条路线至少交付：

```text
1. data/routes.json 中一条路线
2. data/route_matching_rules.json 中至少一条匹配规则
3. 每个 stop 对应的 guide_script_id
```

## 16. 推荐工作方式

内容同学可以不理解代码，但必须照模板交付。

推荐流程：

```text
1. 为点位、路线、Agent 写好英文 ID，例如 `xianghui_hall`、`dream_school_route`、`student_guide`
2. 用英文 ID 创建对应文件名，例如 `knowledge/spots/xianghui_hall.md`
3. 复制对应模板
4. 填写中文正文和资料来源
5. 补充坐标、拍照对象、测试问题
6. 用 JSON 校验工具检查 JSON 文件格式
7. 提交到代码库指定目录
8. 根据校验脚本提示修正缺失字段或格式错误
```

最终标准不是“人能看懂”，而是：

```text
人能看懂 + 程序能直接读取 + RAG 能稳定切片和检索。
```
