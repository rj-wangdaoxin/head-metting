# 部署到 Render（免费，自带域名）

把本站部署到公网，让别人打开一个网址就能体验。方案：**Render 免费 Web Service + Neon 免费 Postgres**，两者都不需要信用卡。

- **域名**：Render 自动分配 `https://<你的服务名>.onrender.com`，无需购买
- **费用**：免费；代价是 15 分钟无人访问会休眠，下一次打开需等 30–60 秒唤醒
- **数据**：存在 Neon Postgres，不因重新部署而丢失

## 一、准备三样东西

### 1. GitHub 仓库（本项目还没有 git 仓库，先建一个）

```bash
cd d:/tmp/head-metting
git init
git add .
git commit -m "青史群贤：历史人物智能体平台"
git branch -M main
git remote add origin https://github.com/<你的账号>/head-metting.git
git push -u origin main
```

`.gitignore` 已排除本地数据库、`.env` 与头像图片（头像在部署时由 `npm run avatars` 重新生成），不会误传密钥。

### 2. Neon 免费 Postgres

1. 打开 <https://neon.tech> 注册（GitHub 登录即可）
2. 新建 Project，区域选 **Singapore**（离国内较近）
3. 复制连接串：Dashboard → Connection details → **Pooled connection**，形如
   `postgresql://user:example@example.com/neondb?sslmode=require`

### 3. 一个 OpenAI 兼容的模型接口

记下 `base_url`、`api_key`、`model`。本项目用的是这类接口（如 DeepSeek、通义、智谱、Moonshot 或你现在的 uniapi 中转均可）。

## 二、在 Render 上部署

### 方式 A：用 Blueprint（推荐，已备好 `render.yaml`）

1. <https://dashboard.render.com> → **New** → **Blueprint**
2. 选刚推上去的仓库，Render 会自动读 `render.yaml`
3. 面板会要求填写标记为 sync: false 的变量，按下表填入
4. 点 **Apply**，等待构建（首次约 5–10 分钟）

### 方式 B：手动创建 Web Service

| 配置项 | 值 |
| --- | --- |
| Runtime | Node |
| Build Command | `npm install && npm run avatars && npx prisma generate --schema prisma/schema.postgres.prisma && npx prisma db push --schema prisma/schema.postgres.prisma --skip-generate && npx tsx prisma/seed.ts && npm run build` |
| Start Command | `npm start` |
| Plan | Free |
| Region | Singapore |
| Health Check Path | `/login` |

### 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | 是 | Neon 的 Pooled connection 串 |
| `APP_SECRET` | 是 | 会话 cookie 签名密钥，填一长串随机字符 |
| `ADMIN_PASSWORD` | 强烈建议 | 后台管理口令。设了之后 `/admin` 须输口令才能进，防止访客改动模型密钥与人物启停 |
| `LLM_BASE_URL` | 建议 | 平台共用模型接口地址 |
| `LLM_API_KEY` | 建议 | 平台共用模型密钥 |
| `LLM_MODEL` | 建议 | 共用模型名 |
| `LLM_TEMPERATURE` | 否 | 默认 0.9 |
| `LLM_MAX_TOKENS` | 否 | 默认 1200 |
| `LLM_TIMEOUT_MS` | 否 | 默认 120000 |
| `NODE_OPTIONS` | 否 | 已设为 `--max-old-space-size=450`，免费实例 512MB 内存，限制堆上限以免构建期被杀 |

设了 `LLM_*` 三个变量后，**访客注册完即可直接开辩**，不必自己配密钥；访客一旦在后台填了自己的配置，就以他自己的为准。平台密钥不会下发到页面（后台只显示脱敏形态）。

## 三、上线后检查

1. 打开 `https://<服务名>.onrender.com` → 应到登录页
2. 注册一个新账号 → 进入后到「人物库」应能看到 104 位人物与头像
3. 直接发起一场辩论 → 若 `LLM_*` 已配置，无需任何设置即可生成发言
4. 访问 `/admin` → 若设了 `ADMIN_PASSWORD`，应出现解锁屏；输入口令后方可进入

## 四、数据库说明：本地 SQLite，云端 Postgres

仓库内有两份 schema，结构完全一致：

| 文件 | 用途 |
| --- | --- |
| `prisma/schema.prisma` | 本地开发，SQLite（默认） |
| `prisma/schema.postgres.prisma` | 云端部署，Postgres |

改动数据模型时**两份都要改**。

```bash
npm run db:setup      # 本地：SQLite 建表 + 导入人物
npm run db:setup:pg   # 云端：Postgres 建表 + 导入人物（需先设好 DATABASE_URL）
npx prisma generate   # 从云端切回本地开发时要跑一次，重新生成 SQLite 客户端
```

Render 的 build 命令里已包含建表与导入人物（seed 按 slug upsert，重复部署不会重复建人）。

## 五、常见问题

**构建报 `JavaScript heap out of memory`**
免费实例只有 512MB 内存。可尝试：把 `NODE_OPTIONS` 调成 `--max-old-space-size=400`；仍不行则升级 Starter 计划（约 $7/月）或改用 Fly.io。

**首次打开很久才响应**
免费实例 15 分钟无流量会休眠，唤醒约 30–60 秒，之后就正常了。想避免可在 Render 之外的平台（如 Fly.io / 自建 VPS）常驻。

**重新部署后数据没了**
不会：数据在 Neon。但注意 Render 免费实例重启会重置**文件系统**，头像等生成物每次部署重新生成，这正是 build 命令里带 `npm run avatars` 的原因。

**想换自己的域名**
Render 面板 → Settings → Custom Domains，添加你自己的域名并按提示加一条 CNAME 解析即可（免费计划也支持）。

**长发言中途断开**
发言是 SSE 流式输出，若模型迟迟不吐字，平台的空闲连接可能被掐断。建议把后台「超时」调到 30–60 秒之间；辩要与判官评点是整段生成后一次返回，同样受此约束。

**本地数据搬到线上**
线上库是全新的（只有人物档案由 seed 导入）。若要把本机的分身与辩录一起带过去，可用 `scripts/migrate-users.ts`：先 `export` 导出为 JSON，再把 `DATABASE_URL` 指向 Neon 并执行 `db:setup:pg`，最后 `import` 导入。

## 六、可选加固

开放注册意味着任何人都能立账号、用你的共用密钥开辩。若发现被滥用，可再做两件事（需要时让我加）：

1. **关闭注册**：加 `ALLOW_SIGNUP=false`，登录页只保留登录，账号由你手工分发
2. **限制单人用量**：给每个账号记 token 用量，超过额度即提示，避免一人刷爆额度

目前已有的两道防线：`ADMIN_PASSWORD`（后台改动需口令）与 `HIDE_ACCOUNT_LIST=true`（登录页不暴露已有账号名）。
