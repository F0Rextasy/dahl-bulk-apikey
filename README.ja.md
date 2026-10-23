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

**自動生成された API キーで Dahl Inference アカウントを一括作成 — OpenAI 互換の推論 + 9Router コネクタ。**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-3%20served-412991?style=for-the-badge)](https://inference.dahl.global/docs)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

<<<<<<< Updated upstream
[🛠 クイックスタート](#-quick-start) · [🎁 無料枠](#-free-tier--how-much-you-get) · [🤖 モデル](#-models--all-3-of-them) · [🧪 API の使い方](#-how-to-use-the-api) · [✅ 検証済み](#-verified-working--every-key-is-tested) · [🧭 仕組み](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ オプション](#️-cli-options) · [🛰️ プロキシ](#️-behind-a-proxy) · [🐞 問題](#-issues)
=======
[🛠 クイックスタート](#-quick-start) · [🎁 無料枠](#-free-tier--how-much-you-get) · [🤖 モデル](#-models--all-3-of-them) · [🧪 API の使い方](#-how-to-use-the-api) · [✅ 動作確認済み](#-verified-working--every-key-is-tested) · [🧭 仕組み](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ オプション](#️-cli-options) · [🛰️ プロキシ](#️-behind-a-proxy) · [🐞 イシュー](#-issues)
>>>>>>> Stashed changes

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ これが存在する理由

Dahl Inference は **アカウントごとに 100,000,000 トークンのウェルカム付与**を配布しており、そのアカウントの最初の API キーはサインアップ呼び出し自体によって返されます。付与は*アカウントプール*に存在し、1 回の `allocate` 呼び出しでキーへ移されます — まさにこれが、ここで 1 アカウント = 1 キーが正しい単位である理由です。フロー全体は**プレーンな REST JSON**です: メールなし、電話なし、カードなし、キャプチャなし、ブラウザなし。

## 🎁 無料枠 — どれだけ得られるか

**新しい Dahl アカウントにはすべて 100,000,000 トークンのウェルカム付与が付きます — メールなし、電話なし、カードなし、キャプチャなし。**

| 項目 | 値 |
| --- | --- |
| ウェルカム付与 | アカウントごとに **100,000,000 トークン** — サインアップ直後に `GET /v1/account` が `token_balance = 100000000` を報告 |
| カード必須 | **いいえ** |
| 有効期限 | なし — 付与は失効しません |
| レート制限 | 毎分のレートなし; チャットは**モデル容量**によって制限されます (無料アカウントは有料の後に受け入れられる → `429 model_concurrency`、数秒後に再試行するか別の提供モデルを使用) |
| サインアップ | REST: `POST /v1/auth/signup {"username":"adj_noun_123"}` — メールボックス不要 |
| スケールする単位 | **1 アカウント = 1 キー** (付与はアカウント単位: 同じアカウントの 2 つ目のキーは 0 から始まります) → `--count N` は実質「N × 100M トークン」 |

エンドツーエンドで計測: サインアップ → `POST /v1/account/allocate` が付与をキーへ移動 → `GET /tokens/current` が `{"available_tokens": 100000000}` を返す。残高ゼロのキーはチャットで `402 available tokens exhausted` を返します。

> 💡 無料枠は Dahl Inference によって設定され、変更される可能性があります。最新の数値は [inference.dahl.global](https://inference.dahl.global) で確認してください — そしてツール自身のゲートに判断させてください:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 モデル — その 3 つすべて

`GET /v1/models` (公開、認証不要) は現在 **3 つのモデル**を提供しています:

|Model|✓|
|---|---|
|`MiniMaxAI/MiniMax-M2.7`|✓|
|`deepseek-ai/DeepSeek-V4-Flash-0731`|✓|
|`zai-org/GLM-5.3-Flash`|✓|

1 つのキーのライブプローブ:

```bash
curl https://inference.dahl.global/v1/chat/completions \
  -H "Authorization: Bearer dahl_…" -H "Content-Type: application/json" \
  -d '{"model":"MiniMaxAI/MiniMax-M2.7","messages":[{"role":"user","content":"hi"}]}'
```

> Dahl はまた、**認証がまったくない** `POST /tokens` にも応答し、同じ `{"token":"dahl_…","available_tokens":100000000}` の付与を配布します。これは後で `POST /v1/account/keys/claim` でアカウントに紐付け可能です。このツールは実際のアカウントを使用します; 匿名ルートは同じ付与を持つため文書化されています。

## 🧪 API の使い方

ベース URL は **`https://inference.dahl.global/v1`** — OpenAI 互換なので、OpenAI を話すものなら何でも動作します。

**任意の SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://inference.dahl.global/v1", api_key="dahl_…")
print(client.chat.completions.create(model="MiniMaxAI/MiniMax-M2.7",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**残高確認** (ツールがキーを信頼する前に行うのと同じ呼び出し):

```bash
curl https://inference.dahl.global/tokens/current -H "Authorization: Bearer dahl_…"
# {"available_tokens": 100000000}
```

**カスタムベース URL を持つ任意のエージェント / ツール** (Cursor、OpenCode、Kilo Code など): ベース URL `https://inference.dahl.global/v1`、キーを貼り付け、3 つのモデル ID から 1 つを選択。

## 🛠 クイックスタート

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

`keys.txt` (1 行に 1 キー、`%USERPROFILE%\dahl-keys.txt` にミラーリング) は、ライブのチャット補完がキーを証明した**後にのみ**書き込まれます; `accounts.json` はユーザー名 / フィンガープリント / キー ID を保持するので、後で任意のアカウントを復元できます (`src/recover.js`)。

### 🖱️ ランチャー

ランチャーはプロキシリスト (オプション — なしの場合 CLI は直接実行) とカウントを尋ね、それらを `launcher.config.json` に記憶し、CLI を実行します — mint、verify、screen proxies、settings、help、そして *Connect to 9Router*。

## ✅ 検証済みで動作 — すべてのキーがテストされます

> **品質ゲート。** ここにあるすべてのキーは、`keys.txt` に書き込まれる前にライブの `chat-200` を通過しています
> (死んだキーは決して出荷されません)。ルーターの組み合わせもモデルレベルで同じルールに従います: エントリは
> **モデルが `chat-200` に応答し、ツールを呼び出せる場合にのみ**追加されます — ツールサポートのないモデル、
> 死んだキー、死んだプロバイダは追加されずに除外されます。**9Router と OmniRoute** で動作します。

| チェック | 結果 |
| --- | --- |
| `POST /v1/auth/signup` | **201** + `api_key.token` + `fingerprint` — どのステップでもメール、電話、カード、キャプチャなし |
| `POST /v1/account/allocate {amount:100000000}` | **200**、その後 `GET /tokens/current` が **100000000** を報告 |
| `POST /v1/chat/completions` (`MiniMaxAI/MiniMax-M2.7`) — 書き込まれる前に**すべての**キーに対して実行 | **200**、実際の `choices[0].message.content` と `usage` ブロック付き |
| チャットチェックに失敗したキー | `keys.txt` に決して書き込まれない — アカウントは `accounts.json` で復元可能なまま |

```bash
node src/cli.js --verify-only      # GET /tokens/current + a chat call per key
node src/cli.js --screen           # only screen your proxy list
```

## 🧭 仕組み

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Dahl Inference page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://inference.dahl.global/v1/chat/completions → real content = the key is live
```

| ステップ | 呼び出し | 備考 |
| --- | --- | --- |
| health | `GET /health` | 出口の到達可能性 (認証不要) |
| ユーザー名チェック | `GET /v1/auth/check-username?username=…` | `200 {"available":true,"valid":true}`; 使用済み → `{"available":false,"suggestions":[…]}` |
| **signup** | `POST /v1/auth/signup {"username":"…"}` | `201` + セッション Cookie + `{user, fingerprint, api_key}`; ユーザー名は `^[a-z0-9_]{3,20}$` (このツールは `adjective_noun_123` を生成) |
| サインイン (復元) | `POST /v1/auth/signin {"fingerprint":"…"}` | `200` + セッション Cookie — フィンガープリントはアカウントの唯一の資格情報なので、死んだプロキシでもアカウントを失うことはありません |
| アカウント状態 | `GET /v1/account` | `{user, paid, token_balance, tokens_on_keys}` |
| 付与の割り当て | `POST /v1/account/allocate {"key_id":…, "amount":100000000}` | 付与全体がアカウントプール (空の場合は `400 not enough tokens in pool`) |
| キー残高 | `GET /tokens/current` | `Bearer dahl_…` → `{"available_tokens":100000000}` |
| 推論 | `POST /v1/chat/completions` | OpenAI 形式; `GET /v1/models` は公開 |

## ⚙️ CLI オプション

```bash
node src/cli.js --count N        # screen exits, mint, allocate, verify (any N, default 30)
node src/cli.js --verify-only    # re-verify every key in keys.txt
node src/cli.js --screen         # only screen your proxy list
node src/cli.js --connect-9router  # …and register every key in keys.txt into 9Router
node src/cli.js --help
```

| 環境変数 | デフォルト | 意味 |
| --- | --- | --- |
| `DAHL_PROXIES` | `proxies.txt` | プールファイル、1 行に 1 プロキシ — オプション: プールなしの場合 CLI は直接接続 |
| `DAHL_MODEL` | `MiniMaxAI/MiniMax-M2.7` | ライブ検証に使用されるモデル |
| `DAHL_AMOUNT` | `100000000` | 各キーに割り当てられるウェルカム付与 |

## 🛰️ プロキシの背後で

**オプション — 大規模では推奨 (IP ごとの制限、BAN)。** ツールはプロキシなしでも動作します。

- **プールあり:** `proxies.txt` に出口を入れる (または `DAHL_PROXIES` を設定) と、すべてのリクエストがプロキシ行を経由します — プールは使用時に再プローブされ、死んだ行はそのアカウント試行を失敗させ、ツールは次に進みます (`accounts.json` のフィンガープリントにより、後で任意の他の出口から完了できます)。
- **プールなし:** CLI は `running WITHOUT a proxy (direct)` と表示して直接接続します; サインアップ、割り当て、検証は変わりません — パケットが出ていく場所だけが異なります。
- `--screen` はどちらのモードでも動作します: 実行前に、持っている出口 (または直接ルート) をホストに対してテストします。

## 📄 ファイル

| パス | 内容 |
| --- | --- |
| `keys.txt` | 1 行に 1 つのライブ検証済みキー — git 無視、決してコミットされない |
| `accounts.json` | ユーザー名 / user_id / フィンガープリント / キー ID — 任意のアカウントを復元するのに十分 |
| `/v1/models` | ライブカタログ (公開、認証不要) — 3 つの ID |
| `proxies.txt` | あなたの出口、1 行に 1 つ — git 無視 |
| `outputs/` | 実行ログと状態 — git 無視 |

## 🔌 9Router に接続

[9Router](https://9router.com) はセルフホストの OpenAI 互換ルーターです。Dahl は OpenAI 互換エンドポイントを提供するので、一度登録すればすべてのキーが 1 つのプロバイダーノードの下の接続になります:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

`--api-key` なしで実行すると、`keys.txt` の**すべての**キーを登録します。再実行は冪等です: ノードは `--prefix dahl` で照合され、各接続は名前 (`dahl-001`、`dahl-002`、…) で照合されます。デフォルト: `--base http://localhost:20128`、`--password 123456`、`--name "Dahl Inference"`、`--prefix dahl`、`--base-url https://inference.dahl.global/v1`、`--model MiniMaxAI/MiniMax-M2.7`。モデルはその後 `dahl/<model id>` として提供されます。

<<<<<<< Updated upstream
## 🔌 OmniRoute に接続

[OmniRoute](https://omniroute.online) はセルフホストの OpenAI 互換ルーターです。Dahl は OpenAI 互換エンドポイントを提供するので、一度登録すればすべてのキーが 1 つのプロバイダーノードの下の接続になります:
=======
## 🔌 OmniRoute への接続

[OmniRoute](https://omniroute.online) はセルフホスト型の OpenAI 互換ルーターです。Dahl は OpenAI 互換エンドポイントを提供しているので、一度登録すればすべてのキーが 1 つのプロバイダーノード配下の接続になります:
>>>>>>> Stashed changes

```bash
node src/connect-omniroute.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

<<<<<<< Updated upstream
`--api-key` なしで実行すると、`keys.txt` の**すべての**キーを登録します。再実行は冪等です: ノードは `--prefix dahl` で照合され、各接続は名前 (`dahl-001`、`dahl-002`、…) で照合されます。デフォルト: `--base http://localhost:20128`、`--password 123456`、`--name "Dahl Inference"`、`--prefix dahl`、`--base-url https://inference.dahl.global/v1`、`--model MiniMaxAI/MiniMax-M2.7`。モデルはその後 `dahl/<model id>` として提供されます。
## 🔑 1 つのキーで得られるもの
=======
`--api-key` なしで実行すると、`keys.txt` 内の**すべての**キーを登録します。再実行は冪等です: ノードは `--prefix dahl` で照合され、各接続は名前（`dahl-001`、`dahl-002`、…）で照合されます。デフォルト: `--base http://localhost:20128`、`--password 123456`、`--name "Dahl Inference"`、`--prefix dahl`、`--base-url https://inference.dahl.global/v1`、`--model MiniMaxAI/MiniMax-M2.7`。モデルはその後 `dahl/<model id>` として提供されます。

## 🔑 1 本のキーで得られるもの
>>>>>>> Stashed changes

| | |
| --- | --- |
| 🏢 プロバイダー | **Dahl Inference** — [inference.dahl.global](https://inference.dahl.global) |
| 🎁 プロバイダーが提供するもの | アカウントごとに 100M 無料トークン — プレーンな REST サインアップ、メールなし、カードなし |
| 🔑 1 つのキーで得られるもの | 独自のアカウントにスコープされた 1 つの API キー: 以下のエンドポイントのモデル ID を、あなたのプランの制限で。クォータは**アカウント**に存在するため、このツールがキーごとに 1 アカウントを作成するのはまさにこの理由です |
| 🌐 API 形式 | OpenAI 互換: `POST https://inference.dahl.global/v1/chat/completions` |
| 🔒 あなたのデータ | 接続されるのは `inference.dahl.global` のみ — メールボックスのステップはまったくありません; キーはあなたのマシンに留まります |

## 🐞 問題

Dahl がサインアップの形式、割り当てのセマンティクス、またはレート制限を変更した場合、ツールはそのステップで停止し、その旨を伝えます。実行したコマンドと正確な出力を添えて **[issue を開いてください](../../issues)**; PR も歓迎します。

## 📄 ライセンス

MIT © 2026 — [LICENSE](LICENSE) を参照。

<div align="center">

**[MIT](LICENSE)** © 2026 dahl-bulk-apikey contributors

</div>

## ⚡ 実行形態 (プリセット)

`--preset=turbo|balanced|safe` はワーカー数 + アカウント間のポーズを設定します (turbo = 5、
balanced = 4、safe = 2); 明示的な `--conc`/`--gap` (またはリポジトリ自身のフラグ) が常に優先され、
`--preset` なしの場合、ツールは従来の形態を正確に保ちます。

Turbo önerilir (5 worker); daha fazlası zayıf bilgisayarda yük/ban riski.