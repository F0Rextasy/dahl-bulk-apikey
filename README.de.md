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

**Dahl-Inference-Konten im Massenverfahren anlegen — mit automatisch generierten API-Keys: OpenAI-kompatible Inferenz + 9Router-Connector.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-3%20served-412991?style=for-the-badge)](https://inference.dahl.global/docs)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Schnellstart](#-quick-start) · [🎁 Free-Tier](#-free-tier--how-much-you-get) · [🤖 Modelle](#-models--all-3-of-them) · [🧪 API verwenden](#-how-to-use-the-api) · [✅ Verifiziert](#-verified-working--every-key-is-tested) · [🧭 So funktioniert es](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Optionen](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Probleme](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Warum es das gibt

Dahl Inference verteilt einen **Willkommens-Zuschuss von 100.000.000 Tokens pro Konto**, und der erste API-Key des Kontos wird direkt vom Registrierungsaufruf zurückgegeben. Der Zuschuss liegt im *Account-Pool* und wird mit einem einzigen `allocate`-Aufruf auf den Key übertragen — genau deshalb ist ein Konto pro Key hier die richtige Einheit. Der gesamte Ablauf ist **reines REST-JSON**: keine E-Mail, kein Telefon, keine Karte, kein Captcha, kein Browser.

## 🎁 Free-Tier — wie viel du bekommst

**Jedes neue Dahl-Konto bringt einen Willkommens-Zuschuss von 100.000.000 Tokens mit — keine E-Mail, kein Telefon, keine Karte, kein Captcha.**

| Was | Wert |
| --- | --- |
| Willkommens-Zuschuss | **100.000.000 Tokens** pro Konto — `GET /v1/account` meldet direkt nach der Registrierung `token_balance = 100000000` |
| Karte erforderlich | **Nein** |
| Ablauf | keiner — der Zuschuss verfällt nicht |
| Rate-Limit | kein Limit pro Minute; der Chat wird durch die **Modellkapazität** begrenzt (kostenlose Konten werden erst nach den bezahlten zugelassen → `429 model_concurrency`, ein paar Sekunden später erneut versuchen oder ein anderes verfügbares Modell nutzen) |
| Registrierung | REST: `POST /v1/auth/signup {"username":"adj_noun_123"}` — kein Postfach |
| Die Einheit, die skaliert | **ein Konto = ein Key** (der Zuschuss gilt pro Konto: ein zweiter Key im selben Konto startet bei 0) → `--count N` bedeutet wirklich „N × 100M Tokens" |

End-to-End gemessen: Registrierung → `POST /v1/account/allocate` überträgt den Zuschuss auf den Key → `GET /tokens/current` antwortet mit `{"available_tokens": 100000000}`. Ein Key mit Null-Guthaben antwortet im Chat mit `402 available tokens exhausted`.

> 💡 Das Free-Tier wird von Dahl Inference festgelegt und kann sich ändern. Prüfe die aktuellen Zahlen auf [inference.dahl.global](https://inference.dahl.global) — und lass das Gate des Tools selbst entscheiden:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modelle — alle 3 davon

`GET /v1/models` (öffentlich, ohne Auth) liefert derzeit **3 Modelle**:

|Model|✓|
|---|---|
|`MiniMaxAI/MiniMax-M2.7`|✓|
|`deepseek-ai/DeepSeek-V4-Flash-0731`|✓|
|`zai-org/GLM-5.3-Flash`|✓|

Live-Test mit einem Key:

```bash
curl https://inference.dahl.global/v1/chat/completions \
  -H "Authorization: Bearer dahl_…" -H "Content-Type: application/json" \
  -d '{"model":"MiniMaxAI/MiniMax-M2.7","messages":[{"role":"user","content":"hi"}]}'
```

> Dahl antwortet außerdem auf `POST /tokens` mit **überhaupt keiner Auth** und gibt denselben Zuschuss `{"token":"dahl_…","available_tokens":100000000}` aus, der später mit `POST /v1/account/keys/claim` mit einem Konto verknüpft werden kann. Dieses Tool verwendet echte Konten; die anonyme Route ist dokumentiert, weil sie denselben Zuschuss trägt.

## 🧪 So verwendest du die API

Die Basis-URL ist **`https://inference.dahl.global/v1`** — OpenAI-kompatibel, also funktioniert alles, was OpenAI spricht.

**Jedes SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://inference.dahl.global/v1", api_key="dahl_…")
print(client.chat.completions.create(model="MiniMaxAI/MiniMax-M2.7",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**Guthaben prüfen** (derselbe Aufruf, den das Tool macht, bevor es einem Key vertraut):

```bash
curl https://inference.dahl.global/tokens/current -H "Authorization: Bearer dahl_…"
# {"available_tokens": 100000000}
```

**Jeder Agent / jedes Tool mit eigener Basis-URL** (Cursor, OpenCode, Kilo Code, …): Basis-URL `https://inference.dahl.global/v1`, Key einfügen, eine der 3 Modell-IDs auswählen.

## 🛠 Schnellstart

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

`keys.txt` (ein Key pro Zeile, gespiegelt nach `%USERPROFILE%\dahl-keys.txt`) wird **erst** geschrieben, nachdem eine echte Chat-Completion den Key bestätigt hat; `accounts.json` speichert Benutzername / Fingerprint / Key-ID, sodass jedes Konto später wiederhergestellt werden kann (`src/recover.js`).

### 🖱️ Der Launcher

Der Launcher fragt nach Proxy-Liste und Anzahl, merkt sie sich in `launcher.config.json` und führt die CLI aus — Mint, Verifizieren, Proxies prüfen, Einstellungen, Hilfe und *Mit 9Router verbinden*.

## ✅ Verifiziert funktionierend — jeder Key wird getestet

| Prüfung | Ergebnis |
| --- | --- |
| `POST /v1/auth/signup` | **201** + `api_key.token` + `fingerprint` — in keinem Schritt E-Mail, Telefon, Karte oder Captcha |
| `POST /v1/account/allocate {amount:100000000}` | **200**, danach meldet `GET /tokens/current` **100000000** |
| `POST /v1/chat/completions` (`MiniMaxAI/MiniMax-M2.7`) — wird für **jeden** Key ausgeführt, bevor er geschrieben wird | **200** mit echtem `choices[0].message.content` und einem `usage`-Block |
| ein Key, der seine Chat-Prüfung nicht besteht | wird nie in `keys.txt` geschrieben — das Konto bleibt in `accounts.json` wiederherstellbar |

```bash
node src/cli.js --verify-only      # GET /tokens/current + a chat call per key
node src/cli.js --screen           # only screen your proxy list
```

## 🧭 So funktioniert es

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Dahl Inference page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://inference.dahl.global/v1/chat/completions → real content = the key is live
```

| Schritt | Aufruf | Hinweise |
| --- | --- | --- |
| Health | `GET /health` | Erreichbarkeit des Exit (keine Auth) |
| Benutzernamen-Prüfung | `GET /v1/auth/check-username?username=…` | `200 {"available":true,"valid":true}`; vergeben → `{"available":false,"suggestions":[…]}` |
| **Registrierung** | `POST /v1/auth/signup {"username":"…"}` | `201` + Session-Cookie + `{user, fingerprint, api_key}`; der Benutzername ist `^[a-z0-9_]{3,20}$` (dieses Tool erzeugt `adjective_noun_123`) |
| Anmeldung (Wiederherstellung) | `POST /v1/auth/signin {"fingerprint":"…"}` | `200` + Session-Cookie — der Fingerprint ist die einzige Anmeldeinformation des Kontos, daher verliert ein toter Proxy nie ein Konto |
| Kontostatus | `GET /v1/account` | `{user, paid, token_balance, tokens_on_keys}` |
| Zuschuss zuweisen | `POST /v1/account/allocate {"key_id":…, "amount":100000000}` | der gesamte Zuschuss ist der Account-Pool (`400 not enough tokens in pool`, wenn er leer ist) |
| Key-Guthaben | `GET /tokens/current` | `Bearer dahl_…` → `{"available_tokens":100000000}` |
| Inferenz | `POST /v1/chat/completions` | OpenAI-Format; `GET /v1/models` ist öffentlich |

## ⚙️ CLI-Optionen

```bash
node src/cli.js --count N        # screen exits, mint, allocate, verify (any N, default 30)
node src/cli.js --verify-only    # re-verify every key in keys.txt
node src/cli.js --screen         # only screen your proxy list
node src/cli.js --connect-9router  # …and register every key in keys.txt into 9Router
node src/cli.js --help
```

| Umgebungsvariable | Standard | Bedeutung |
| --- | --- | --- |
| `DAHL_PROXIES` | `proxies.txt` | Pool-Datei, ein Proxy pro Zeile |
| `DAHL_MODEL` | `MiniMaxAI/MiniMax-M2.7` | Modell für die Live-Verifizierung |
| `DAHL_AMOUNT` | `100000000` | Willkommens-Zuschuss, der jedem Key zugewiesen wird |

## 🛰️ Hinter einem Proxy

**Erforderlich — es gibt in diesem Tool nirgends einen Fallback auf Direktverbindungen.** Jede Anfrage verlässt das Tool über eine Proxy-Zeile aus deinem Pool; eine tote Zeile lässt diesen Konto-Versuch scheitern und das Tool macht weiter (der Fingerprint in `accounts.json` erlaubt es dir, ihn später über einen anderen Exit abzuschließen). Der Pool wird im Moment der Nutzung erneut geprüft, und mit `--screen` kannst du eine neue Liste vor einem Lauf gegen den Host testen.

## 📄 Dateien

| Pfad | Inhalt |
| --- | --- |
| `keys.txt` | ein live-verifizierter Key pro Zeile — git-ignoriert, nie committet |
| `accounts.json` | Benutzername / user_id / fingerprint / Key-ID — genug, um jedes Konto wiederherzustellen |
| `/v1/models` | der Live-Katalog (öffentlich, keine Auth) — 3 IDs |
| `proxies.txt` | deine Exits, einer pro Zeile — git-ignoriert |
| `outputs/` | Lauf-Logs und Status — git-ignoriert |

## 🔌 Mit 9Router verbinden

[9Router](https://9router.com) ist ein selbst gehosteter, OpenAI-kompatibler Router. Dahl bietet einen OpenAI-kompatiblen Endpoint, also registriere ihn einmal und jeder Key wird zu einer Verbindung unter einem Provider-Node:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

Führe es ohne `--api-key` aus, um **jeden** Key in `keys.txt` zu registrieren. Ein erneuter Lauf ist idempotent: der Node wird über `--prefix dahl` abgeglichen, jede Verbindung über ihren Namen (`dahl-001`, `dahl-002`, …). Standardwerte: `--base http://localhost:20128`, `--password 123456`, `--name "Dahl Inference"`, `--prefix dahl`, `--base-url https://inference.dahl.global/v1`, `--model MiniMaxAI/MiniMax-M2.7`. Die Modelle werden dann als `dahl/<model id>` ausgeliefert.

## 🔑 Was ein Key dir bringt

| | |
| --- | --- |
| 🏢 Anbieter | **Dahl Inference** — [inference.dahl.global](https://inference.dahl.global) |
| 🎁 Was der Anbieter gibt | 100M kostenlose Tokens pro Konto — reine REST-Registrierung, keine E-Mail, keine Karte |
| 🔑 Was ein Key dir bringt | ein API-Key, beschränkt auf sein eigenes Konto: die Modell-IDs am unten stehenden Endpoint, im Rahmen der Limits deines Plans. Das Kontingent liegt beim **Konto**, genau deshalb legt dieses Tool ein Konto pro Key an |
| 🌐 API-Form | OpenAI-kompatibel: `POST https://inference.dahl.global/v1/chat/completions` |
| 🔒 Deine Daten | es wird ausschließlich `inference.dahl.global` kontaktiert — es gibt überhaupt keinen Postfach-Schritt; Keys bleiben auf deinem Rechner |

## 🐞 Probleme

Wenn Dahl die Registrierungsstruktur, die Allocate-Semantik oder die Rate-Limits ändert, bleibt das Tool an diesem Schritt stehen und sagt es. **[Öffne ein Issue](../../issues)** mit dem ausgeführten Befehl und der exakten Ausgabe; PRs sind willkommen.

## 📄 Lizenz

MIT © 2026 — siehe [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 dahl-bulk-apikey contributors

</div>

## ⚡ Ausführungsform (Presets)

`--preset=turbo|balanced|safe` legt die Worker-Anzahl + die Pause zwischen den Konten fest (turbo = 5,
balanced = 4, safe = 2); explizite `--conc`/`--gap` (oder die eigenen Flags des Repos) gewinnen immer,
und ohne `--preset` behält das Tool exakt seine bisherige Form bei.

Turbo wird empfohlen (5 Worker); mehr bedeutet auf schwachen Rechnern Last-/Ban-Risiko.