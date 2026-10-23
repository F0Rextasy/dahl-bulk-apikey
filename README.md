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

**Bulk-create Dahl Inference accounts with auto-generated API keys — OpenAI-compatible inference + 9Router connector.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-3%20served-412991?style=for-the-badge)](https://inference.dahl.global/docs)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Quick start](#-quick-start) · [🎁 Free tier](#-free-tier--how-much-you-get) · [🤖 Models](#-models--all-3-of-them) · [🧪 Use the API](#-how-to-use-the-api) · [✅ Verified](#-verified-working--every-key-is-tested) · [🧭 How it works](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Options](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Issues](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Why this exists

Dahl Inference hands out a **100,000,000-token welcome grant per account**, and the account's first API key is returned by the sign-up call itself. The grant lives on the *account pool* and is moved onto the key with a single `allocate` call — which is exactly why one account per key is the right unit here. The whole flow is **plain REST JSON**: no e-mail, no phone, no card, no captcha, no browser.

## 🎁 Free tier — how much you get

**Every new Dahl account carries a 100,000,000-token welcome grant — no e-mail, no phone, no card, no captcha.**

| What | Value |
| --- | --- |
| Welcome grant | **100,000,000 tokens** per account — `GET /v1/account` reports `token_balance = 100000000` right after sign-up |
| Card required | **No** |
| Expiry | none — the grant does not expire |
| Rate limit | no per-minute rate; chat is gated by **model capacity** (free accounts are admitted after paid ones → `429 model_concurrency`, retry a few seconds later or use another served model) |
| Sign-up | REST: `POST /v1/auth/signup {"username":"adj_noun_123"}` — no mailbox |
| The unit that scales | **one account = one key** (the grant is per account: a second key on the same account starts at 0) → `--count N` is really "N × 100M tokens" |

Measured end to end: sign-up → `POST /v1/account/allocate` moves the grant onto the key → `GET /tokens/current` answers `{"available_tokens": 100000000}`. A key with a zero balance answers `402 available tokens exhausted` on chat.

> 💡 The free tier is set by Dahl Inference and can change. Check the live numbers at [inference.dahl.global](https://inference.dahl.global) — and let the tool's own gate decide:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Models — all 3 of them

`GET /v1/models` (public, no auth) currently serves **3 models**:

|Model|✓|
|---|---|
|`MiniMaxAI/MiniMax-M2.7`|✓|
|`deepseek-ai/DeepSeek-V4-Flash-0731`|✓|
|`zai-org/GLM-5.3-Flash`|✓|

Live probe of one key:

```bash
curl https://inference.dahl.global/v1/chat/completions \
  -H "Authorization: Bearer dahl_…" -H "Content-Type: application/json" \
  -d '{"model":"MiniMaxAI/MiniMax-M2.7","messages":[{"role":"user","content":"hi"}]}'
```

> Dahl also answers `POST /tokens` with **no auth at all** and hands out the same `{"token":"dahl_…","available_tokens":100000000}` grant, linkable to an account later with `POST /v1/account/keys/claim`. This tool uses real accounts; the anonymous route is documented because it carries the same grant.

## 🧪 How to use the API

The base URL is **`https://inference.dahl.global/v1`** — OpenAI-compatible, so anything that speaks OpenAI works.

**Any SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://inference.dahl.global/v1", api_key="dahl_…")
print(client.chat.completions.create(model="MiniMaxAI/MiniMax-M2.7",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**Balance check** (the same call the tool makes before it trusts a key):

```bash
curl https://inference.dahl.global/tokens/current -H "Authorization: Bearer dahl_…"
# {"available_tokens": 100000000}
```

**Any agent / tool with a custom base URL** (Cursor, OpenCode, Kilo Code, …): base URL `https://inference.dahl.global/v1`, paste a key, pick one of the 3 model ids.

## 🛠 Quick start

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

`keys.txt` (one key per line, mirrored to `%USERPROFILE%\dahl-keys.txt`) is written **only** after a live chat completion proves the key; `accounts.json` keeps the username / fingerprint / key id so any account can be recovered later (`src/recover.js`).

### 🖱️ The launcher

The launcher asks for the proxy list (optional — without one the CLI runs direct) and count, remembers them in `launcher.config.json`, and runs the CLI — mint, verify, screen proxies, settings, help, and *Connect to 9Router*.

## ✅ Verified working — every key is tested

> **Quality gates.** Every key here passed a live `chat-200` before it was written to `keys.txt`
> (dead keys are never shipped). Router combos follow the same rule at the model level: an entry is
> added **only if the model answers `chat-200` and can call tools** — a model without tool support,
> a dead key or a dead provider is dropped instead of added. Works with **9Router and OmniRoute**.

| Check | Result |
| --- | --- |
| `POST /v1/auth/signup` | **201** + `api_key.token` + `fingerprint` — no e-mail, phone, card or captcha at any step |
| `POST /v1/account/allocate {amount:100000000}` | **200**, then `GET /tokens/current` reports **100000000** |
| `POST /v1/chat/completions` (`MiniMaxAI/MiniMax-M2.7`) — run for **every** key before it is written | **200** with real `choices[0].message.content` and a `usage` block |
| a key that fails its chat check | never written to `keys.txt` — the account stays recoverable in `accounts.json` |

```bash
node src/cli.js --verify-only      # GET /tokens/current + a chat call per key
node src/cli.js --screen           # only screen your proxy list
```

## 🧭 How it works

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Dahl Inference page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://inference.dahl.global/v1/chat/completions → real content = the key is live
```

| Step | Call | Notes |
| --- | --- | --- |
| health | `GET /health` | reachability of the exit (no auth) |
| username check | `GET /v1/auth/check-username?username=…` | `200 {"available":true,"valid":true}`; taken → `{"available":false,"suggestions":[…]}` |
| **signup** | `POST /v1/auth/signup {"username":"…"}` | `201` + session cookie + `{user, fingerprint, api_key}`; username is `^[a-z0-9_]{3,20}$` (this tool generates `adjective_noun_123`) |
| sign-in (recovery) | `POST /v1/auth/signin {"fingerprint":"…"}` | `200` + session cookie — the fingerprint is the account's only credential, so a dead proxy never loses an account |
| account state | `GET /v1/account` | `{user, paid, token_balance, tokens_on_keys}` |
| allocate the grant | `POST /v1/account/allocate {"key_id":…, "amount":100000000}` | the whole grant is the account pool (`400 not enough tokens in pool` when empty) |
| key balance | `GET /tokens/current` | `Bearer dahl_…` → `{"available_tokens":100000000}` |
| inference | `POST /v1/chat/completions` | OpenAI shape; `GET /v1/models` is public |

## ⚙️ CLI options

```bash
node src/cli.js --count N        # screen exits, mint, allocate, verify (any N, default 30)
node src/cli.js --verify-only    # re-verify every key in keys.txt
node src/cli.js --screen         # only screen your proxy list
node src/cli.js --connect-9router  # …and register every key in keys.txt into 9Router
node src/cli.js --help
```

| Environment variable | Default | Meaning |
| --- | --- | --- |
| `DAHL_PROXIES` | `proxies.txt` | pool file, one proxy per line — optional: without a pool the CLI connects directly |
| `DAHL_MODEL` | `MiniMaxAI/MiniMax-M2.7` | model used for the live verification |
| `DAHL_AMOUNT` | `100000000` | welcome grant allocated to each key |

## 🛰️ Behind a proxy

**Optional — recommended at scale (per-IP limits, bans).** The tool works without a proxy too.

- **With a pool:** put exits in `proxies.txt` (or set `DAHL_PROXIES`) and every request goes through a proxy line — the pool is re-probed at the moment of use, a dead line fails that account attempt and the tool moves on (the fingerprint in `accounts.json` lets you finish it later from any other exit).
- **Without a pool:** the CLI prints `running WITHOUT a proxy (direct)` and connects directly; sign-up, allocate and verify are unchanged — only where the packets leave from.
- `--screen` works in either mode: it tests the exits you have (or the direct route) against the host before a run.

## 📄 Files

| Path | Contents |
| --- | --- |
| `keys.txt` | one live-verified key per line — git-ignored, never committed |
| `accounts.json` | username / user_id / fingerprint / key id — enough to recover any account |
| `/v1/models` | the live catalogue (public, no auth) — 3 ids |
| `proxies.txt` | your exits, one per line — git-ignored |
| `outputs/` | run logs and state — git-ignored |

## 🔌 Connect to 9Router

[9Router](https://9router.com) is a self-hosted, OpenAI-compatible router. Dahl serves an OpenAI-compatible endpoint, so register it once and every key becomes a connection under one provider-node:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

Run it without `--api-key` to register **every** key in `keys.txt`. Re-running is idempotent: the node is matched by `--prefix dahl`, each connection by name (`dahl-001`, `dahl-002`, …). Defaults: `--base http://localhost:20128`, `--password 123456`, `--name "Dahl Inference"`, `--prefix dahl`, `--base-url https://inference.dahl.global/v1`, `--model MiniMaxAI/MiniMax-M2.7`. Models are then served as `dahl/<model id>`.

## 🔌 Connect to OmniRoute

[OmniRoute](https://omniroute.online) is a self-hosted, OpenAI-compatible router. Dahl serves an OpenAI-compatible endpoint, so register it once and every key becomes a connection under one provider-node:

```bash
node src/connect-omniroute.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

Run it without `--api-key` to register **every** key in `keys.txt`. Re-running is idempotent: the node is matched by `--prefix dahl`, each connection by name (`dahl-001`, `dahl-002`, …). Defaults: `--base http://localhost:20128`, `--password 123456`, `--name "Dahl Inference"`, `--prefix dahl`, `--base-url https://inference.dahl.global/v1`, `--model MiniMaxAI/MiniMax-M2.7`. Models are then served as `dahl/<model id>`.

## 🔑 What one key gets you

| | |
| --- | --- |
| 🏢 Provider | **Dahl Inference** — [inference.dahl.global](https://inference.dahl.global) |
| 🎁 What the provider gives | 100M free tokens per account — plain REST signup, no e-mail, no card |
| 🔑 What one key gets you | one API key scoped to its own account: the model ids on the endpoint below, at your plan's limits. The quota lives on the **account**, which is exactly why this tool creates one account per key |
| 🌐 API shape | OpenAI-compatible: `POST https://inference.dahl.global/v1/chat/completions` |
| 🔒 Your data | only `inference.dahl.global` is contacted — there is no mailbox step at all; keys stay on your machine |

## 🐞 Issues

If Dahl changes the signup shape, the allocate semantics or the rate limits, the tool stops at that step and says so. **[Open an issue](../../issues)** with the command you ran and the exact output; PRs are welcome.

## 📄 License

MIT © 2026 — see [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 dahl-bulk-apikey contributors

</div>

## ⚡ Run shape (presets)

`--preset=turbo|balanced|safe` sets workers + the pause between accounts (turbo = 5,
balanced = 4, safe = 2); explicit `--conc`/`--gap` (or the repo's own flags) always win,
and without `--preset` the tool keeps its historical shape exactly.

Turbo önerilir (5 worker); daha fazlası zayıf bilgisayarda yük/ban riski.
