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

**Créez en masse des comptes Dahl Inference avec des clés API générées automatiquement — inférence compatible OpenAI + connecteur 9Router.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-3%20served-412991?style=for-the-badge)](https://inference.dahl.global/docs)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Démarrage rapide](#-quick-start) · [🎁 Offre gratuite](#-free-tier--how-much-you-get) · [🤖 Modèles](#-models--all-3-of-them) · [🧪 Utiliser l'API](#-how-to-use-the-api) · [✅ Vérifié](#-verified-working--every-key-is-tested) · [🧭 Comment ça marche](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Options](#️-cli-options) · [🛰️ Proxies](#️-behind-a-proxy) · [🐞 Problèmes](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Pourquoi ce projet existe

Dahl Inference offre un **crédit de bienvenue de 100 000 000 de tokens par compte**, et la première clé API du compte est renvoyée par l'appel d'inscription lui-même. Le crédit réside sur le *pool du compte* et est transféré sur la clé avec un seul appel `allocate` — c'est précisément pourquoi un compte par clé est la bonne unité ici. Tout le flux est du **REST JSON simple** : pas d'e-mail, pas de téléphone, pas de carte, pas de captcha, pas de navigateur.

## 🎁 Offre gratuite — ce que vous obtenez

**Chaque nouveau compte Dahl bénéficie d'un crédit de bienvenue de 100 000 000 de tokens — sans e-mail, sans téléphone, sans carte, sans captcha.**

| Quoi | Valeur |
| --- | --- |
| Crédit de bienvenue | **100 000 000 de tokens** par compte — `GET /v1/account` indique `token_balance = 100000000` juste après l'inscription |
| Carte bancaire requise | **Non** |
| Expiration | aucune — le crédit n'expire pas |
| Limite de débit | pas de limite par minute ; le chat est conditionné par la **capacité du modèle** (les comptes gratuits sont admis après les comptes payants → `429 model_concurrency`, réessayez quelques secondes plus tard ou utilisez un autre modèle servi) |
| Inscription | REST : `POST /v1/auth/signup {"username":"adj_noun_123"}` — pas de boîte mail |
| L'unité qui passe à l'échelle | **un compte = une clé** (le crédit est par compte : une seconde clé sur le même compte démarre à 0) → `--count N` signifie en réalité « N × 100M de tokens » |

Mesuré de bout en bout : inscription → `POST /v1/account/allocate` transfère le crédit sur la clé → `GET /tokens/current` répond `{"available_tokens": 100000000}`. Une clé dont le solde est à zéro répond `402 available tokens exhausted` lors du chat.

> 💡 L'offre gratuite est définie par Dahl Inference et peut changer. Consultez les chiffres en direct sur [inference.dahl.global](https://inference.dahl.global) — et laissez la vérification de l'outil décider :

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modèles — tous les 3

`GET /v1/models` (public, sans authentification) sert actuellement **3 modèles** :

|Modèle|✓|
|---|---|
|`MiniMaxAI/MiniMax-M2.7`|✓|
|`deepseek-ai/DeepSeek-V4-Flash-0731`|✓|
|`zai-org/GLM-5.3-Flash`|✓|

Test en direct d'une clé :

```bash
curl https://inference.dahl.global/v1/chat/completions \
  -H "Authorization: Bearer dahl_…" -H "Content-Type: application/json" \
  -d '{"model":"MiniMaxAI/MiniMax-M2.7","messages":[{"role":"user","content":"hi"}]}'
```

> Dahl répond aussi à `POST /tokens` **sans aucune authentification** et distribue le même crédit `{"token":"dahl_…","available_tokens":100000000}`, rattachable à un compte plus tard avec `POST /v1/account/keys/claim`. Cet outil utilise de vrais comptes ; la route anonyme est documentée parce qu'elle porte le même crédit.

## 🧪 Comment utiliser l'API

L'URL de base est **`https://inference.dahl.global/v1`** — compatible OpenAI, donc tout ce qui parle OpenAI fonctionne.

**N'importe quel SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://inference.dahl.global/v1", api_key="dahl_…")
print(client.chat.completions.create(model="MiniMaxAI/MiniMax-M2.7",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**Vérification du solde** (le même appel que fait l'outil avant de faire confiance à une clé) :

```bash
curl https://inference.dahl.global/tokens/current -H "Authorization: Bearer dahl_…"

# {"available_tokens": 100000000}
```

**N'importe quel agent / outil avec une URL de base personnalisée** (Cursor, OpenCode, Kilo Code, …) : URL de base `https://inference.dahl.global/v1`, collez une clé, choisissez l'un des 3 identifiants de modèle.

## 🛠 Démarrage rapide

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

`keys.txt` (une clé par ligne, mis en miroir vers `%USERPROFILE%\dahl-keys.txt`) n'est écrit **qu'**après qu'une complétion de chat en direct a prouvé la clé ; `accounts.json` conserve le nom d'utilisateur / l'empreinte / l'id de clé afin que tout compte puisse être récupéré plus tard (`src/recover.js`).

### 🖱️ Le lanceur

Le lanceur demande la liste de proxies et le nombre, les mémorise dans `launcher.config.json`, puis exécute le CLI — génération, vérification, filtrage des proxies, paramètres, aide et *Connexion à 9Router*.

## ✅ Vérifié et fonctionnel — chaque clé est testée

| Vérification | Résultat |
| --- | --- |
| `POST /v1/auth/signup` | **201** + `api_key.token` + `fingerprint` — aucun e-mail, téléphone, carte ni captcha à aucune étape |
| `POST /v1/account/allocate {amount:100000000}` | **200**, puis `GET /tokens/current` indique **100000000** |
| `POST /v1/chat/completions` (`MiniMaxAI/MiniMax-M2.7`) — exécuté pour **chaque** clé avant son écriture | **200** avec un vrai `choices[0].message.content` et un bloc `usage` |
| une clé qui échoue à sa vérification de chat | jamais écrite dans `keys.txt` — le compte reste récupérable dans `accounts.json` |

```bash
node src/cli.js --verify-only      # GET /tokens/current + a chat call per key
node src/cli.js --screen           # only screen your proxy list
```

## 🧭 Comment ça marche

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Dahl Inference page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://inference.dahl.global/v1/chat/completions → real content = the key is live
```

| Étape | Appel | Notes |
| --- | --- | --- |
| santé | `GET /health` | accessibilité de la sortie (sans authentification) |
| vérification du nom d'utilisateur | `GET /v1/auth/check-username?username=…` | `200 {"available":true,"valid":true}` ; déjà pris → `{"available":false,"suggestions":[…]}` |
| **inscription** | `POST /v1/auth/signup {"username":"…"}` | `201` + cookie de session + `{user, fingerprint, api_key}` ; le nom d'utilisateur respecte `^[a-z0-9_]{3,20}$` (cet outil génère `adjective_noun_123`) |
| connexion (récupération) | `POST /v1/auth/signin {"fingerprint":"…"}` | `200` + cookie de session — l'empreinte est le seul identifiant du compte, donc un proxy mort ne fait jamais perdre un compte |
| état du compte | `GET /v1/account` | `{user, paid, token_balance, tokens_on_keys}` |
| allouer le crédit | `POST /v1/account/allocate {"key_id":…, "amount":100000000}` | la totalité du crédit constitue le pool du compte (`400 not enough tokens in pool` lorsqu'il est vide) |
| solde de la clé | `GET /tokens/current` | `Bearer dahl_…` → `{"available_tokens":100000000}` |
| inférence | `POST /v1/chat/completions` | format OpenAI ; `GET /v1/models` est public |

## ⚙️ Options du CLI

```bash
node src/cli.js --count N        # screen exits, mint, allocate, verify (any N, default 30)
node src/cli.js --verify-only    # re-verify every key in keys.txt
node src/cli.js --screen         # only screen your proxy list
node src/cli.js --connect-9router  # …and register every key in keys.txt into 9Router
node src/cli.js --help
```

| Variable d'environnement | Valeur par défaut | Signification |
| --- | --- | --- |
| `DAHL_PROXIES` | `proxies.txt` | fichier du pool, un proxy par ligne |
| `DAHL_MODEL` | `MiniMaxAI/MiniMax-M2.7` | modèle utilisé pour la vérification en direct |
| `DAHL_AMOUNT` | `100000000` | crédit de bienvenue alloué à chaque clé |

## 🛰️ Derrière un proxy

**Obligatoire — il n'existe aucune solution de repli en connexion directe dans cet outil.** Chaque requête sort via une ligne proxy de votre pool ; une ligne morte fait échouer cette tentative de compte et l'outil passe à la suite (l'empreinte dans `accounts.json` vous permet de la terminer plus tard depuis n'importe quelle autre sortie). Le pool est re-testé au moment de l'utilisation, et `--screen` vous permet de tester une nouvelle liste contre l'hôte avant une exécution.

## 📄 Fichiers

| Chemin | Contenu |
| --- | --- |
| `keys.txt` | une clé vérifiée en direct par ligne — ignoré par git, jamais commité |
| `accounts.json` | nom d'utilisateur / user_id / empreinte / id de clé — de quoi récupérer n'importe quel compte |
| `/v1/models` | le catalogue en direct (public, sans authentification) — 3 ids |
| `proxies.txt` | vos sorties, une par ligne — ignoré par git |
| `outputs/` | journaux et état des exécutions — ignoré par git |

## 🔌 Se connecter à 9Router

[9Router](https://9router.com) est un routeur auto-hébergé compatible OpenAI. Dahl expose un point de terminaison compatible OpenAI : enregistrez-le une fois et chaque clé devient une connexion sous un même nœud fournisseur :

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

Lancez-le sans `--api-key` pour enregistrer **toutes** les clés de `keys.txt`. Une nouvelle exécution est idempotente : le nœud est identifié par `--prefix dahl`, chaque connexion par son nom (`dahl-001`, `dahl-002`, …). Valeurs par défaut : `--base http://localhost:20128`, `--password 123456`, `--name "Dahl Inference"`, `--prefix dahl`, `--base-url https://inference.dahl.global/v1`, `--model MiniMaxAI/MiniMax-M2.7`. Les modèles sont alors servis sous `dahl/<model id>`.

## 🔌 Se connecter à OmniRoute

[OmniRoute](https://omniroute.online) est un routeur auto-hébergé compatible OpenAI. Dahl expose un point de terminaison compatible OpenAI : enregistrez-le une fois et chaque clé devient une connexion sous un même nœud fournisseur :

```bash
node src/connect-omniroute.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

Lancez-le sans `--api-key` pour enregistrer **toutes** les clés de `keys.txt`. Une nouvelle exécution est idempotente : le nœud est identifié par `--prefix dahl`, chaque connexion par son nom (`dahl-001`, `dahl-002`, …). Valeurs par défaut : `--base http://localhost:20128`, `--password 123456`, `--name "Dahl Inference"`, `--prefix dahl`, `--base-url https://inference.dahl.global/v1`, `--model MiniMaxAI/MiniMax-M2.7`. Les modèles sont alors servis sous `dahl/<model id>`.
## 🔑 Ce qu'une clé vous apporte

| | |
| --- | --- |
| 🏢 Fournisseur | **Dahl Inference** — [inference.dahl.global](https://inference.dahl.global) |
| 🎁 Ce que le fournisseur offre | 100M de tokens gratuits par compte — inscription REST simple, sans e-mail, sans carte |
| 🔑 Ce qu'une clé vous apporte | une clé API rattachée à son propre compte : les identifiants de modèles du point de terminaison ci-dessous, dans les limites de votre offre. Le quota réside sur le **compte**, ce qui explique précisément pourquoi cet outil crée un compte par clé |
| 🌐 Forme de l'API | compatible OpenAI : `POST https://inference.dahl.global/v1/chat/completions` |
| 🔒 Vos données | seul `inference.dahl.global` est contacté — il n'y a aucune étape de boîte mail ; les clés restent sur votre machine |

## 🐞 Problèmes

Si Dahl modifie la forme de l'inscription, la sémantique d'allocate ou les limites de débit, l'outil s'arrête à cette étape et le signale. **[Ouvrez un ticket](../../issues)** en indiquant la commande exécutée et la sortie exacte ; les PR sont les bienvenues.

## 📄 Licence

MIT © 2026 — voir [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 les contributeurs de dahl-bulk-apikey

</div>

## ⚡ Profil d'exécution (préréglages)

`--preset=turbo|balanced|safe` définit le nombre de workers + la pause entre les comptes (turbo = 5,
balanced = 4, safe = 2) ; les options explicites `--conc`/`--gap` (ou les propres flags du dépôt) l'emportent toujours,
et sans `--preset` l'outil conserve exactement son profil historique.

Turbo est recommandé (5 workers) ; davantage présente un risque de charge/ban sur une machine faible.