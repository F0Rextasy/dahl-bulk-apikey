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

**Массовое создание аккаунтов Dahl Inference с автоматически сгенерированными API-ключами — OpenAI-совместимый инференс + коннектор 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-3%20served-412991?style=for-the-badge)](https://inference.dahl.global/docs)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Быстрый старт](#-quick-start) · [🎁 Бесплатный тариф](#-free-tier--how-much-you-get) · [🤖 Модели](#-models--all-3-of-them) · [🧪 Использование API](#-how-to-use-the-api) · [✅ Проверено](#-verified-working--every-key-is-tested) · [🧭 Как это работает](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Параметры](#️-cli-options) · [🛰️ За прокси](#️-behind-a-proxy) · [🐞 Проблемы](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Зачем это нужно

Dahl Inference выдаёт **приветственный грант в 100,000,000 токенов на каждый аккаунт**, а первый API-ключ аккаунта возвращается самим вызовом регистрации. Грант хранится в *пуле аккаунта* и переносится на ключ одним вызовом `allocate` — именно поэтому здесь правильная единица — один аккаунт на ключ. Весь поток — это **обычный REST JSON**: без e-mail, без телефона, без карты, без капчи, без браузера.

## 🎁 Бесплатный тариф — сколько вы получаете

**Каждый новый аккаунт Dahl несёт приветственный грант в 100,000,000 токенов — без e-mail, без телефона, без карты, без капчи.**

| Что | Значение |
| --- | --- |
| Приветственный грант | **100,000,000 токенов** на аккаунт — `GET /v1/account` сразу после регистрации показывает `token_balance = 100000000` |
| Требуется карта | **Нет** |
| Срок действия | нет — грант не истекает |
| Ограничение скорости | нет лимита в минуту; чат ограничен **ёмкостью модели** (бесплатные аккаунты допускаются после платных → `429 model_concurrency`, повторите через несколько секунд или используйте другую обслуживаемую модель) |
| Регистрация | REST: `POST /v1/auth/signup {"username":"adj_noun_123"}` — без почтового ящика |
| Единица масштабирования | **один аккаунт = один ключ** (грант на аккаунт: второй ключ в том же аккаунте начинается с 0) → `--count N` — это на самом деле «N × 100 млн токенов» |

Измерено от начала до конца: регистрация → `POST /v1/account/allocate` переносит грант на ключ → `GET /tokens/current` отвечает `{"available_tokens": 100000000}`. Ключ с нулевым балансом при обращении к чату отвечает `402 available tokens exhausted`.

> 💡 Бесплатный тариф задаётся Dahl Inference и может измениться. Проверяйте актуальные цифры на [inference.dahl.global](https://inference.dahl.global) — и пусть решает собственный контроль инструмента:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Модели — все 3

`GET /v1/models` (публичный, без авторизации) сейчас отдаёт **3 модели**:

|Модель|✓|
|---|---|
|`MiniMaxAI/MiniMax-M2.7`|✓|
|`deepseek-ai/DeepSeek-V4-Flash-0731`|✓|
|`zai-org/GLM-5.3-Flash`|✓|

Живая проверка одного ключа:

```bash
curl https://inference.dahl.global/v1/chat/completions \
  -H "Authorization: Bearer dahl_…" -H "Content-Type: application/json" \
  -d '{"model":"MiniMaxAI/MiniMax-M2.7","messages":[{"role":"user","content":"hi"}]}'
```

> Dahl также отвечает на `POST /tokens` **вообще без авторизации** и выдаёт тот же грант `{"token":"dahl_…","available_tokens":100000000}`, который позже можно привязать к аккаунту через `POST /v1/account/keys/claim`. Этот инструмент использует реальные аккаунты; анонимный маршрут задокументирован, потому что он несёт тот же грант.

## 🧪 Как использовать API

Базовый URL — **`https://inference.dahl.global/v1`** — OpenAI-совместимый, поэтому работает всё, что умеет говорить с OpenAI.

**Любой SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://inference.dahl.global/v1", api_key="dahl_…")
print(client.chat.completions.create(model="MiniMaxAI/MiniMax-M2.7",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**Проверка баланса** (тот же вызов, который инструмент делает, прежде чем довериться ключу):

```bash
curl https://inference.dahl.global/tokens/current -H "Authorization: Bearer dahl_…"

# {"available_tokens": 100000000}
```

**Любой агент / инструмент с настраиваемым base URL** (Cursor, OpenCode, Kilo Code, …): base URL `https://inference.dahl.global/v1`, вставьте ключ, выберите один из 3 id моделей.

## 🛠 Быстрый старт

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

`keys.txt` (один ключ на строку, дублируется в `%USERPROFILE%\dahl-keys.txt`) записывается **только** после того, как живой chat completion подтвердит ключ; `accounts.json` хранит username / fingerprint / key id, чтобы любой аккаунт можно было восстановить позже (`src/recover.js`).

### 🖱️ Лаунчер

Лаунчер спрашивает список прокси и количество, запоминает их в `launcher.config.json` и запускает CLI — создание, проверка, отбор прокси, настройки, справка и *Connect to 9Router*.

## ✅ Проверено в работе — каждый ключ протестирован

| Проверка | Результат |
| --- | --- |
| `POST /v1/auth/signup` | **201** + `api_key.token` + `fingerprint` — ни на одном шаге нет e-mail, телефона, карты или капчи |
| `POST /v1/account/allocate {amount:100000000}` | **200**, затем `GET /tokens/current` показывает **100000000** |
| `POST /v1/chat/completions` (`MiniMaxAI/MiniMax-M2.7`) — выполняется для **каждого** ключа перед его записью | **200** с реальным `choices[0].message.content` и блоком `usage` |
| ключ, не прошедший чат-проверку | никогда не записывается в `keys.txt` — аккаунт остаётся восстановимым в `accounts.json` |

```bash
node src/cli.js --verify-only      # GET /tokens/current + a chat call per key
node src/cli.js --screen           # only screen your proxy list
```

## 🧭 Как это работает

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Dahl Inference page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://inference.dahl.global/v1/chat/completions → real content = the key is live
```

| Шаг | Вызов | Примечания |
| --- | --- | --- |
| health | `GET /health` | доступность выхода (без авторизации) |
| проверка username | `GET /v1/auth/check-username?username=…` | `200 {"available":true,"valid":true}`; занято → `{"available":false,"suggestions":[…]}` |
| **регистрация** | `POST /v1/auth/signup {"username":"…"}` | `201` + session cookie + `{user, fingerprint, api_key}`; username соответствует `^[a-z0-9_]{3,20}$` (этот инструмент генерирует `adjective_noun_123`) |
| вход (восстановление) | `POST /v1/auth/signin {"fingerprint":"…"}` | `200` + session cookie — fingerprint является единственным учётным данным аккаунта, поэтому мёртвый прокси никогда не приводит к потере аккаунта |
| состояние аккаунта | `GET /v1/account` | `{user, paid, token_balance, tokens_on_keys}` |
| выделение гранта | `POST /v1/account/allocate {"key_id":…, "amount":100000000}` | весь грант — это пул аккаунта (`400 not enough tokens in pool`, когда пул пуст) |
| баланс ключа | `GET /tokens/current` | `Bearer dahl_…` → `{"available_tokens":100000000}` |
| инференс | `POST /v1/chat/completions` | формат OpenAI; `GET /v1/models` публичный |

## ⚙️ Параметры CLI

```bash
node src/cli.js --count N        # screen exits, mint, allocate, verify (any N, default 30)
node src/cli.js --verify-only    # re-verify every key in keys.txt
node src/cli.js --screen         # only screen your proxy list
node src/cli.js --connect-9router  # …and register every key in keys.txt into 9Router
node src/cli.js --help
```

| Переменная окружения | По умолчанию | Значение |
| --- | --- | --- |
| `DAHL_PROXIES` | `proxies.txt` | файл пула, один прокси на строку |
| `DAHL_MODEL` | `MiniMaxAI/MiniMax-M2.7` | модель, используемая для живой проверки |
| `DAHL_AMOUNT` | `100000000` | приветственный грант, выделяемый каждому ключу |

## 🛰️ За прокси

**Обязательно — нигде в этом инструменте нет запасного варианта с прямым подключением.** Каждый запрос уходит через строку прокси из вашего пула; мёртвая строка проваливает попытку для этого аккаунта, и инструмент идёт дальше (fingerprint в `accounts.json` позволяет завершить её позже через любой другой выход). Пул повторно проверяется в момент использования, а `--screen` позволяет протестировать свежий список против хоста перед запуском.

## 📄 Файлы

| Путь | Содержимое |
| --- | --- |
| `keys.txt` | один проверенный в работе ключ на строку — игнорируется git, никогда не коммитится |
| `accounts.json` | username / user_id / fingerprint / key id — достаточно для восстановления любого аккаунта |
| `/v1/models` | живой каталог (публичный, без авторизации) — 3 id |
| `proxies.txt` | ваши выходы, один на строку — игнорируется git |
| `outputs/` | логи запусков и состояние — игнорируется git |

## 🔌 Подключение к 9Router

[9Router](https://9router.com) — это самостоятельно размещаемый OpenAI-совместимый роутер. Dahl обслуживает OpenAI-совместимый эндпоинт, поэтому зарегистрируйте его один раз, и каждый ключ станет соединением под одним узлом провайдера:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

Запустите без `--api-key`, чтобы зарегистрировать **каждый** ключ из `keys.txt`. Повторный запуск идемпотентен: узел сопоставляется по `--prefix dahl`, каждое соединение — по имени (`dahl-001`, `dahl-002`, …). Значения по умолчанию: `--base http://localhost:20128`, `--password 123456`, `--name "Dahl Inference"`, `--prefix dahl`, `--base-url https://inference.dahl.global/v1`, `--model MiniMaxAI/MiniMax-M2.7`. После этого модели доступны как `dahl/<model id>`.

## 🔌 Подключение к OmniRoute

[OmniRoute](https://omniroute.online) — это самостоятельно размещаемый OpenAI-совместимый роутер. Dahl обслуживает OpenAI-совместимый эндпоинт, поэтому зарегистрируйте его один раз, и каждый ключ станет соединением под одним узлом провайдера:

```bash
node src/connect-omniroute.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

Запустите без `--api-key`, чтобы зарегистрировать **каждый** ключ из `keys.txt`. Повторный запуск идемпотентен: узел сопоставляется по `--prefix dahl`, каждое соединение — по имени (`dahl-001`, `dahl-002`, …). Значения по умолчанию: `--base http://localhost:20128`, `--password 123456`, `--name "Dahl Inference"`, `--prefix dahl`, `--base-url https://inference.dahl.global/v1`, `--model MiniMaxAI/MiniMax-M2.7`. После этого модели доступны как `dahl/<model id>`.
## 🔑 Что даёт один ключ

| | |
| --- | --- |
| 🏢 Провайдер | **Dahl Inference** — [inference.dahl.global](https://inference.dahl.global) |
| 🎁 Что даёт провайдер | 100 млн бесплатных токенов на аккаунт — простая REST-регистрация, без e-mail, без карты |
| 🔑 Что даёт один ключ | один API-ключ, привязанный к собственному аккаунту: id моделей на эндпоинте ниже, в пределах лимитов вашего плана. Квота хранится на **аккаунте**, именно поэтому этот инструмент создаёт один аккаунт на ключ |
| 🌐 Форма API | OpenAI-совместимая: `POST https://inference.dahl.global/v1/chat/completions` |
| 🔒 Ваши данные | запросы идут только к `inference.dahl.global` — шага с почтовым ящиком нет вовсе; ключи остаются на вашей машине |

## 🐞 Проблемы

Если Dahl изменит форму регистрации, семантику allocate или лимиты, инструмент остановится на этом шаге и сообщит об этом. **[Откройте issue](../../issues)** с командой, которую вы запускали, и точным выводом; PR приветствуются.

## 📄 Лицензия

MIT © 2026 — см. [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 участники dahl-bulk-apikey

</div>

## ⚡ Режим запуска (пресеты)

`--preset=turbo|balanced|safe` задаёт число воркеров + паузу между аккаунтами (turbo = 5,
balanced = 4, safe = 2); явные `--conc`/`--gap` (или собственные флаги репозитория) всегда
имеют приоритет, а без `--preset` инструмент сохраняет свою историческую конфигурацию в точности.

Рекомендуется turbo (5 воркеров); больше — риск нагрузки/бана на слабом компьютере.