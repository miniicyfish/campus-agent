> **important**
> 我是一个git小白，所以你要时刻提醒我做版本管理，并且教我为什么要做这些事情
> 当我想加一些新的东西的时候，请你遵循这个原则：
> 开新branch（或者继承现在已经有的branch） - 做一些commit - merge
> 不允许在main分支上直接commit或者做merge / pr / rebase 以外的修改
> 必须遵循commit规范，就是类似这样的commit模版：feat(api):this is a commit

## Project Layout
- `campus-agent/`: Next.js app and content repository.
- `campus-agent/src/`: application code.
- `campus-agent/knowledge/`: agent personas, spot knowledge, and guide scripts.
- `campus-agent/data/`: structured spot, route, photo target, and test data.
- Root `*.md` files: product, flow, and implementation notes.

## Commands
Run app commands from `campus-agent/`:

```sh
npm run dev
npm run build
```

## Notes
- Keep edits scoped and avoid unrelated refactors.
- Preserve existing file names, IDs, and JSON field names.
- JSON files must stay valid JSON.
- Mark uncertain historical or factual content as `待核验`.
