<div align="center">

```
██████╗  █████╗ ██╗  ██╗██╗
██╔══██╗██╔══██╗██║  ██║██║
██║  ██║███████║███████║██║
██║  ██║██╔══██║██╔══██║██║
██████╔╝██║  ██║██║  ██║███████╗
╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
```

# dahl-bulk-apikey

**批量创建 Dahl Inference 账户并自动生成 API 密钥 — 兼容 OpenAI 的推理 + 9Router 连接器。**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-3%20served-412991?style=for-the-badge)](https://inference.dahl.global/docs)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 快速开始](#-quick-start) · [🎁 免费额度](#-free-tier--how-much-you-get) · [🤖 模型](#-models--all-3-of-them) · [🧪 使用 API](#-how-to-use-the-api) · [✅ 已验证](#-verified-working--every-key-is-tested) · [🧭 工作原理](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ 选项](#️-cli-options) · [🛰️ 代理](#️-behind-a-proxy) · [🐞 问题](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ 为什么会有这个项目

Dahl Inference 为**每个账户提供 100,000,000 代币的欢迎赠额**，而且账户的第一个 API 密钥会由注册调用本身直接返回。赠额存放在*账户池*中，通过一次 `allocate` 调用即可转移到密钥上——这正是为什么这里以“一个账户对应一个密钥”为正确单位。整个流程都是**纯 REST JSON**：无需邮箱、无需手机、无需银行卡、无需验证码、无需浏览器。

## 🎁 免费额度 — 你能获得多少

**每个新的 Dahl 账户都带有 100,000,000 代币的欢迎赠额——无需邮箱、无需手机、无需银行卡、无需验证码。**

| 项目 | 值 |
| --- | --- |
| 欢迎赠额 | 每个账户 **100,000,000 代币** — 注册后立即 `GET /v1/account` 会报告 `token_balance = 100000000` |
| 需要银行卡 | **否** |
| 有效期 | 无 — 赠额不会过期 |
| 速率限制 | 无每分钟速率限制；聊天受**模型容量**限制（免费账户排在付费账户之后 → `429 model_concurrency`，几秒后重试或改用其他已提供的模型） |
| 注册 | REST：`POST /v1/auth/signup {"username":"adj_noun_123"}` — 无需邮箱 |
| 可扩展的单位 | **一个账户 = 一个密钥**（赠额是按账户计算的：同一账户上的第二个密钥从 0 开始）→ `--count N` 实际上就是“N × 100M 代币” |

端到端实测：注册 → `POST /v1/account/allocate` 将赠额转移到密钥上 → `GET /tokens/current` 返回 `{"available_tokens": 100000000}`。余额为零的密钥在聊天时会返回 `402 available tokens exhausted`。

> 💡 免费额度由 Dahl Inference 设定，可能会变化。请在 [inference.dahl.global](https://inference.dahl.global) 查看实时数据——并让工具自身的校验来决定：

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 模型 — 全部 3 个

`GET /v1/models`（公开，无需认证）目前提供 **3 个模型**：

|模型|✓|
|---|---|
|`MiniMaxAI/MiniMax-M2.7`|✓|
|`deepseek-ai/DeepSeek-V4-Flash-0731`|✓|
|`zai-org/GLM-5.3-Flash`|✓|

对某个密钥的实时探测：

```bash
curl https://inference.dahl.global/v1/chat/completions \
  -H "Authorization: Bearer dahl_…" -H "Content-Type: application/json" \
  -d '{"model":"MiniMaxAI/MiniMax-M2.7","messages":[{"role":"user","content":"hi"}]}'
```

> Dahl 还会在**完全无需认证**的情况下响应 `POST /tokens`，并发放同样的 `{"token":"dahl_…","available_tokens":100000000}` 赠额，之后可通过 `POST /v1/account/keys/claim` 关联到账户。本工具使用真实账户；之所以记录匿名途径，是因为它携带相同的赠额。

## 🧪 如何使用 API

基础 URL 是 **`https://inference.dahl.global/v1`** — 兼容 OpenAI，因此任何支持 OpenAI 的工具都能使用。

**任意 SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://inference.dahl.global/v1", api_key="dahl_…")
print(client.chat.completions.create(model="MiniMaxAI/MiniMax-M2.7",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**余额查询**（工具在信任某个密钥之前所做的同一个调用）：

```bash
curl https://inference.dahl.global/tokens/current -H "Authorization: Bearer dahl_…"
# {"available_tokens": 100000000}
```

**任何支持自定义基础 URL 的代理 / 工具**（Cursor、OpenCode、Kilo Code 等）：基础 URL 填 `https://inference.dahl.global/v1`，粘贴一个密钥，从 3 个模型 id 中选择一个。

## 🛠 快速开始

```bash
# clone or fork this repository, then:
cd dahl-bulk-apikey

# 1) your proxy list, one per line (http://, socks5://, socks4:// or bare host:port) — optional
printf 'socks5://127.0.0.1:1080\n' > proxies.txt   # optional — without it the tool runs direct

# 2) go
node src/launcher.js        # interactive: mint / verify / screen / settings
# or directly:
node src/cli.js --count 30  # any N — 30 is just the default sample
```

`keys.txt`（每行一个密钥，同时镜像到 `%USERPROFILE%\dahl-keys.txt`）**只有**在实时聊天补全证明该密钥可用之后才会写入；`accounts.json` 保留用户名 / 指纹 / 密钥 id，以便之后恢复任何账户（`src/recover.js`）。

### 🖱️ 启动器

启动器会询问代理列表（可选——不填则 CLI 直接运行）和数量，将它们记住在 `launcher.config.json` 中，然后运行 CLI——包括铸造、验证、筛选代理、设置、帮助以及*连接到 9Router*。

## ✅ 已验证可用 — 每个密钥都经过测试

> **质量关卡。** 这里的每个密钥在写入 `keys.txt` 之前都通过了实时 `chat-200`
> （绝不提供失效密钥）。路由组合在模型层面遵循同样的规则：只有当模型能返回 `chat-200`
> 且能调用工具时，才会添加条目——不支持工具调用的模型、失效的密钥或失效的提供商会
> 被丢弃而不是添加。适用于 **9Router 和 OmniRoute**。

| 检查 | 结果 |
| --- | --- |
| `POST /v1/auth/signup` | **201** + `api_key.token` + `fingerprint` — 任何步骤都无需邮箱、手机、银行卡或验证码 |
| `POST /v1/account/allocate {amount:100000000}` | **200**，随后 `GET /tokens/current` 报告 **100000000** |
| `POST /v1/chat/completions`（`MiniMaxAI/MiniMax-M2.7`）— 在写入**每个**密钥之前都会运行 | **200**，带有真实的 `choices[0].message.content` 和 `usage` 块 |
| 聊天检查失败的密钥 | 绝不写入 `keys.txt` — 账户仍可在 `accounts.json` 中恢复 |

```bash
node src/cli.js --verify-only      # GET /tokens/current + a chat call per key
node src/cli.js --screen           # only screen your proxy list
```

## 🧭 工作原理

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Dahl Inference page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://inference.dahl.global/v1/chat/completions → real content = the key is live
```

| 步骤 | 调用 | 说明 |
| --- | --- | --- |
| 健康检查 | `GET /health` | 出口的可达性（无需认证） |
| 用户名检查 | `GET /v1/auth/check-username?username=…` | `200 {"available":true,"valid":true}`；已被占用 → `{"available":false,"suggestions":[…]}` |
| **注册** | `POST /v1/auth/signup {"username":"…"}` | `201` + 会话 cookie + `{user, fingerprint, api_key}`；用户名格式为 `^[a-z0-9_]{3,20}$`（本工具生成 `adjective_noun_123`） |
| 登录（恢复） | `POST /v1/auth/signin {"fingerprint":"…"}` | `200` + 会话 cookie — 指纹是账户唯一的凭据，因此代理失效也绝不会丢失账户 |
| 账户状态 | `GET /v1/account` | `{user, paid, token_balance, tokens_on_keys}` |
| 分配赠额 | `POST /v1/account/allocate {"key_id":…, "amount":100000000}` | 整个赠额就是账户池（池为空时返回 `400 not enough tokens in pool`） |
| 密钥余额 | `GET /tokens/current` | `Bearer dahl_…` → `{"available_tokens":100000000}` |
| 推理 | `POST /v1/chat/completions` | OpenAI 格式；`GET /v1/models` 是公开的 |

## ⚙️ CLI 选项

```bash
node src/cli.js --count N        # screen exits, mint, allocate, verify (any N, default 30)
node src/cli.js --verify-only    # re-verify every key in keys.txt
node src/cli.js --screen         # only screen your proxy list
node src/cli.js --connect-9router  # …and register every key in keys.txt into 9Router
node src/cli.js --help
```

| 环境变量 | 默认值 | 含义 |
| --- | --- | --- |
| `DAHL_PROXIES` | `proxies.txt` | 代理池文件，每行一个代理 — 可选：没有代理池时 CLI 直接连接 |
| `DAHL_MODEL` | `MiniMaxAI/MiniMax-M2.7` | 用于实时验证的模型 |
| `DAHL_AMOUNT` | `100000000` | 分配给每个密钥的欢迎赠额 |

## 🛰️ 在代理之后

**可选 — 大规模使用时推荐（按 IP 的限制、封禁）。** 本工具在没有代理时也能工作。

- **有代理池时：** 将出口写入 `proxies.txt`（或设置 `DAHL_PROXIES`），每个请求都会经过一行代理——代理池会在使用时重新探测，失效的行会导致该账户尝试失败，工具会继续处理下一个（`accounts.json` 中的指纹让你之后可以从任何其他出口完成它）。
- **没有代理池时：** CLI 会打印 `running WITHOUT a proxy (direct)` 并直接连接；注册、分配和验证都不变——只是数据包发出的位置不同。
- `--screen` 在两种模式下都可用：在运行前用你拥有的出口（或直连路线）对主机进行测试。

## 📄 文件

| 路径 | 内容 |
| --- | --- |
| `keys.txt` | 每行一个经过实时验证的密钥 — 已被 git 忽略，绝不提交 |
| `accounts.json` | 用户名 / user_id / 指纹 / 密钥 id — 足以恢复任何账户 |
| `/v1/models` | 实时目录（公开，无需认证）— 3 个 id |
| `proxies.txt` | 你的出口，每行一个 — 已被 git 忽略 |
| `outputs/` | 运行日志和状态 — 已被 git 忽略 |

## 🔌 连接到 9Router

[9Router](https://9router.com) 是一个自托管、兼容 OpenAI 的路由器。Dahl 提供兼容 OpenAI 的端点，因此注册一次，每个密钥都会成为一个提供商节点下的连接：

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

不带 `--api-key` 运行它会注册 `keys.txt` 中的**每一个**密钥。重复运行是幂等的：节点通过 `--prefix dahl` 匹配，每个连接通过名称匹配（`dahl-001`、`dahl-002` 等）。默认值：`--base http://localhost:20128`、`--password 123456`、`--name "Dahl Inference"`、`--prefix dahl`、`--base-url https://inference.dahl.global/v1`、`--model MiniMaxAI/MiniMax-M2.7`。模型随后以 `dahl/<model id>` 的形式提供。

## 🔌 连接到 OmniRoute

[OmniRoute](https://omniroute.online) 是一个自托管、兼容 OpenAI 的路由器。Dahl 提供兼容 OpenAI 的端点，因此注册一次，每个密钥都会成为一个提供商节点下的连接：

```bash
node src/connect-omniroute.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

不带 `--api-key` 运行它会注册 `keys.txt` 中的**每一个**密钥。重复运行是幂等的：节点通过 `--prefix dahl` 匹配，每个连接通过名称匹配（`dahl-001`、`dahl-002` 等）。默认值：`--base http://localhost:20128`、`--password 123456`、`--name "Dahl Inference"`、`--prefix dahl`、`--base-url https://inference.dahl.global/v1`、`--model MiniMaxAI/MiniMax-M2.7`。模型随后以 `dahl/<model id>` 的形式提供。
## 🔑 一个密钥能给你带来什么

| | |
| --- | --- |
| 🏢 提供商 | **Dahl Inference** — [inference.dahl.global](https://inference.dahl.global) |
| 🎁 提供商提供的内容 | 每个账户 100M 免费代币 — 纯 REST 注册，无需邮箱，无需银行卡 |
| 🔑 一个密钥能给你带来什么 | 一个限定于其自身账户的 API 密钥：下方端点上的模型 id，受你的计划限制。配额存放在**账户**上，这正是本工具为每个密钥创建一个账户的原因 |
| 🌐 API 格式 | 兼容 OpenAI：`POST https://inference.dahl.global/v1/chat/completions` |
| 🔒 你的数据 | 只联系 `inference.dahl.global` — 完全没有邮箱步骤；密钥保留在你的机器上 |

## 🐞 问题

如果 Dahl 更改了注册格式、分配语义或速率限制，工具会在该步骤停止并说明原因。请**[提交 issue](../../issues)**，附上你运行的命令和确切的输出；欢迎 PR。

## 📄 许可证

MIT © 2026 — 参见 [LICENSE](LICENSE)。

<div align="center">

**[MIT](LICENSE)** © 2026 dahl-bulk-apikey contributors

</div>

## ⚡ 运行形态（预设）

`--preset=turbo|balanced|safe` 设置工作线程数 + 账户之间的暂停时间（turbo = 5，
balanced = 4，safe = 2）；显式的 `--conc`/`--gap`（或仓库自身的标志）始终优先，
而不带 `--preset` 时，工具会完全保持其历史形态。

推荐使用 Turbo（5 个工作线程）；更多线程在性能较弱的电脑上有负载/封禁风险。