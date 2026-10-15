<div align="center">

```
███████╗ ██████╗ ██████╗ ███████╗██╗  ██╗████████╗ █████╗ ███████╗██╗   ██╗
██╔════╝██╔═████╗██╔══██╗██╔════╝╚██╗██╔╝╚══██╔══╝██╔══██╗██╔════╝╚██╗ ██╔╝
█████╗  ██║██╔██║██████╔╝█████╗   ╚███╔╝    ██║   ███████║███████╗ ╚████╔╝
██╔══╝  ████╔╝██║██╔══██╗██╔══╝   ██╔██╗    ██║   ██╔══██║╚════██║  ╚██╔╝
██║     ╚██████╔╝██║  ██║███████╗██╔╝ ██╗   ██║   ██║  ██║███████║   ██║
╚═╝      ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝   ╚═╝
```

# dahl-bulk-apikey

**One [Dahl Inference](https://inference.dahl.global) account per API key — 100,000,000 tokens each — minted over pure REST, verified live, any number.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-3%20served-412991?style=for-the-badge)](https://inference.dahl.global/docs)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Quick start](#-quick-start) · [✅ Verified](#-verified-working--every-key-is-tested) · [🧭 How it works](#-how-it-works) · [🤖 Models & free tier](#-models--free-tier) · [⚙️ Options](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Issues](#-issues)

</div>

---

> **Mint as many accounts/keys as you need — there is no cap.** `--count N` (default `30`)
> accepts any N.

## ✨ Why this exists

Dahl Inference hands out a **100,000,000-token welcome grant per account**, and the account's
first API key is returned by the sign-up call itself. The grant lives on the *account pool* and is
moved onto the key with a single `allocate` call — which is exactly why one account per key is the
right unit here, and why this tool exists.

The whole flow is **plain REST JSON**: no e-mail, no phone, no card, no captcha, no browser.

```
POST https://inference.dahl.global/v1/auth/signup   {"username":"adj_noun_123"}
   └─▶ 201 { user, fingerprint, api_key{id, token:"dahl_…", available_tokens:0} } + session cookie
        │
        ├─▶ POST /v1/account/allocate  {"key_id":<id>,"amount":100000000}   (the welcome grant)
        ├─▶ GET  /tokens/current       Bearer dahl_…  →  100000000
        └─▶ POST /v1/chat/completions  Bearer dahl_…  →  200 + real completion
                          │
                          ▼
              keys.txt — one verified key per line
```

## 🤖 Models & free tier

`GET /v1/models` (public) currently serves **3 models**:

| Model ID | note |
| --- | --- |
| `MiniMaxAI/MiniMax-M2.7` | the verification default; served first in the rotation |
| `deepseek-ai/DeepSeek-V4-Flash-0731` | DeepSeek flash line |
| `zai-org/GLM-5.3-Flash` | GLM flash line |

**How much is free:** **100,000,000 tokens per account** — measured end to end: `GET /v1/account`
reports `token_balance = 100000000` right after sign-up, `POST /v1/account/allocate` moves it onto
the key, and `GET /tokens/current` then answers `{"available_tokens": 100000000}`. The grant is
**per account, not per key** — a second key on the same account starts at 0 — and it does not
expire. Each new account you mint carries its own 100M, so the tool's `--count N` is your quota
multiplier.

**Limits measured:** chat is gated by *capacity*, not by a per-minute request rate — when a model is
busy, free accounts are admitted after paid ones and the call is answered
`429 {"error":{"code":"model_concurrency","message":"…Paid accounts are admitted first…"}}`. Measured
on one funded key, one request at a time, 4 s apart: `200 429 429 429 200 200` — retrying a few
seconds later, or using another served model, passes. `GET /v1/models` needs no auth; a key with a
zero balance answers `402 available tokens exhausted` on chat.

```bash
curl https://inference.dahl.global/v1/chat/completions \
  -H "Authorization: Bearer dahl_…" -H "Content-Type: application/json" \
  -d '{"model":"MiniMaxAI/MiniMax-M2.7","messages":[{"role":"user","content":"hi"}]}'
```

> Dahl also answers `POST /tokens` with **no auth at all** and hands out the same
> `{"token":"dahl_…","available_tokens":100000000}` grant, linkable to an account later with
> `POST /v1/account/keys/claim`. This tool uses real accounts; the anonymous route is documented
> because it carries the same grant.

## 🛠 Quick start

```bash
git clone https://github.com/F0Rextasy/dahl-bulk-apikey.git
cd dahl-bulk-apikey

# 1) your proxy list, one per line (http://, socks5://, socks4:// or bare host:port)
printf 'socks5://127.0.0.1:1080\n' > proxies.txt

# 2) go
node launcher.js          # interactive: mint / verify / screen / settings
# or directly:
node cli.js --count 30    # any N — 30 is just the default sample
```

`keys.txt` (one key per line, mirrored to `%USERPROFILE%\dahl-keys.txt`) is written **only**
after a live chat completion proves the key; `accounts.json` keeps the username / fingerprint /
key id so any account can be recovered later (`recover.js`).

### 🖱️ The launcher

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  ███████╗ ██████╗ ██████╗ ███████╗██╗  ██╗████████╗ █████╗ ███████╗██╗   ██╗  ║
║  ██╔════╝██╔═████╗██╔══██╗██╔════╝╚██╗██╔╝╚══██╔══╝██╔══██╗██╔════╝╚██╗ ██╔╝  ║
║  █████╗  ██║██╔██║██████╔╝█████╗   ╚███╔╝    ██║   ███████║███████╗ ╚████╔╝   ║
║  ██╔══╝  ████╔╝██║██╔══██╗██╔══╝   ██╔██╗    ██║   ██╔══██║╚════██║  ╚██╔╝    ║
║  ██║     ╚██████╔╝██║  ██║███████╗██╔╝ ██╗   ██║   ██║  ██║███████║   ██║     ║
║  ╚═╝      ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝   ╚═╝     ║
║  dahl-bulk-apikey                                                             ║
║  one account per key — 100M tokens each                                       ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  github.com/F0Rextasy · x.com/bigbullapp

  1) Mint keys      — sign up one account per key, allocate the grant, verify
  2) Verify keys    — re-check every key with a live chat completion
  3) Screen proxies — test your proxy list for exits that reach Dahl
  4) Settings       — show what this launcher remembers
  5) Help           — CLI options and notes
  q) Quit
```

## ✅ Verified working — every key is tested

| Check | Result |
| --- | --- |
| `POST /v1/auth/signup` | **201** + `api_key.token` + `fingerprint` — no e-mail, phone, card or captcha at any step |
| `POST /v1/account/allocate {amount:100000000}` | **200**, then `GET /tokens/current` reports **100000000** |
| `POST /v1/chat/completions` (`MiniMaxAI/MiniMax-M2.7`) — run for **every** key before it is written | **200** with real `choices[0].message.content` and a `usage` block |
| A key that fails its chat check | never written to `keys.txt` — the account stays recoverable in `accounts.json` |

Re-check the whole list at any time:

```bash
node cli.js --verify-only                 # GET /tokens/current + a chat call per key
# or a single key:
curl https://inference.dahl.global/tokens/current -H "Authorization: Bearer dahl_…"
```

## 🧭 How it works

| Step | Call | Notes |
| --- | --- | --- |
| health | `GET /health` | reachability of the exit (no auth) |
| username check | `GET /v1/auth/check-username?username=…` | `200 {"available":true,"valid":true}`; taken → `{"available":false,"suggestions":[…]}` |
| **signup** | `POST /v1/auth/signup {"username":"…"}` | `201` + session cookie + `{user, fingerprint, api_key}`; username is `^[a-z0-9_]{3,20}$` (this tool generates `adjective_noun_123`) |
| sign-in (recovery) | `POST /v1/auth/signin {"fingerprint":"…"}` | `200` + session cookie — the fingerprint is the account's only credential, so a dead proxy never loses an account |
| account state | `GET /v1/account` | `{user, paid, token_balance, tokens_on_keys}` |
| allocate the grant | `POST /v1/account/allocate {"key_id":…, "amount":100000000}` | the whole grant is the account pool; allocate is pool-gated (`400 not enough tokens in pool` when empty) |
| key balance | `GET /tokens/current` | `Bearer dahl_…` → `{"available_tokens":100000000}` |
| inference | `POST /v1/chat/completions` | OpenAI shape; `GET /v1/models` is public |

**Grant is per account, not per key** — a second key on the same account starts at 0 and cannot be
funded while the pool is empty, which is why this tool mints exactly **one key per account**.

## ⚙️ CLI options

```bash
node cli.js --count N        # screen exits, mint, allocate, verify (any N, default 30)
node cli.js --verify-only    # re-verify every key in keys.txt
node cli.js --screen         # only screen your proxy list
node cli.js --help
```

| Environment variable | Default | Meaning |
| --- | --- | --- |
| `DAHL_PROXIES` | `proxies.txt` | pool file, one proxy per line |
| `DAHL_MODEL` | `MiniMaxAI/MiniMax-M2.7` | model used for the live verification |
| `DAHL_AMOUNT` | `100000000` | welcome grant allocated to each key |

## 🛰️ Behind a proxy

**Required — there is no direct-connection fallback anywhere in this tool.** Every request leaves
through a proxy line from your pool; a dead line fails that account attempt and the tool moves on
(the fingerprint in `accounts.json` lets you finish it later from any other exit). The pool is
re-probed at the moment of use, and `--screen` lets you test a fresh list against the host before a
run. Use exits you are allowed to use, and prefer a stable dedicated proxy class if you are
minting a large batch.

## 📄 Files

| Path | Contents |
| --- | --- |
| `keys.txt` | one live-verified key per line — git-ignored, never committed |
| `accounts.json` | username / user_id / fingerprint / key id — enough to recover any account |
| [`models.json`](models.json) | `/v1/models` as served |
| `proxies.txt` | your exits, one per line — git-ignored |
| `outputs/` | run logs and state — git-ignored |

## 🐞 Issues

If Dahl changes the signup shape, the allocate semantics or the rate limits, the tool stops at that
step and says so. **[Open an issue](https://github.com/F0Rextasy/dahl-bulk-apikey/issues)** with the
command you ran and the exact output; PRs are welcome.

## 📄 License

MIT © 2026 — see [LICENSE](LICENSE).

<div align="center">

**[github.com/F0Rextasy](https://github.com/F0Rextasy)** · **[x.com/bigbullapp](https://x.com/bigbullapp)**

</div>
