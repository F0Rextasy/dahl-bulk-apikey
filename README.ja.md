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

**API キーを自動生成して Dahl Inference アカウントを一括作成 — OpenAI 互換の推論 + 9Router コネクター。**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-3%20served-412991?style=for-the-badge)](https://inference.dahl.global/docs)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 クイックスタート](#-quick-start) · [🎁 無料枠](#-free-tier--how-much-you-get) · [🤖 モデル](#-models--all-3-of-them) · [🧪 API の使い方](#-how-to-use-the-api) · [✅ 動作確認済み](#-verified-working--every-key-is-tested) · [🧭 仕組み](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ オプション](#️-cli-options) · [🛰️ プロキシ](#️-behind-a-proxy) · [🐞 イシュー](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ なぜこれが存在するのか

Dahl Inference は**アカウントごとに 100,000,000 トークンのウェルカム付与**を配布し、そのアカウントの最初の API キーはサインアップの呼び出し自体で返されます。付与分は*アカウントプール*上に存在し、1 回の `allocate` 呼び出しでキーへ移されます — まさにこれが、ここでキー 1 本につきアカウント 1 つが正しい単位である理由です。フロー全体は**プレーンな REST JSON** です: メールなし、電話なし、カードなし、キャプチャなし、ブラウザなし。

## 🎁 無料枠 — どれだけ使えるか

**新しい Dahl アカウントにはすべて 100,000,000 トークンのウェルカム付与が付いてきます — メールなし、電話なし、カードなし、キャプチャなし。**

| 項目 | 値 |
| --- | --- |
| ウェルカム付与 | **1 アカウントあたり 100,000,000 トークン** — サインアップ直後に `GET /v1/account` が `token_balance = 100000000` を返します |
| カードの要否 | **不要** |
| 有効期限 | なし — 付与分は失効しません |
| レート制限 | 毎分のレート制限なし; チャットは**モデル容量**によって制限されます（無料アカウントは有料アカウントの後に受け入れられます → `429 model_concurrency`、数秒後に再試行するか、別の提供モデルを使用してください） |
| サインアップ | REST: `POST /v1/auth/signup {"username":"adj_noun_123"}` — メールボックス不要 |
| スケールする単位 | **1 アカウント = 1 キー**（付与はアカウント単位: 同じアカウントの 2 本目のキーは 0 から始まります）→ `--count N` は実質「N × 100M トークン」です |

エンドツーエンドで実測済み: サインアップ → `POST /v1/account/allocate` が付与分をキーに移す → `GET /tokens/current` が `{"available_tokens": 100000000}` を返す。残高がゼロのキーはチャットで `402 available tokens exhausted` を返します。

> 💡 無料枠は Dahl Inference が設定するものであり、変更される可能性があります。最新の数値は [inference.dahl.global](https://inference.dahl.global) で確認してください — そしてツール自身のゲートに判断させましょう:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 モデル — 全部で 3 つ

`GET /v1/models`（公開、認証不要）は現在 **3 つのモデル**を提供しています:

|モデル|✓|
|---|---|
|`MiniMaxAI/MiniMax-M2.7`|✓|
|`deepseek-ai/DeepSeek-V4-Flash-0731`|✓|
|`zai-org/GLM-5.3-Flash`|✓|

1 本のキーでのライブプローブ:

```bash
curl https://inference.dahl.global/v1/chat/completions \
  -H "Authorization: Bearer dahl_…" -H "Content-Type: application/json" \
  -d '{"model":"MiniMaxAI/MiniMax-M2.7","messages":[{"role":"user","content":"hi"}]}'
```

> Dahl はまた、`POST /tokens` に**まったく認証なしで**応答し、同じ `{"token":"dahl_…","available_tokens":100000000}` の付与を渡します。これは後から `POST /v1/account/keys/claim` でアカウントに紐付けられます。このツールは実際のアカウントを使用しますが、匿名ルートも同じ付与を持つため記載しています。

## 🧪 API の使い方

ベース URL は **`https://inference.dahl.global/v1`** です — OpenAI 互換なので、OpenAI を話すものなら何でも動作します。

**任意の SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://inference.dahl.global/v1", api_key="dahl_…")
print(client.chat.completions.create(model="MiniMaxAI/MiniMax-M2.7",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**残高チェック**（ツールがキーを信頼する前に行うのと同じ呼び出し）:

```bash
curl https://inference.dahl.global/tokens/current -H "Authorization: Bearer dahl_…"
# {"available_tokens": 100000000}
```

**カスタムベース URL を設定できる任意のエージェント / ツール**（Cursor、OpenCode、Kilo Code など）: ベース URL に `https://inference.dahl.global/v1` を設定し、キーを貼り付け、3 つのモデル ID から 1 つを選びます。

## 🛠 クイックスタート

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

`keys.txt`（1 行 1 キー、`%USERPROFILE%\dahl-keys.txt` にミラーリング）は、実際のチャット補完でキーが証明された**後にのみ**書き込まれます。`accounts.json` はユーザー名 / フィンガープリント / キー ID を保持するため、後からどのアカウントでも復旧できます（`src/recover.js`）。

### 🖱️ ランチャー

ランチャーはプロキシリストと件数を尋ね、それらを `launcher.config.json` に記憶して CLI を実行します — ミント、検証、プロキシのスクリーニング、設定、ヘルプ、そして *9Router への接続*。

## ✅ 動作確認済み — すべてのキーがテストされます

| チェック | 結果 |
| --- | --- |
| `POST /v1/auth/signup` | **201** + `api_key.token` + `fingerprint` — どのステップでもメール、電話、カード、キャプチャは不要 |
| `POST /v1/account/allocate {amount:100000000}` | **200**、その後 `GET /tokens/current` が **100000000** を報告 |
| `POST /v1/chat/completions` (`MiniMaxAI/MiniMax-M2.7`) — 書き込み前に**すべての**キーで実行 | 実際の `choices[0].message.content` と `usage` ブロックを含む **200** |
| チャットチェックに失敗したキー | `keys.txt` には決して書き込まれない — アカウントは `accounts.json` で復旧可能なまま残る |

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
| ヘルス | `GET /health` | 出口の到達性（認証不要） |
| ユーザー名チェック | `GET /v1/auth/check-username?username=…` | `200 {"available":true,"valid":true}`; 使用済み → `{"available":false,"suggestions":[…]}` |
| **サインアップ** | `POST /v1/auth/signup {"username":"…"}` | `201` + セッション Cookie + `{user, fingerprint, api_key}`; ユーザー名は `^[a-z0-9_]{3,20}$`（このツールは `adjective_noun_123` を生成） |
| サインイン（復旧） | `POST /v1/auth/signin {"fingerprint":"…"}` | `200` + セッション Cookie — フィンガープリントがアカウント唯一の資格情報なので、プロキシが死んでもアカウントを失うことはありません |
| アカウント状態 | `GET /v1/account` | `{user, paid, token_balance, tokens_on_keys}` |
| 付与分の割り当て | `POST /v1/account/allocate {"key_id":…, "amount":100000000}` | 付与分全体がアカウントプール（空のときは `400 not enough tokens in pool`） |
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
| `DAHL_PROXIES` | `proxies.txt` | プールファイル、1 行に 1 プロキシ |
| `DAHL_MODEL` | `MiniMaxAI/MiniMax-M2.7` | ライブ検証に使用するモデル |
| `DAHL_AMOUNT` | `100000000` | 各キーに割り当てるウェルカム付与 |

## 🛰️ プロキシの背後で

**必須 — このツールには直接接続のフォールバックがどこにもありません。** すべてのリクエストはプール内のプロキシ行を経由して出ていきます。死んだ行はそのアカウントの試行を失敗させ、ツールは次へ進みます（`accounts.json` のフィンガープリントがあれば、後から別の出口で完了できます）。プールは使用時に再プローブされ、`--screen` を使えば実行前に新しいリストをホストに対してテストできます。

## 📄 ファイル

| パス | 内容 |
| --- | --- |
| `keys.txt` | 1 行に 1 本のライブ検証済みキー — git 管理外、コミットされません |
| `accounts.json` | ユーザー名 / user_id / フィンガープリント / キー ID — どのアカウントでも復旧するのに十分 |
| `/v1/models` | ライブカタログ（公開、認証不要）— 3 つの ID |
| `proxies.txt` | あなたの出口、1 行に 1 つ — git 管理外 |
| `outputs/` | 実行ログと状態 — git 管理外 |

## 🔌 9Router への接続

[9Router](https://9router.com) はセルフホスト型の OpenAI 互換ルーターです。Dahl は OpenAI 互換エンドポイントを提供しているので、一度登録すればすべてのキーが 1 つのプロバイダーノード配下の接続になります:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

`--api-key` なしで実行すると、`keys.txt` 内の**すべての**キーを登録します。再実行は冪等です: ノードは `--prefix dahl` で照合され、各接続は名前（`dahl-001`、`dahl-002`、…）で照合されます。デフォルト: `--base http://localhost:20128`、`--password 123456`、`--name "Dahl Inference"`、`--prefix dahl`、`--base-url https://inference.dahl.global/v1`、`--model MiniMaxAI/MiniMax-M2.7`。モデルはその後 `dahl/<model id>` として提供されます。

## 🔑 1 本のキーで得られるもの

| | |
| --- | --- |
| 🏢 プロバイダー | **Dahl Inference** — [inference.dahl.global](https://inference.dahl.global) |
| 🎁 プロバイダーが提供するもの | アカウントあたり 1 億トークン無料 — プレーンな REST サインアップ、メール不要、カード不要 |
| 🔑 1 本のキーで得られるもの | それぞれのアカウントにスコープされた 1 本の API キー: 下記エンドポイントのモデル ID を、プランの制限内で利用できます。クォータは**アカウント**上に存在するため、このツールがキーごとに 1 アカウントを作成するのはまさにそのためです |
| 🌐 API 形式 | OpenAI 互換: `POST https://inference.dahl.global/v1/chat/completions` |
| 🔒 あなたのデータ | 接続先は `inference.dahl.global` のみ — メールボックスのステップは一切ありません; キーはあなたのマシン上に留まります |

## 🐞 イシュー

Dahl がサインアップの形式、allocate のセマンティクス、またはレート制限を変更した場合、ツールはそのステップで停止し、その旨を表示します。実行したコマンドと正確な出力を添えて **[イシューを作成してください](../../issues)**; PR も歓迎します。

## 📄 ライセンス

MIT © 2026 — [LICENSE](LICENSE) を参照してください。

<div align="center">

**[MIT](LICENSE)** © 2026 dahl-bulk-apikey コントリビューター

</div>

## ⚡ 実行形態（プリセット）

`--preset=turbo|balanced|safe` はワーカー数とアカウント間のポーズを設定します（turbo = 5、balanced = 4、safe = 2）。明示的な `--conc`/`--gap`（またはリポジトリ独自のフラグ）が常に優先され、`--preset` を指定しない場合、ツールは従来の形態をそのまま維持します。

Turbo を推奨します（5 ワーカー）。それ以上は非力なコンピューターでは負荷や ban のリスクがあります。