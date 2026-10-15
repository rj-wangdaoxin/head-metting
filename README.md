# 青史群贤 · 历史人物智能体平台

内置先秦至清代 104 位人物本体（帝王、文官、武将、谋士、诗人、词人、作家、思想家、史家等），可据本体派生个性化分身，并组织多人就一个话题展开有明确终点的轮次制论辩。每位人物配一枚按其特征绘制的 Q 版水墨头像。支持多账号，各人的数据与配置互相隔离。

## 启动

```bash
npm install
npm run db:setup
npm run dev     # http://localhost:3000
```

首次打开会先到登录页：立一个账号（账号名 + 口令），随后即以该账号入座。口令在本机以 scrypt 加盐存储，不入任何日志。

自「单用户时期」升级上来的数据已归入默认账号 **主人 / headmetting**，登录后请到「后台 → 我的账号」把初始口令改掉。

## 账号与数据隔离

| 归属 | 内容 |
| --- | --- |
| 各账号私有 | 分身、辩录与全部发言、模型配置（base_url / api_key / model / temperature / max_tokens / 超时）、辩论配额（人数上限、轮数上下限与默认值、单轮与结辩字数、消息条数与 token 预算、续场次数） |
| 全站共用 | 内置人物档案（seed 固化，不可编辑）及其启停开关 |

- 登录状态写在 httpOnly 且带 HMAC 签名的 cookie 里；未登录访问页面一律送去登录页，未登录调用接口返回 401。
- 会话读取统一走 `loadSession(sessionId, userId)`，跨账号的辩录一律查不到，导出、续场、收束、发言接口同样受此约束。
- 顶栏右侧显示当前账号，可「切换 / 新建账号」或「登出」；后台「我的账号」用于改口令。
- 若需把既有数据迁到新 schema，可用 `scripts/migrate-users.ts`（先 `export`，`prisma db push` 重灌后再 `import`）。

## 部署到公网（免费分享）

想让别人打开网址就能体验，可免费部署到 **Render + Neon Postgres**，自带 `https://<服务名>.onrender.com` 域名，无需信用卡：

- 设了 `LLM_API_KEY` 等环境变量后，访客注册即可直接开辩，不必自己配密钥
- 设了 `ADMIN_PASSWORD` 后，`/admin` 须输口令才能进，密钥与人物启停不会被访客改动
- 云端用 Postgres（`prisma/schema.postgres.prisma`），本地开发仍是 SQLite（`prisma/schema.prisma`），互不影响

完整步骤见 [部署到 Render](./docs/部署到Render.md)。

**不想上云、或模型接口只在内网可达？** 也可以用 Cloudflare 免费隧道把本机站点临时开放给他人：不用服务器、不用信用卡，几分钟就能拿到公网地址，代价是电脑必须开着、地址每次启动会变。启动与关闭的完整命令见 [内网穿透分享](./docs/内网穿透分享.md)。

分享给陌生人前，建议设 `ALLOW_SIGNUP=false` 关闭注册（账号由你手工发），配合 `ADMIN_PASSWORD` 与 `HIDE_ACCOUNT_LIST=true` 使用。

完整文档见 [`docs/`](./docs/README.md)：

- [文档总览与快速开始](./docs/README.md)
- [需求规格说明](./docs/需求规格说明.md)
- [交互与界面说明（UE/UI）](./docs/交互与界面说明.md)
- [数据与头像规范](./docs/数据与头像规范.md)
- [辩论机制说明](./docs/辩论机制说明.md)
- [技术架构](./docs/技术架构.md)
- [部署到 Render](./docs/部署到Render.md)
- [内网穿透分享](./docs/内网穿透分享.md)
