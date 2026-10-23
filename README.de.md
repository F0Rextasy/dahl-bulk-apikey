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

**Massenhaft Dahl-Inference-Konten mit automatisch generierten API-Schlüsseln erstellen — OpenAI-kompatible Inferenz + 9Router-Konnektor.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-3%20served-412991?style=for-the-badge)](https://inference.dahl.global/docs)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Schnellstart](#-quick-start) · [🎁 Free-Tier](#-free-tier--how-much-you-get) · [🤖 Modelle](#-models--all-3-of-them) · [🧪 API verwenden](#-how-to-use-the-api) · [✅ Verifiziert](#-verified-working--every-key-is-tested) · [🧭 So funktioniert es](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [🔌 OmniRoute](#-connect-to-omniroute) · [⚙️ Optionen](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Probleme](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Warum es das gibt

Dahl Inference gewährt **100.000.000 Token als Willkommensgeschenk pro Konto**, und der erste API-Schlüssel des Kontos wird direkt vom Registrierungsaufruf zurückgegeben. Das Guthaben liegt im *Kontopool* und wird mit einem einzigen `allocate`-Aufruf auf den Schlüssel übertragen — genau deshalb ist ein Konto pro Schlüssel hier die richtige Einheit. Der gesamte Ablauf ist **reines REST-JSON**: keine E-Mail, kein Telefon, keine Karte, kein Captcha, kein Browser.

## 🎁 Kostenlose Stufe — wie viel du bekommst

**Jedes neue Dahl-Konto trägt ein Willkommensgeschenk von 100.000.000 Token — keine E-Mail, kein Telefon, keine Karte, kein Captcha.**

| Was | Wert |
| --- | --- |
| Willkommensgeschenk | **100.000.000 Token** pro Konto — `GET /v1/account` meldet direkt nach der Registrierung `token_balance = 100000000` |
| Karte erforderlich | **Nein** |
| Ablauf | keiner — das Guthaben läuft nicht ab |
| Ratenlimit | kein Limit pro Minute; der Chat wird durch die **Modellkapazität** begrenzt (kostenlose Konten werden nach bezahlten zugelassen → `429 model_concurrency`, ein paar Sekunden später erneut versuchen oder ein anderes verfügbares Modell verwenden) |
| Registrierung | REST: `POST /v1/auth/signup {"username":"adj_noun_123"}` — kein Postfach |
| Die skalierende Einheit | **ein Konto = ein Schlüssel** (das Guthaben gilt pro Konto: ein zweiter Schlüssel auf demselben Konto startet bei 0) → `--count N` bedeutet wirklich „N × 100M Token" |

Ende-zu-Ende gemessen: Registrierung → `POST /v1/account/allocate` überträgt das Guthaben auf den Schlüssel → `GET /tokens/current` antwortet `{"available_tokens": 100000000}`. Ein Schlüssel mit Nullsaldo antwortet im Chat mit `402 available tokens exhausted`.

> 💡 Die kostenlose Stufe wird von Dahl Inference festgelegt und kann sich ändern. Prüfe die aktuellen Zahlen unter [inference.dahl.global](https://inference.dahl.global) — und lass das eigene Gate des Tools entscheiden:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modelle — alle 3 davon

`GET /v1/models` (öffentlich, keine Authentifizierung) bedient derzeit **3 Modelle**:

|Modell|✓|
|---|---|
|`MiniMaxAI/MiniMax-M2.7`|✓|
|`deepseek-ai/DeepSeek-V4-Flash-0731`|✓|
|`zai-org/GLM-5.3-Flash`|✓|

Live-Test eines Schlüssels:

```bash
curl https://inference.dahl.global/v1/chat/completions \
  -H "Authorization: Bearer dahl_…" -H "Content-Type: application/json" \
  -d '{"model":"MiniMaxAI/MiniMax-M2.7","messages":[{"role":"user","content":"hi"}]}'
```

> Dahl antwortet außerdem auf `POST /tokens` mit **überhaupt keiner Authentifizierung** und gibt dasselbe `{"token":"dahl_…","available_tokens":100000000}`-Guthaben aus, das später mit `POST /v1/account/keys/claim` mit einem Konto verknüpft werden kann. Dieses Tool verwendet echte Konten; die anonyme Route ist dokumentiert, weil sie dasselbe Guthaben trägt.

## 🧪 So verwendest du die API

Die Basis-URL ist **`https://inference.dahl.global/v1`** — OpenAI-kompatibel, also funktioniert alles, was OpenAI spricht.

**Beliebiges SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://inference.dahl.global/v1", api_key="dahl_…")
print(client.chat.completions.create(model="MiniMaxAI/MiniMax-M2.7",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**Guthabenprüfung** (derselbe Aufruf, den das Tool macht, bevor es einem Schlüssel vertraut):

```bash
curl https://inference.dahl.global/tokens/current -H "Authorization: Bearer dahl_…"

# {"available_tokens": 100000000}
```

**Beliebiger Agent / beliebiges Tool mit benutzerdefinierter Basis-URL** (Cursor, OpenCode, Kilo Code, …): Basis-URL `https://inference.dahl.global/v1`, einen Schlüssel einfügen, eine der 3 Modell-IDs auswählen.

## 🛠 Schnellstart

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

`keys.txt` (ein Schlüssel pro Zeile, gespiegelt nach `%USERPROFILE%\dahl-keys.txt`) wird **erst** geschrieben, nachdem eine Live-Chat-Vervollständigung den Schlüssel bestätigt hat; `accounts.json` speichert Benutzername / Fingerabdruck / Schlüssel-ID, sodass jedes Konto später wiederhergestellt werden kann (`src/recover.js`).

### 🖱️ Der Launcher

Der Launcher fragt nach der Proxy-Liste (optional — ohne eine läuft die CLI direkt) und der Anzahl, merkt sie sich in `launcher.config.json` und führt die CLI aus — mint, verify, screen proxies, settings, help und *Connect to 9Router*.

## ✅ Verifiziert funktionierend — jeder Schlüssel wird getestet

> **Qualitätsgates.** Jeder Schlüssel hier hat ein Live-`chat-200` bestanden, bevor er in `keys.txt`
> geschrieben wurde (tote Schlüssel werden nie ausgeliefert). Router-Kombinationen folgen derselben Regel
> auf Modellebene: Ein Eintrag wird **nur hinzugefügt, wenn das Modell `chat-200` antwortet und Tools
> aufrufen kann** — ein Modell ohne Tool-Unterstützung, ein toter Schlüssel oder ein toter Anbieter wird
> verworfen statt hinzugefügt. Funktioniert mit **9Router und OmniRoute**.

| Prüfung | Ergebnis |
| --- | --- |
| `POST /v1/auth/signup` | **201** + `api_key.token` + `fingerprint` — kein E-Mail-, Telefon-, Karten- oder Captcha-Schritt |
| `POST /v1/account/allocate {amount:100000000}` | **200**, danach meldet `GET /tokens/current` **100000000** |
| `POST /v1/chat/completions` (`MiniMaxAI/MiniMax-M2.7`) — für **jeden** Schlüssel ausgeführt, bevor er geschrieben wird | **200** mit echtem `choices[0].message.content` und einem `usage`-Block |
| ein Schlüssel, der seine Chat-Prüfung nicht besteht | wird nie in `keys.txt` geschrieben — das Konto bleibt in `accounts.json` wiederherstellbar |

```bash
node src/cli.js --verify-only      # GET /tokens/current + a chat call per key
node src/cli.js --screen           # only screen your proxy list
```

## 🧭 Funktionsweise

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
| health | `GET /health` | Erreichbarkeit des Ausgangs (keine Authentifizierung) |
| Benutzernamenprüfung | `GET /v1/auth/check-username?username=…` | `200 {"available":true,"valid":true}`; vergeben → `{"available":false,"suggestions":[…]}` |
| **signup** | `POST /v1/auth/signup {"username":"…"}` | `201` + Session-Cookie + `{user, fingerprint, api_key}`; Benutzername ist `^[a-z0-9_]{3,20}$` (dieses Tool generiert `adjective_noun_123`) |
| Anmeldung (Wiederherstellung) | `POST /v1/auth/signin {"fingerprint":"…"}` | `200` + Session-Cookie — der Fingerabdruck ist die einzige Anmeldeinformation des Kontos, daher verliert ein toter Proxy nie ein Konto |
| Kontostatus | `GET /v1/account` | `{user, paid, token_balance, tokens_on_keys}` |
| Guthaben zuweisen | `POST /v1/account/allocate {"key_id":…, "amount":100000000}` | das gesamte Guthaben ist der Kontopool (`400 not enough tokens in pool`, wenn leer) |
| Schlüsselsaldo | `GET /tokens/current` | `Bearer dahl_…` → `{"available_tokens":100000000}` |
| Inferenz | `POST /v1/chat/completions` | OpenAI-Form; `GET /v1/models` ist öffentlich |

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
| `DAHL_PROXIES` | `proxies.txt` | Pool-Datei, ein Proxy pro Zeile — optional: ohne Pool verbindet sich die CLI direkt |
| `DAHL_MODEL` | `MiniMaxAI/MiniMax-M2.7` | Modell für die Live-Verifizierung |
| `DAHL_AMOUNT` | `100000000` | Willkommensgeschenk, das jedem Schlüssel zugewiesen wird |

## 🛰️ Hinter einem Proxy

**Optional — bei Skalierung empfohlen (Limits pro IP, Sperren).** Das Tool funktioniert auch ohne Proxy.

- **Mit einem Pool:** Lege Ausgänge in `proxies.txt` ab (oder setze `DAHL_PROXIES`), und jede Anfrage läuft über eine Proxy-Zeile — der Pool wird im Moment der Nutzung erneut geprüft, eine tote Zeile lässt diesen Kontoversuch fehlschlagen und das Tool macht weiter (der Fingerabdruck in `accounts.json` ermöglicht es, ihn später von einem anderen Ausgang aus abzuschließen).
- **Ohne Pool:** Die CLI gibt `running WITHOUT a proxy (direct)` aus und verbindet sich direkt; Registrierung, Zuweisung und Verifizierung bleiben unverändert — nur der Ort, von dem die Pakete ausgehen, ändert sich.
- `--screen` funktioniert in beiden Modi: Es testet die vorhandenen Ausgänge (oder die direkte Route) vor einem Lauf gegen den Host.

## 📄 Dateien

| Pfad | Inhalt |
| --- | --- |
| `keys.txt` | ein live-verifizierter Schlüssel pro Zeile — von Git ignoriert, nie committet |
| `accounts.json` | Benutzername / user_id / Fingerabdruck / Schlüssel-ID — ausreichend, um jedes Konto wiederherzustellen |
| `/v1/models` | der Live-Katalog (öffentlich, keine Authentifizierung) — 3 IDs |
| `proxies.txt` | deine Ausgänge, einer pro Zeile — von Git ignoriert |
| `outputs/` | Laufprotokolle und Status — von Git ignoriert |

## 🔌 Mit 9Router verbinden

[9Router](https://9router.com) ist ein selbst gehosteter, OpenAI-kompatibler Router. Dahl bietet einen OpenAI-kompatiblen Endpunkt, also registriere ihn einmal und jeder Schlüssel wird zu einer Verbindung unter einem Anbieter-Node:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

Führe es ohne `--api-key` aus, um **jeden** Schlüssel in `keys.txt` zu registrieren. Ein erneuter Lauf ist idempotent: Der Node wird über `--prefix dahl` abgeglichen, jede Verbindung über den Namen (`dahl-001`, `dahl-002`, …). Standardwerte: `--base http://localhost:20128`, `--password 123456`, `--name "Dahl Inference"`, `--prefix dahl`, `--base-url https://inference.dahl.global/v1`, `--model MiniMaxAI/MiniMax-M2.7`. Modelle werden dann als `dahl/<model id>` bereitgestellt.

## 🔌 Mit OmniRoute verbinden

[OmniRoute](https://omniroute.online) ist ein selbst gehosteter, OpenAI-kompatibler Router. Dahl bietet einen OpenAI-kompatiblen Endpoint, also registriere ihn einmal und jeder Key wird zu einer Verbindung unter einem Provider-Node:

```bash
node src/connect-omniroute.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

Führe es ohne `--api-key` aus, um **jeden** Key in `keys.txt` zu registrieren. Ein erneuter Lauf ist idempotent: der Node wird über `--prefix dahl` abgeglichen, jede Verbindung über ihren Namen (`dahl-001`, `dahl-002`, …). Standardwerte: `--base http://localhost:20128`, `--password 123456`, `--name "Dahl Inference"`, `--prefix dahl`, `--base-url https://inference.dahl.global/v1`, `--model MiniMaxAI/MiniMax-M2.7`. Die Modelle werden dann als `dahl/<model id>` ausgeliefert.

## 🔑 Was ein Key dir bringt

| | |
| --- | --- |
| 🏢 Anbieter | **Dahl Inference** — [inference.dahl.global](https://inference.dahl.global) |
| 🎁 Was der Anbieter gibt | 100M kostenlose Token pro Konto — reine REST-Registrierung, keine E-Mail, keine Karte |
| 🔑 Was ein Schlüssel dir bringt | ein API-Schlüssel, der auf sein eigenes Konto beschränkt ist: die Modell-IDs am unten stehenden Endpunkt, im Rahmen deines Tarifs. Das Kontingent liegt beim **Konto**, weshalb dieses Tool genau ein Konto pro Schlüssel erstellt |
| 🌐 API-Form | OpenAI-kompatibel: `POST https://inference.dahl.global/v1/chat/completions` |
| 🔒 Deine Daten | nur `inference.dahl.global` wird kontaktiert — es gibt überhaupt keinen Postfach-Schritt; Schlüssel bleiben auf deinem Rechner |

## 🐞 Probleme

Wenn Dahl die Registrierungsform, die Zuweisungssemantik oder die Ratenlimits ändert, stoppt das Tool an diesem Schritt und sagt es. **[Öffne ein Issue](../../issues)** mit dem ausgeführten Befehl und der exakten Ausgabe; PRs sind willkommen.

## 📄 Lizenz

MIT © 2026 — siehe [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 dahl-bulk-apikey contributors

</div>

## ⚡ Ausführungsform (Presets)

`--preset=turbo|balanced|safe` legt Worker + die Pause zwischen Konten fest (turbo = 5,
balanced = 4, safe = 2); explizite `--conc`/`--gap` (oder die eigenen Flags des Repos) gewinnen immer,
und ohne `--preset` behält das Tool exakt seine bisherige Form.

Turbo wird empfohlen (5 Worker); mehr bedeutet Last-/Sperrrisiko auf schwachen Rechnern.