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

**Crie contas Dahl Inference em massa com chaves de API geradas automaticamente — inferência compatível com OpenAI + conector 9Router.**

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

## ✨ Por que isto existe

O Dahl Inference concede uma **bolsa de boas-vindas de 100.000.000 de tokens por conta**, e a primeira chave de API da conta é retornada pela própria chamada de cadastro. A bolsa fica no *pool da conta* e é transferida para a chave com uma única chamada `allocate` — e é exatamente por isso que uma conta por chave é a unidade correta aqui. Todo o fluxo é **REST JSON puro**: sem e-mail, sem telefone, sem cartão, sem captcha, sem navegador.

## 🎁 Nível gratuito — quanto você recebe

**Toda nova conta Dahl carrega uma bolsa de boas-vindas de 100.000.000 de tokens — sem e-mail, sem telefone, sem cartão, sem captcha.**

| O quê | Valor |
| --- | --- |
| Bolsa de boas-vindas | **100.000.000 de tokens** por conta — `GET /v1/account` reporta `token_balance = 100000000` logo após o cadastro |
| Cartão exigido | **Não** |
| Expiração | nenhuma — a bolsa não expira |
| Limite de taxa | sem limite por minuto; o chat é limitado pela **capacidade do modelo** (contas gratuitas são admitidas depois das pagas → `429 model_concurrency`, tente novamente alguns segundos depois ou use outro modelo servido) |
| Cadastro | REST: `POST /v1/auth/signup {"username":"adj_noun_123"}` — sem caixa de correio |
| A unidade que escala | **uma conta = uma chave** (a bolsa é por conta: uma segunda chave na mesma conta começa em 0) → `--count N` é na verdade "N × 100M tokens" |

Medido de ponta a ponta: cadastro → `POST /v1/account/allocate` move a bolsa para a chave → `GET /tokens/current` responde `{"available_tokens": 100000000}`. Uma chave com saldo zero responde `402 available tokens exhausted` no chat.

> 💡 O nível gratuito é definido pelo Dahl Inference e pode mudar. Confira os números ao vivo em [inference.dahl.global](https://inference.dahl.global) — e deixe o próprio gate da ferramenta decidir:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modelos — todos os 3

`GET /v1/models` (público, sem autenticação) atualmente serve **3 modelos**:

|Modelo|✓|
|---|---|
|`MiniMaxAI/MiniMax-M2.7`|✓|
|`deepseek-ai/DeepSeek-V4-Flash-0731`|✓|
|`zai-org/GLM-5.3-Flash`|✓|

Teste ao vivo de uma chave:

```bash
curl https://inference.dahl.global/v1/chat/completions \
  -H "Authorization: Bearer dahl_…" -H "Content-Type: application/json" \
  -d '{"model":"MiniMaxAI/MiniMax-M2.7","messages":[{"role":"user","content":"hi"}]}'
```

> O Dahl também responde a `POST /tokens` **sem autenticação alguma** e entrega a mesma bolsa `{"token":"dahl_…","available_tokens":100000000}`, vinculável a uma conta depois com `POST /v1/account/keys/claim`. Esta ferramenta usa contas reais; a rota anônima está documentada porque carrega a mesma bolsa.

## 🧪 Como usar a API

A URL base é **`https://inference.dahl.global/v1`** — compatível com OpenAI, então qualquer coisa que fale OpenAI funciona.

**Qualquer SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://inference.dahl.global/v1", api_key="dahl_…")
print(client.chat.completions.create(model="MiniMaxAI/MiniMax-M2.7",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**Verificação de saldo** (a mesma chamada que a ferramenta faz antes de confiar em uma chave):

```bash
curl https://inference.dahl.global/tokens/current -H "Authorization: Bearer dahl_…"

# {"available_tokens": 100000000}
```

**Qualquer agente / ferramenta com URL base personalizada** (Cursor, OpenCode, Kilo Code, …): URL base `https://inference.dahl.global/v1`, cole uma chave, escolha um dos 3 ids de modelo.

## 🛠 Início rápido

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

`keys.txt` (uma chave por linha, espelhado em `%USERPROFILE%\dahl-keys.txt`) é escrito **somente** depois que uma conclusão de chat ao vivo comprova a chave; `accounts.json` mantém o nome de usuário / fingerprint / id da chave para que qualquer conta possa ser recuperada depois (`src/recover.js`).

### 🖱️ O launcher

O launcher pede a lista de proxies (opcional — sem uma, a CLI roda direto) e a contagem, lembra-os em `launcher.config.json` e executa a CLI — mint, verify, screen proxies, settings, help e *Connect to 9Router*.

## ✅ Verificado e funcionando — toda chave é testada

> **Portões de qualidade.** Toda chave aqui passou por um `chat-200` ao vivo antes de ser escrita em `keys.txt`
> (chaves mortas nunca são entregues). As combinações do roteador seguem a mesma regra no nível do modelo: uma entrada é
> adicionada **somente se o modelo responder `chat-200` e puder chamar ferramentas** — um modelo sem suporte a ferramentas,
> uma chave morta ou um provedor morto é descartado em vez de adicionado. Funciona com **9Router e OmniRoute**.

| Verificação | Resultado |
| --- | --- |
| `POST /v1/auth/signup` | **201** + `api_key.token` + `fingerprint` — sem e-mail, telefone, cartão ou captcha em nenhuma etapa |
| `POST /v1/account/allocate {amount:100000000}` | **200**, depois `GET /tokens/current` reporta **100000000** |
| `POST /v1/chat/completions` (`MiniMaxAI/MiniMax-M2.7`) — executado para **toda** chave antes de ser escrita | **200** com `choices[0].message.content` real e um bloco `usage` |
| uma chave que falha na verificação de chat | nunca escrita em `keys.txt` — a conta permanece recuperável em `accounts.json` |

```bash
node src/cli.js --verify-only      # GET /tokens/current + a chat call per key
node src/cli.js --screen           # only screen your proxy list
```

## 🧭 Como funciona

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Dahl Inference page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://inference.dahl.global/v1/chat/completions → real content = the key is live
```

| Etapa | Chamada | Notas |
| --- | --- | --- |
| health | `GET /health` | alcançabilidade da saída (sem autenticação) |
| verificação de nome de usuário | `GET /v1/auth/check-username?username=…` | `200 {"available":true,"valid":true}`; em uso → `{"available":false,"suggestions":[…]}` |
| **cadastro** | `POST /v1/auth/signup {"username":"…"}` | `201` + cookie de sessão + `{user, fingerprint, api_key}`; o nome de usuário é `^[a-z0-9_]{3,20}$` (esta ferramenta gera `adjective_noun_123`) |
| login (recuperação) | `POST /v1/auth/signin {"fingerprint":"…"}` | `200` + cookie de sessão — o fingerprint é a única credencial da conta, então um proxy morto nunca perde uma conta |
| estado da conta | `GET /v1/account` | `{user, paid, token_balance, tokens_on_keys}` |
| alocar a bolsa | `POST /v1/account/allocate {"key_id":…, "amount":100000000}` | a bolsa inteira é o pool da conta (`400 not enough tokens in pool` quando vazio) |
| saldo da chave | `GET /tokens/current` | `Bearer dahl_…` → `{"available_tokens":100000000}` |
| inferência | `POST /v1/chat/completions` | formato OpenAI; `GET /v1/models` é público |

## ⚙️ Opções da CLI

```bash
node src/cli.js --count N        # screen exits, mint, allocate, verify (any N, default 30)
node src/cli.js --verify-only    # re-verify every key in keys.txt
node src/cli.js --screen         # only screen your proxy list
node src/cli.js --connect-9router  # …and register every key in keys.txt into 9Router
node src/cli.js --help
```

| Variável de ambiente | Padrão | Significado |
| --- | --- | --- |
| `DAHL_PROXIES` | `proxies.txt` | arquivo de pool, um proxy por linha — opcional: sem um pool a CLI se conecta diretamente |
| `DAHL_MODEL` | `MiniMaxAI/MiniMax-M2.7` | modelo usado para a verificação ao vivo |
| `DAHL_AMOUNT` | `100000000` | bolsa de boas-vindas alocada a cada chave |

## 🛰️ Atrás de um proxy

**Opcional — recomendado em escala (limites por IP, banimentos).** A ferramenta também funciona sem proxy.

- **Com um pool:** coloque saídas em `proxies.txt` (ou defina `DAHL_PROXIES`) e toda requisição passa por uma linha de proxy — o pool é re-testado no momento do uso, uma linha morta faz aquela tentativa de conta falhar e a ferramenta segue em frente (o fingerprint em `accounts.json` permite concluí-la depois a partir de qualquer outra saída).
- **Sem um pool:** a CLI imprime `running WITHOUT a proxy (direct)` e se conecta diretamente; cadastro, alocação e verificação permanecem inalterados — só muda de onde os pacotes saem.
- `--screen` funciona em qualquer modo: testa as saídas que você tem (ou a rota direta) contra o host antes de uma execução.

## 📄 Arquivos

| Caminho | Conteúdo |
| --- | --- |
| `keys.txt` | uma chave verificada ao vivo por linha — ignorada pelo git, nunca commitada |
| `accounts.json` | nome de usuário / user_id / fingerprint / id da chave — suficiente para recuperar qualquer conta |
| `/v1/models` | o catálogo ao vivo (público, sem autenticação) — 3 ids |
| `proxies.txt` | suas saídas, uma por linha — ignorado pelo git |
| `outputs/` | logs de execução e estado — ignorado pelo git |

## 🔌 Conectar ao 9Router

[9Router](https://9router.com) é um roteador auto-hospedado e compatível com OpenAI. O Dahl serve um endpoint compatível com OpenAI, então registre-o uma vez e toda chave se torna uma conexão sob um nó de provedor:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

Execute sem `--api-key` para registrar **todas** as chaves em `keys.txt`. Reexecutar é idempotente: o nó é correspondido por `--prefix dahl`, cada conexão por nome (`dahl-001`, `dahl-002`, …). Padrões: `--base http://localhost:20128`, `--password 123456`, `--name "Dahl Inference"`, `--prefix dahl`, `--base-url https://inference.dahl.global/v1`, `--model MiniMaxAI/MiniMax-M2.7`. Os modelos são então servidos como `dahl/<model id>`.

## 🔌 Conectar ao OmniRoute

O [OmniRoute](https://omniroute.online) é um roteador auto-hospedado e compatível com OpenAI. O Dahl oferece um endpoint compatível com OpenAI, então registre-o uma vez e cada chave se torna uma conexão sob um único nó de provedor:

```bash
node src/connect-omniroute.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

Execute sem `--api-key` para registrar **todas** as chaves de `keys.txt`. Reexecutar é idempotente: o nó é identificado por `--prefix dahl`, cada conexão pelo nome (`dahl-001`, `dahl-002`, …). Padrões: `--base http://localhost:20128`, `--password 123456`, `--name "Dahl Inference"`, `--prefix dahl`, `--base-url https://inference.dahl.global/v1`, `--model MiniMaxAI/MiniMax-M2.7`. Os modelos passam então a ser servidos como `dahl/<model id>`.

## 🔑 O que uma chave oferece

| | |
| --- | --- |
| 🏢 Provedor | **Dahl Inference** — [inference.dahl.global](https://inference.dahl.global) |
| 🎁 O que o provedor dá | 100M de tokens grátis por conta — cadastro REST simples, sem e-mail, sem cartão |
| 🔑 O que uma chave lhe dá | uma chave de API vinculada à sua própria conta: os ids de modelo no endpoint abaixo, nos limites do seu plano. A cota fica na **conta**, e é exatamente por isso que esta ferramenta cria uma conta por chave |
| 🌐 Formato da API | Compatível com OpenAI: `POST https://inference.dahl.global/v1/chat/completions` |
| 🔒 Seus dados | apenas `inference.dahl.global` é contatado — não há etapa de caixa de correio alguma; as chaves ficam na sua máquina |

## 🐞 Problemas

Se o Dahl mudar o formato do cadastro, a semântica de alocação ou os limites de taxa, a ferramenta para nessa etapa e avisa. **[Abra uma issue](../../issues)** com o comando que você executou e a saída exata; PRs são bem-vindos.

## 📄 Licença

MIT © 2026 — veja [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 dahl-bulk-apikey contributors

</div>

## ⚡ Formato de execução (presets)

`--preset=turbo|balanced|safe` define workers + a pausa entre contas (turbo = 5,
balanced = 4, safe = 2); `--conc`/`--gap` explícitos (ou as próprias flags do repositório) sempre vencem,
e sem `--preset` a ferramenta mantém exatamente seu formato histórico.

Turbo önerilir (5 worker); daha fazlası zayıf bilgisayarda yük/ban riski.