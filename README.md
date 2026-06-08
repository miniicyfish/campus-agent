# 校园导览 Agent 内容协作仓库

这个仓库用于准备校园导览 Agent 的内容文件。请先阅读：

```text
docs/content_writer_guide.md
```

内容交付目录：

```text
knowledge/spots/
```

填写每个校园点位的知识库文档。复制 `_template.md` 后改名，例如：

```text
knowledge/spots/xianghui_hall.md
```

```text
knowledge/guide_scripts/
```

填写每个点位的到点自动讲解稿。复制 `_template.json` 后改名，例如：

```text
knowledge/guide_scripts/xianghui_hall.json
```

```text
knowledge/agents/
```

填写导览员 Agent 人设。

```text
data/
```

填写点位坐标、路线、路线匹配规则、拍照识图对象和 RAG 测试问题。

提交前检查：

- 文件名、`spot_id`、`route_id`、`agent_id` 必须保持一致。
- 不要把英文字段名改成中文。
- JSON 文件必须是合法 JSON。
- 涉及年份、人物、历史事件时，要写清资料来源。
- 不确定的信息标注为 `待核验`，不要写成确定事实。
