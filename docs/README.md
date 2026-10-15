# 青史群贤 · 历史人物智能体平台

内置先秦至清代的历史人物本体（40 人），可据本体派生个性化分身，并组织多人就一个话题展开**有明确终点的**轮次制论辩；发言严格受人物历史档案约束。

- 技术栈：Next.js 15（App Router）+ TypeScript + Prisma + SQLite + Tailwind CSS
- 模型：任意 OpenAI 兼容接口（DeepSeek、通义、智谱、Moonshot 等），后台可配
- 形态：本地单用户，免登录

## 一、快速开始

```bash
npm install
npm run avatars       # 生成 104 枚 Q 版头像（可选，仓库已忽略产物，需重建时执行）
npm run db:setup     # 建库 + 导入 104 位人物本体 + 初始化配置
npm run dev          # 打开 http://localhost:3000
```

首次开辩前，请先到 **后台（/admin）→ 模型接口** 填写 `base_url`、`api_key`、`model`，点「连接测试」确认连通。

### 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发服务器 |
| `npm run build` / `npm start` | 生产构建与启动 |
| `npm run db:setup` | 建库并导入种子数据（可反复执行，按 slug 覆盖历史字段、保留启停状态） |
| `npm run db:reset` | 清库重建后重新导入 |
| `npm run validate:figures` | 校验 `seed/figures/*.json` 字段完整性与枚举合法性 |
| `npm run avatars` / `avatars:force` | 生成 / 全部重新生成 Q 版人物头像到 `public/avatars/` |
| `npm run smoke:debate` | 用本地模拟模型跑通「开辩 → 轮次 → 结辩 → 辩要/评点 → 导出 → 续场」全流程（需先 `npm run dev` 开启 3000 端口） |
| `npm run typecheck` | TypeScript 类型检查 |

## 二、文档索引

| 文档 | 内容 |
| --- | --- |
| [需求规格说明](./需求规格说明.md) | 产品定位、三类核心能力、范围与约束 |
| [交互与界面说明](./交互与界面说明.md) | 五个页面的 UE/UI 流程、状态与关键交互 |
| [数据与头像规范](./数据与头像规范.md) | 人物种子字段规范、校验规则、头像来源策略与降级链路 |
| [辩论机制说明](./辩论机制说明.md) | 轮次推进、结辩、终止判定、续场、判官评点、提示词分层、接口契约 |
| [技术架构](./技术架构.md) | 技术选型、数据模型、目录结构、可靠性与安全注意 |

## 三、目录速览

```
head-metting/
├── docs/                  # 全部文档
├── prisma/
│   ├── schema.prisma      # 数据模型
│   ├── seed.ts            # 种子导入（人物档案只从此处写入）
│   └── dev.db             # 本地 SQLite（已 gitignore）
├── seed/
│   ├── figures/*.json     # 100 位人物不可变基础数据（按朝代分文件）
│   ├── q-looks.json       # Q 版头像造型表（冠帽/道具/须眉/表情/服色）
│   └── avatars.result.json# 头像生成结果（脚本生成）
├── scripts/
│   ├── generate-avatars.mjs # Q 版头像生成器
│   ├── validate-figures.mjs
│   └── smoke-debate.mjs
├── public/avatars/        # Q 版头像 SVG（脚本生成）
└── src/
    ├── app/               # 页面与 API 路由
    ├── components/        # ink 基础件 / figures / personas / debate / admin
    └── lib/               # db、llm、prompt、debate、settings、queries、actions
```

## 四、三条核心链路的入口

- **人物库**：`/figures` → 卡片 → `/figures/[slug]` 档案（只读，标注「官方本体 · 不可修改」）
- **分身**：档案页「据本体创建分身」或 `/personas/new` → `/personas` 管理与复用
- **论辩**：`/debate` 设席开辩 → `/debate/[id]` 舞台 → `/debate/history` 辩录（回看 / 续场 / 导出 Markdown）
