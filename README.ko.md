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

**자동 생성된 API 키로 Dahl Inference 계정을 대량 생성 — OpenAI 호환 추론 + 9Router 커넥터.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-3%20served-412991?style=for-the-badge)](https://inference.dahl.global/docs)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 빠른 시작](#-quick-start) · [🎁 무료 티어](#-free-tier--how-much-you-get) · [🤖 모델](#-models--all-3-of-them) · [🧪 API 사용하기](#-how-to-use-the-api) · [✅ 검증됨](#-verified-working--every-key-is-tested) · [🧭 작동 방식](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ 옵션](#️-cli-options) · [🛰️ 프록시](#️-behind-a-proxy) · [🐞 이슈](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>







---

## ✨ 왜 만들었나

Dahl Inference는 **계정당 100,000,000 토큰 웰컴 그랜트**를 제공하며, 계정의 첫 API 키는 가입 호출 자체에서 반환됩니다. 그랜트는 *계정 풀*에 존재하고 단일 `allocate` 호출로 키로 옮겨집니다 — 이것이 바로 여기서 키당 하나의 계정이 올바른 단위인 이유입니다. 전체 흐름은 **순수 REST JSON**입니다: 이메일, 전화, 카드, 캡차, 브라우저가 필요 없습니다.

## 🎁 무료 티어 — 얼마나 받을 수 있나

**모든 신규 Dahl 계정에는 100,000,000 토큰 웰컴 그랜트가 제공됩니다 — 이메일, 전화, 카드, 캡차 없음.**

| 항목 | 값 |
| --- | --- |
| 웰컴 그랜트 | 계정당 **100,000,000 토큰** — 가입 직후 `GET /v1/account`가 `token_balance = 100000000`을 보고 |
| 카드 필요 | **아니오** |
| 만료 | 없음 — 그랜트는 만료되지 않음 |
| 속도 제한 | 분당 제한 없음; 채팅은 **모델 용량**에 의해 제한됨 (무료 계정은 유료 계정 이후에 허용됨 → `429 model_concurrency`, 몇 초 후 재시도하거나 다른 제공 모델 사용) |
| 가입 | REST: `POST /v1/auth/signup {"username":"adj_noun_123"}` — 메일박스 없음 |
| 확장되는 단위 | **하나의 계정 = 하나의 키** (그랜트는 계정당: 같은 계정의 두 번째 키는 0에서 시작) → `--count N`은 실제로 "N × 100M 토큰" |
| 측정된 전체 흐름 | 가입 → `POST /v1/account/allocate`가 그랜트를 키로 이동 → `GET /tokens/current`가 `{"available_tokens": 100000000}` 응답. 잔액이 0인 키는 채팅 시 `402 available tokens exhausted` 응답. |

> 💡 무료 티어는 Dahl Inference가 설정하며 변경될 수 있습니다. 실시간 수치는 [inference.dahl.global](https://inference.dahl.global)에서 확인하세요 — 그리고 도구 자체의 게이트가 판단하게 하세요:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 모델 — 전부 3개

`GET /v1/models` (공개, 인증 불필요)는 현재 **3개 모델**을 제공합니다:

|모델|✓|
|---|---|
|`MiniMaxAI/MiniMax-M2.7`|✓|

하나의 키에 대한 실시간 프로브:

```bash
curl https://inference.dahl.global/v1/chat/completions \
  -H "Authorization: Bearer dahl_…" -H "Content-Type: application/json" \
  -d '{"model":"MiniMaxAI/MiniMax-M2.7","messages":[{"role":"user","content":"hi"}]}'
```

> Dahl은 또한 **인증 없이** `POST /tokens`에 응답하며 동일한 `{"token":"dahl_…","available_tokens":100000000}` 그랜트를 발급합니다. 이는 나중에 `POST /v1/account/keys/claim`으로 계정에 연결할 수 있습니다. 이 도구는 실제 계정을 사용합니다; 익명 경로는 동일한 그랜트를 가지므로 문서화되어 있습니다.

## 🧪 API 사용 방법

기본 URL은 **`https://inference.dahl.global/v1`** — OpenAI 호환이므로 OpenAI를 지원하는 모든 것이 작동합니다.

**모든 SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://inference.dahl.global/v1", api_key="dahl_…")
print(client.chat.completions.create(model="MiniMaxAI/MiniMax-M2.7",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**잔액 확인** (도구가 키를 신뢰하기 전에 수행하는 것과 동일한 호출):

```bash
curl https://inference.dahl.global/tokens/current -H "Authorization: Bearer dahl_…"
# {"available_tokens": 100000000}
```

**사용자 정의 기본 URL을 가진 모든 에이전트 / 도구** (Cursor, OpenCode, Kilo Code, …): 기본 URL `https://inference.dahl.global/v1`, 키 붙여넣기, 3개 모델 id 중 하나 선택.

## 🛠 빠른 시작

```bash
# clone or fork this repository, then:
cd dahl-bulk-apikey

# 1) your proxy list, one per line (http://, socks5://, socks4:// or bare host:port)
printf 'socks5://127.0.0.1:1080\n' > proxies.txt

# 2) go
node src/launcher.js        # interactive: mint / verify / screen / settings
# or directly:
node src/cli.js --count 30  # any N — 30 is just the default sample
```

`keys.txt` (한 줄에 하나의 키, `%USERPROFILE%\dahl-keys.txt`에 미러링됨)는 실시간 채팅 완료가 키를 증명한 **후에만** 작성됩니다; `accounts.json`은 사용자 이름 / 지문 / 키 id를 보관하여 나중에 모든 계정을 복구할 수 있습니다 (`src/recover.js`).

### 🖱️ 런처

런처는 프록시 목록과 개수를 묻고, `launcher.config.json`에 기억한 뒤 CLI를 실행합니다 — 민트, 검증, 프록시 스크린, 설정, 도움말, 그리고 *9Router에 연결*.

## ✅ 검증됨 — 모든 키가 테스트됨

| 확인 | 결과 |
| --- | --- |
| `POST /v1/auth/signup` | **201** + `api_key.token` + `fingerprint` — 어느 단계에서도 이메일, 전화, 카드, 캡차 없음 |
| `POST /v1/account/allocate {amount:100000000}` | **200**, 이후 `GET /tokens/current`가 **100000000** 보고 |
| `POST /v1/chat/completions` (`MiniMaxAI/MiniMax-M2.7`) — **모든** 키에 대해 작성 전 실행 | 실제 `choices[0].message.content`와 `usage` 블록이 포함된 **200** |
| 채팅 확인에 실패한 키 | `keys.txt`에 절대 작성되지 않음 — 계정은 `accounts.json`에서 복구 가능하게 유지됨 |

```bash
node src/cli.js --verify-only      # GET /tokens/current + a chat call per key
node src/cli.js --screen           # only screen your proxy list
```

## 🧭 작동 방식

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Dahl Inference page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://inference.dahl.global/v1/chat/completions → real content = the key is live
```

| 단계 | 호출 | 비고 |
| --- | --- | --- |
| 상태 확인 | `GET /health` | 출구의 도달 가능성 (인증 불필요) |
| 사용자 이름 확인 | `GET /v1/auth/check-username?username=…` | `200 {"available":true,"valid":true}`; 사용 중 → `{"available":false,"suggestions":[…]}` |
| **가입** | `POST /v1/auth/signup {"username":"…"}` | `201` + 세션 쿠키 + `{user, fingerprint, api_key}`; 사용자 이름은 `^[a-z0-9_]{3,20}$` (이 도구는 `adjective_noun_123` 생성) |
| 로그인 (복구) | `POST /v1/auth/signin {"fingerprint":"…"}` | `200` + 세션 쿠키 — 지문이 계정의 유일한 자격 증명이므로 죽은 프록시가 계정을 잃지 않음 |
| 계정 상태 | `GET /v1/account` | `{user, paid, token_balance, tokens_on_keys}` |
| 그랜트 할당 | `POST /v1/account/allocate {"key_id":…, "amount":100000000}` | 전체 그랜트가 계정 풀 (`400 not enough tokens in pool` 비어 있을 때) |
| 키 잔액 | `GET /tokens/current` | `Bearer dahl_…` → `{"available_tokens":100000000}` |
| 추론 | `POST /v1/chat/completions` | OpenAI 형태; `GET /v1/models`는 공개 |

## ⚙️ CLI 옵션

```bash
node src/cli.js --count N        # screen exits, mint, allocate, verify (any N, default 30)
node src/cli.js --verify-only    # re-verify every key in keys.txt
node src/cli.js --screen         # only screen your proxy list
node src/cli.js --connect-9router  # …and register every key in keys.txt into 9Router
node src/cli.js --help
```

| 환경 변수 | 기본값 | 의미 |
| --- | --- | --- |
| `DAHL_PROXIES` | `proxies.txt` | 풀 파일, 한 줄에 하나의 프록시 |
| `DAHL_MODEL` | `MiniMaxAI/MiniMax-M2.7` | 실시간 검증에 사용되는 모델 |
| `DAHL_AMOUNT` | `100000000` | 각 키에 할당되는 웰컴 그랜트 |

## 🛰️ 프록시 뒤에서

**필수 — 이 도구에는 직접 연결 폴백이 없습니다.** 모든 요청은 풀의 프록시 라인을 통해 나갑니다; 죽은 라인은 해당 계정 시도를 실패시키고 도구는 계속 진행합니다 (`accounts.json`의 지문으로 나중에 다른 출구에서 완료 가능). 풀은 사용 시점에 다시 프로브되며, `--screen`을 통해 실행 전에 새 목록을 호스트에 대해 테스트할 수 있습니다.

## 📄 파일

| 경로 | 내용 |
| --- | --- |
| `keys.txt` | 한 줄에 하나의 실시간 검증된 키 — git 무시됨, 절대 커밋되지 않음 |
| `accounts.json` | 사용자 이름 / user_id / 지문 / 키 id — 모든 계정 복구에 충분 |
| `/v1/models` | 실시간 카탈로그 (공개, 인증 불필요) — 3개 id |
| `proxies.txt` | 출구, 한 줄에 하나 — git 무시됨 |
| `outputs/` | 실행 로그 및 상태 — git 무시됨 |

## 🔌 9Router에 연결

[9Router](https://9router.com)는 자체 호스팅, OpenAI 호환 라우터입니다. Dahl은 OpenAI 호환 엔드포인트를 제공하므로 한 번 등록하면 모든 키가 하나의 제공자 노드 아래 연결이 됩니다:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

`--api-key` 없이 실행하면 `keys.txt`의 **모든** 키를 등록합니다. 재실행은 멱등적입니다: 노드는 `--prefix dahl`로 매칭되고, 각 연결은 이름으로 (`dahl-001`, `dahl-002`, …) 매칭됩니다. 기본값: `--base http://localhost:20128`, `--password 123456`, `--name "Dahl Inference"`, `--prefix dahl`, `--base-url https://inference.dahl.global/v1`, `--model MiniMaxAI/MiniMax-M2.7`. 모델은 이후 `dahl/<model id>`로 제공됩니다.

## 🔑 하나의 키로 얻는 것

| | |
| --- | --- |
| 🏢 제공자 | **Dahl Inference** — [inference.dahl.global](https://inference.dahl.global) |
| 🎁 제공자가 주는 것 | 계정당 100M 무료 토큰 — 순수 REST 가입, 이메일 없음, 카드 없음 |
| 🔑 하나의 키로 얻는 것 | 자체 계정에 범위가 지정된 하나의 API 키: 아래 엔드포인트의 모델 id, 플랜 한도 내에서. 할당량은 **계정**에 있으므로 이 도구가 키당 하나의 계정을 생성하는 것 |
| 🌐 API 형태 | OpenAI 호환: `POST https://inference.dahl.global/v1/chat/completions` |
| 🔒 데이터 | `inference.dahl.global`만 접촉됨 — 메일박스 단계가 전혀 없음; 키는 사용자 컴퓨터에 유지됨 |

## 🐞 이슈

Dahl이 가입 형태, 할당 의미 또는 속도 제한을 변경하면 도구는 해당 단계에서 멈추고 알려줍니다. 실행한 명령과 정확한 출력을 포함하여 **[이슈를 열어주세요](../../issues)**; PR 환영합니다.

## 📄 라이선스

MIT © 2026 — [LICENSE](LICENSE) 참조.

<div align="center">

**[MIT](LICENSE)** © 2026 dahl-bulk-apikey 기여자

</div>

## ⚡ 실행 형태 (프리셋)

`--preset=turbo|balanced|safe`는 워커 수 + 계정 간 일시정지를 설정합니다 (turbo = 5,
balanced = 4, safe = 2); 명시적 `--conc`/`--gap` (또는 저장소 자체 플래그)이 항상 우선하며,
`--preset` 없이는 도구가 기존 형태를 정확히 유지합니다.

Turbo önerilir (5 worker); daha fazlası zayıf bilgisayarda yük/ban riski.