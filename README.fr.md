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

[🛠 Démarrage rapide](#-quick-start) · [🎁 Niveau gratuit](#-free-tier--how-much-you-get) · [🤖 Modèles](#-models--all-3-of-them) · [🧪 Utiliser l'API](#-how-to-use-the-api) · [✅ Vérifié](#-verified-working--every-key-is-tested) · [🧭 Comment ça marche](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Options](#️-cli-options) · [🛰️ Proxys](#️-behind-a-proxy) · [🐞 Problèmes](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Pourquoi ce projet existe

Dahl Inference offre une **prime de bienvenue de 100 000 000 de tokens par compte**, et la première clé API du compte est renvoyée par l'appel d'inscription lui-même. La prime réside sur le *pool du compte* et est transférée sur la clé avec un seul appel `allocate` — c'est exactement pourquoi un compte par clé est la bonne unité ici. Tout le flux est du **REST JSON pur** : pas d'e-mail, pas de téléphone, pas de carte, pas de captcha, pas de navigateur.

## 🎁 Niveau gratuit — ce que vous obtenez

**Chaque nouveau compte Dahl porte une prime de bienvenue de 100 000 000 de tokens — sans e-mail, sans téléphone, sans carte, sans captcha.**

| Quoi | Valeur |
| --- | --- |
| Prime de bienvenue | **100 000 000 de tokens** par compte — `GET /v1/account` indique `token_balance = 100000000` juste après l'inscription |
| Carte requise | **Non** |
| Expiration | aucune — la prime n'expire pas |
| Limite de débit | pas de limite par minute ; le chat est conditionné par la **capacité du modèle** (les comptes gratuits sont admis après les payants → `429 model_concurrency`, réessayez quelques secondes plus tard ou utilisez un autre modèle servi) |
| Inscription | REST : `POST /v1/auth/signup {"username":"adj_noun_123"}` — pas de boîte mail |
| L'unité qui monte en charge | **un compte = une clé** (la prime est par compte : une deuxième clé sur le même compte démarre à 0) → `--count N` signifie en réalité « N × 100M tokens » |

Mesuré de bout en bout : inscription → `POST /v1/account/allocate` transfère la prime sur la clé → `GET /tokens/current` répond `{"available_tokens": 100000000}`. Une clé avec un solde nul répond `402 available tokens exhausted` au chat.

> 💡 Le niveau gratuit est défini par Dahl Inference et peut changer. Consultez les chiffres en direct sur [inference.dahl.global](https://inference.dahl.global) — et laissez le contrôle propre de l'outil décider :

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modèles — les 3

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

> Dahl répond aussi à `POST /tokens` **sans aucune authentification** et délivre la même prime `{"token":"dahl_…","available_tokens":100000000}`, rattachable à un compte plus tard avec `POST /v1/account/keys/claim`. Cet outil utilise de vrais comptes ; la route anonyme est documentée car elle porte la même prime.

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

# 1) your proxy list, one per line (http://, socks5://, socks4:// or bare host:port) — optional
printf 'socks5://127.0.0.1:1080\n' > proxies.txt   # optional — without it the tool runs direct

# 2) go
node src/launcher.js        # interactive: mint / verify / screen / settings
# or directly:
node src/cli.js --count 30  # any N — 30 is just the default sample
```

`keys.txt` (une clé par ligne, dupliqué vers `%USERPROFILE%\dahl-keys.txt`) n'est écrit **qu'**après qu'une complétion de chat en direct prouve la clé ; `accounts.json` conserve le nom d'utilisateur / l'empreinte / l'identifiant de clé afin que tout compte puisse être récupéré plus tard (`src/recover.js`).

### 🖱️ Le lanceur

Le lanceur demande la liste de proxys (facultative — sans elle, le CLI s'exécute en direct) et le nombre, les mémorise dans `launcher.config.json`, et exécute le CLI — mint, verify, screen proxies, settings, help, et *Connect to 9Router*.

## ✅ Vérifié fonctionnel — chaque clé est testée

> **Contrôles qualité.** Chaque clé ici a passé un `chat-200` en direct avant d'être écrite dans `keys.txt`
> (les clés mortes ne sont jamais livrées). Les combinaisons de routeur suivent la même règle au niveau du modèle : une entrée est
> ajoutée **uniquement si le modèle répond `chat-200` et peut appeler des outils** — un modèle sans support des outils,
> une clé morte ou un fournisseur mort est écarté au lieu d'être ajouté. Fonctionne avec **9Router et OmniRoute**.

| Contrôle | Résultat |
| --- | --- |
| `POST /v1/auth/signup` | **201** + `api_key.token` + `fingerprint` — pas d'e-mail, de téléphone, de carte ni de captcha à aucune étape |
| `POST /v1/account/allocate {amount:100000000}` | **200**, puis `GET /tokens/current` indique **100000000** |
| `POST /v1/chat/completions` (`MiniMaxAI/MiniMax-M2.7`) — exécuté pour **chaque** clé avant son écriture | **200** avec un vrai `choices[0].message.content` et un bloc `usage` |
| une clé qui échoue à son contrôle de chat | jamais écrite dans `keys.txt` — le compte reste récupérable dans `accounts.json` |

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
| vérification du nom d'utilisateur | `GET /v1/auth/check-username?username=…` | `200 {"available":true,"valid":true}` ; pris → `{"available":false,"suggestions":[…]}` |
| **inscription** | `POST /v1/auth/signup {"username":"…"}` | `201` + cookie de session + `{user, fingerprint, api_key}` ; le nom d'utilisateur est `^[a-z0-9_]{3,20}$` (cet outil génère `adjective_noun_123`) |
| connexion (récupération) | `POST /v1/auth/signin {"fingerprint":"…"}` | `200` + cookie de session — l'empreinte est le seul identifiant du compte, donc un proxy mort ne fait jamais perdre un compte |
| état du compte | `GET /v1/account` | `{user, paid, token_balance, tokens_on_keys}` |
| allouer la prime | `POST /v1/account/allocate {"key_id":…, "amount":100000000}` | toute la prime est le pool du compte (`400 not enough tokens in pool` quand vide) |
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

| Variable d'environnement | Défaut | Signification |
| --- | --- | --- |
| `DAHL_PROXIES` | `proxies.txt` | fichier de pool, un proxy par ligne — facultatif : sans pool, le CLI se connecte directement |
| `DAHL_MODEL` | `MiniMaxAI/MiniMax-M2.7` | modèle utilisé pour la vérification en direct |
| `DAHL_AMOUNT` | `100000000` | prime de bienvenue allouée à chaque clé |

## 🛰️ Derrière un proxy

**Facultatif — recommandé à grande échelle (limites par IP, bannissements).** L'outil fonctionne aussi sans proxy.

- **Avec un pool :** placez les sorties dans `proxies.txt` (ou définissez `DAHL_PROXIES`) et chaque requête passe par une ligne de proxy — le pool est re-testé au moment de l'utilisation, une ligne morte fait échouer cette tentative de compte et l'outil passe à la suivante (l'empreinte dans `accounts.json` vous permet de la terminer plus tard depuis n'importe quelle autre sortie).
- **Sans pool :** le CLI affiche `running WITHOUT a proxy (direct)` et se connecte directement ; l'inscription, l'allocation et la vérification sont inchangées — seul le point de départ des paquets change.
- `--screen` fonctionne dans les deux modes : il teste les sorties dont vous disposez (ou la route directe) contre l'hôte avant une exécution.

## 📄 Fichiers

| Chemin | Contenu |
| --- | --- |
| `keys.txt` | une clé vérifiée en direct par ligne — ignoré par git, jamais commité |
| `accounts.json` | nom d'utilisateur / user_id / empreinte / identifiant de clé — suffisant pour récupérer n'importe quel compte |
| `/v1/models` | le catalogue en direct (public, sans authentification) — 3 identifiants |
| `proxies.txt` | vos sorties, une par ligne — ignoré par git |
| `outputs/` | journaux d'exécution et état — ignoré par git |

## 🔌 Se connecter à 9Router

[9Router](https://9router.com) est un routeur auto-hébergé compatible OpenAI. Dahl sert un point de terminaison compatible OpenAI, donc enregistrez-le une fois et chaque clé devient une connexion sous un nœud fournisseur :

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

Exécutez-le sans `--api-key` pour enregistrer **chaque** clé de `keys.txt`. Une réexécution est idempotente : le nœud est mis en correspondance par `--prefix dahl`, chaque connexion par son nom (`dahl-001`, `dahl-002`, …). Valeurs par défaut : `--base http://localhost:20128`, `--password 123456`, `--name "Dahl Inference"`, `--prefix dahl`, `--base-url https://inference.dahl.global/v1`, `--model MiniMaxAI/MiniMax-M2.7`. Les modèles sont alors servis sous `dahl/<model id>`.

## 🔌 Se connecter à OmniRoute

[OmniRoute](https://omniroute.online) est un routeur auto-hébergé compatible OpenAI. Dahl sert un point de terminaison compatible OpenAI, donc enregistrez-le une fois et chaque clé devient une connexion sous un nœud fournisseur :

```bash
node src/connect-omniroute.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

Exécutez-le sans `--api-key` pour enregistrer **chaque** clé de `keys.txt`. Une réexécution est idempotente : le nœud est mis en correspondance par `--prefix dahl`, chaque connexion par son nom (`dahl-001`, `dahl-002`, …). Valeurs par défaut : `--base http://localhost:20128`, `--password 123456`, `--name "Dahl Inference"`, `--prefix dahl`, `--base-url https://inference.dahl.global/v1`, `--model MiniMaxAI/MiniMax-M2.7`. Les modèles sont alors servis sous `dahl/<model id>`.
## 🔑 Ce qu'une clé vous apporte

| | |
| --- | --- |
| 🏢 Fournisseur | **Dahl Inference** — [inference.dahl.global](https://inference.dahl.global) |
| 🎁 Ce que le fournisseur donne | 100M de tokens gratuits par compte — inscription REST simple, sans e-mail, sans carte |
| 🔑 Ce qu'une clé vous apporte | une clé API limitée à son propre compte : les identifiants de modèles sur le point de terminaison ci-dessous, aux limites de votre forfait. Le quota réside sur le **compte**, ce qui explique précisément pourquoi cet outil crée un compte par clé |
| 🌐 Format de l'API | compatible OpenAI : `POST https://inference.dahl.global/v1/chat/completions` |
| 🔒 Vos données | seul `inference.dahl.global` est contacté — il n'y a aucune étape de boîte mail ; les clés restent sur votre machine |

## 🐞 Problèmes

Si Dahl modifie le format d'inscription, la sémantique d'allocation ou les limites de débit, l'outil s'arrête à cette étape et le signale. **[Ouvrez un ticket](../../issues)** avec la commande que vous avez exécutée et la sortie exacte ; les PR sont bienvenues.

## 📄 Licence

MIT © 2026 — voir [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 dahl-bulk-apikey contributors

</div>

## ⚡ Forme d'exécution (préréglages)

`--preset=turbo|balanced|safe` définit les workers + la pause entre les comptes (turbo = 5,
balanced = 4, safe = 2) ; les `--conc`/`--gap` explicites (ou les propres drapeaux du dépôt) l'emportent toujours,
et sans `--preset` l'outil conserve exactement sa forme historique.

Turbo önerilir (5 worker); daha fazlası zayıf bilgisayarda yük/ban riski.