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

**Crea cuentas de Dahl Inference en masa con claves API autogeneradas — inferencia compatible con OpenAI + conector 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-3%20served-412991?style=for-the-badge)](https://inference.dahl.global/docs)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Inicio rápido](#-quick-start) · [🎁 Nivel gratuito](#-free-tier--how-much-you-get) · [🤖 Modelos](#-models--all-3-of-them) · [🧪 Usar la API](#-how-to-use-the-api) · [✅ Verificado](#-verified-working--every-key-is-tested) · [🧭 Cómo funciona](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Opciones](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Problemas](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>








---

## ✨ Por qué existe esto

Dahl Inference otorga una **concesión de bienvenida de 100.000.000 de tokens por cuenta**, y la primera clave API de la cuenta la devuelve la propia llamada de registro. La concesión reside en el *pool de la cuenta* y se transfiere a la clave con una sola llamada `allocate` — que es exactamente por lo que una cuenta por clave es la unidad correcta aquí. Todo el flujo es **REST JSON puro**: sin correo electrónico, sin teléfono, sin tarjeta, sin captcha, sin navegador.

## 🎁 Nivel gratuito — cuánto obtienes

**Cada nueva cuenta de Dahl lleva una concesión de bienvenida de 100.000.000 de tokens — sin correo electrónico, sin teléfono, sin tarjeta, sin captcha.**

| Qué | Valor |
| --- | --- |
| Concesión de bienvenida | **100.000.000 de tokens** por cuenta — `GET /v1/account` informa `token_balance = 100000000` justo después del registro |
| Tarjeta requerida | **No** |
| Caducidad | ninguna — la concesión no caduca |
| Límite de velocidad | sin límite por minuto; el chat está condicionado por la **capacidad del modelo** (las cuentas gratuitas se admiten después de las de pago → `429 model_concurrency`, reintenta unos segundos después o usa otro modelo servido) |
| Registro | REST: `POST /v1/auth/signup {"username":"adj_noun_123"}` — sin buzón |
| La unidad que escala | **una cuenta = una clave** (la concesión es por cuenta: una segunda clave en la misma cuenta empieza en 0) → `--count N` es realmente "N × 100M tokens" |

Medido de principio a fin: registro → `POST /v1/account/allocate` mueve la concesión a la clave → `GET /tokens/current` responde `{"available_tokens": 100000000}`. Una clave con saldo cero responde `402 available tokens exhausted` en el chat.

> 💡 El nivel gratuito lo establece Dahl Inference y puede cambiar. Consulta los números en vivo en [inference.dahl.global](https://inference.dahl.global) — y deja que la propia verificación de la herramienta decida:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modelos — los 3

`GET /v1/models` (público, sin autenticación) actualmente sirve **3 modelos**:

|Modelo|✓|
|---|---|
|`MiniMaxAI/MiniMax-M2.7`|✓|

Prueba en vivo de una clave:

```bash
curl https://inference.dahl.global/v1/chat/completions \
  -H "Authorization: Bearer dahl_…" -H "Content-Type: application/json" \
  -d '{"model":"MiniMaxAI/MiniMax-M2.7","messages":[{"role":"user","content":"hi"}]}'
```

> Dahl también responde a `POST /tokens` **sin autenticación alguna** y entrega la misma concesión `{"token":"dahl_…","available_tokens":100000000}`, vinculable a una cuenta más tarde con `POST /v1/account/keys/claim`. Esta herramienta usa cuentas reales; la ruta anónima está documentada porque lleva la misma concesión.

## 🧪 Cómo usar la API

La URL base es **`https://inference.dahl.global/v1`** — compatible con OpenAI, así que cualquier cosa que hable OpenAI funciona.

**Cualquier SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://inference.dahl.global/v1", api_key="dahl_…")
print(client.chat.completions.create(model="MiniMaxAI/MiniMax-M2.7",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**Consulta de saldo** (la misma llamada que hace la herramienta antes de confiar en una clave):

```bash
curl https://inference.dahl.global/tokens/current -H "Authorization: Bearer dahl_…"
# {"available_tokens": 100000000}
```

**Cualquier agente / herramienta con una URL base personalizada** (Cursor, OpenCode, Kilo Code, …): URL base `https://inference.dahl.global/v1`, pega una clave, elige uno de los 3 ids de modelo.

## 🛠 Inicio rápido

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

`keys.txt` (una clave por línea, replicado en `%USERPROFILE%\dahl-keys.txt`) se escribe **solo** después de que una finalización de chat en vivo demuestre que la clave funciona; `accounts.json` conserva el nombre de usuario / huella / id de clave para que cualquier cuenta pueda recuperarse más tarde (`src/recover.js`).

### 🖱️ El lanzador

El lanzador pide la lista de proxies y la cantidad, las recuerda en `launcher.config.json` y ejecuta la CLI — crear, verificar, examinar proxies, ajustes, ayuda y *Conectar a 9Router*.

## ✅ Verificado y funcionando — cada clave se prueba

| Comprobación | Resultado |
| --- | --- |
| `POST /v1/auth/signup` | **201** + `api_key.token` + `fingerprint` — sin correo electrónico, teléfono, tarjeta ni captcha en ningún paso |
| `POST /v1/account/allocate {amount:100000000}` | **200**, luego `GET /tokens/current` informa **100000000** |
| `POST /v1/chat/completions` (`MiniMaxAI/MiniMax-M2.7`) — ejecutado para **cada** clave antes de escribirse | **200** con `choices[0].message.content` real y un bloque `usage` |
| una clave que falla su comprobación de chat | nunca se escribe en `keys.txt` — la cuenta sigue siendo recuperable en `accounts.json` |

```bash
node src/cli.js --verify-only      # GET /tokens/current + a chat call per key
node src/cli.js --screen           # only screen your proxy list
```

## 🧭 Cómo funciona

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Dahl Inference page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://inference.dahl.global/v1/chat/completions → real content = the key is live
```

| Paso | Llamada | Notas |
| --- | --- | --- |
| salud | `GET /health` | accesibilidad de la salida (sin autenticación) |
| comprobación de nombre de usuario | `GET /v1/auth/check-username?username=…` | `200 {"available":true,"valid":true}`; ocupado → `{"available":false,"suggestions":[…]}` |
| **registro** | `POST /v1/auth/signup {"username":"…"}` | `201` + cookie de sesión + `{user, fingerprint, api_key}`; el nombre de usuario es `^[a-z0-9_]{3,20}$` (esta herramienta genera `adjective_noun_123`) |
| inicio de sesión (recuperación) | `POST /v1/auth/signin {"fingerprint":"…"}` | `200` + cookie de sesión — la huella es la única credencial de la cuenta, así que un proxy caído nunca pierde una cuenta |
| estado de la cuenta | `GET /v1/account` | `{user, paid, token_balance, tokens_on_keys}` |
| asignar la concesión | `POST /v1/account/allocate {"key_id":…, "amount":100000000}` | toda la concesión es el pool de la cuenta (`400 not enough tokens in pool` cuando está vacío) |
| saldo de la clave | `GET /tokens/current` | `Bearer dahl_…` → `{"available_tokens":100000000}` |
| inferencia | `POST /v1/chat/completions` | formato OpenAI; `GET /v1/models` es público |

## ⚙️ Opciones de la CLI

```bash
node src/cli.js --count N        # screen exits, mint, allocate, verify (any N, default 30)
node src/cli.js --verify-only    # re-verify every key in keys.txt
node src/cli.js --screen         # only screen your proxy list
node src/cli.js --connect-9router  # …and register every key in keys.txt into 9Router
node src/cli.js --help
```

| Variable de entorno | Predeterminado | Significado |
| --- | --- | --- |
| `DAHL_PROXIES` | `proxies.txt` | archivo del pool, un proxy por línea |
| `DAHL_MODEL` | `MiniMaxAI/MiniMax-M2.7` | modelo usado para la verificación en vivo |
| `DAHL_AMOUNT` | `100000000` | concesión de bienvenida asignada a cada clave |

## 🛰️ Detrás de un proxy

**Obligatorio — no hay respaldo de conexión directa en ninguna parte de esta herramienta.** Cada solicitud sale a través de una línea de proxy de tu pool; una línea caída hace fallar ese intento de cuenta y la herramienta continúa (la huella en `accounts.json` te permite terminarla más tarde desde cualquier otra salida). El pool se vuelve a probar en el momento de uso, y `--screen` te permite probar una lista nueva contra el host antes de una ejecución.

## 📄 Archivos

| Ruta | Contenido |
| --- | --- |
| `keys.txt` | una clave verificada en vivo por línea — ignorada por git, nunca confirmada |
| `accounts.json` | nombre de usuario / user_id / huella / id de clave — suficiente para recuperar cualquier cuenta |
| `/v1/models` | el catálogo en vivo (público, sin autenticación) — 3 ids |
| `proxies.txt` | tus salidas, una por línea — ignorado por git |
| `outputs/` | registros de ejecución y estado — ignorado por git |

## 🔌 Conectar a 9Router

[9Router](https://9router.com) es un enrutador autoalojado compatible con OpenAI. Dahl sirve un endpoint compatible con OpenAI, así que regístralo una vez y cada clave se convierte en una conexión bajo un nodo de proveedor:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

Ejecútalo sin `--api-key` para registrar **cada** clave en `keys.txt`. Volver a ejecutarlo es idempotente: el nodo se empareja por `--prefix dahl`, cada conexión por nombre (`dahl-001`, `dahl-002`, …). Predeterminados: `--base http://localhost:20128`, `--password 123456`, `--name "Dahl Inference"`, `--prefix dahl`, `--base-url https://inference.dahl.global/v1`, `--model MiniMaxAI/MiniMax-M2.7`. Los modelos se sirven entonces como `dahl/<model id>`.

## 🔑 Qué te da una clave

| | |
| --- | --- |
| 🏢 Proveedor | **Dahl Inference** — [inference.dahl.global](https://inference.dahl.global) |
| 🎁 Qué da el proveedor | 100M de tokens gratis por cuenta — registro REST simple, sin correo electrónico, sin tarjeta |
| 🔑 Qué te da una clave | una clave API limitada a su propia cuenta: los ids de modelo en el endpoint de abajo, con los límites de tu plan. La cuota reside en la **cuenta**, que es exactamente por lo que esta herramienta crea una cuenta por clave |
| 🌐 Forma de la API | Compatible con OpenAI: `POST https://inference.dahl.global/v1/chat/completions` |
| 🔒 Tus datos | solo se contacta `inference.dahl.global` — no hay ningún paso de buzón; las claves permanecen en tu máquina |

## 🐞 Problemas

Si Dahl cambia la forma del registro, la semántica de allocate o los límites de velocidad, la herramienta se detiene en ese paso y lo indica. **[Abre un issue](../../issues)** con el comando que ejecutaste y la salida exacta; los PR son bienvenidos.

## 📄 Licencia

MIT © 2026 — consulta [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 dahl-bulk-apikey contributors

</div>

## ⚡ Forma de ejecución (presets)

`--preset=turbo|balanced|safe` establece los workers + la pausa entre cuentas (turbo = 5,
balanced = 4, safe = 2); los `--conc`/`--gap` explícitos (o los propios flags del repositorio) siempre tienen prioridad,
y sin `--preset` la herramienta mantiene exactamente su forma histórica.

Se recomienda Turbo (5 workers); más supone riesgo de carga/ban en una computadora débil.