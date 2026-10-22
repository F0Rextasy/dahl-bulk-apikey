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

**Otomatik oluşturulan API anahtarlarıyla toplu Dahl Inference hesabı açın — OpenAI uyumlu çıkarım + 9Router bağlayıcısı.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-3%20served-412991?style=for-the-badge)](https://inference.dahl.global/docs)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Hızlı başlangıç](#-quick-start) · [🎁 Ücretsiz katman](#-free-tier--how-much-you-get) · [🤖 Modeller](#-models--all-3-of-them) · [🧪 API'yi kullanın](#-how-to-use-the-api) · [✅ Doğrulandı](#-verified-working--every-key-is-tested) · [🧭 Nasıl çalışır](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Seçenekler](#️-cli-options) · [🛰️ Proxyler](#️-behind-a-proxy) · [🐞 Sorunlar](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Bu neden var

Dahl Inference her hesaba **100.000.000 token'lık bir hoş geldin hibesi** veriyor ve hesabın ilk API anahtarı doğrudan kayıt çağrısının yanıtıyla dönüyor. Hibe *hesap havuzunda* durur ve tek bir `allocate` çağrısıyla anahtara aktarılır — bu yüzden burada doğru birim, anahtar başına bir hesaptır. Tüm akış **düz REST JSON**: e-posta yok, telefon yok, kart yok, captcha yok, tarayıcı yok.

## 🎁 Ücretsiz katman — ne kadar alıyorsunuz

**Her yeni Dahl hesabı 100.000.000 token'lık bir hoş geldin hibesi taşır — e-posta yok, telefon yok, kart yok, captcha yok.**

| Ne | Değer |
| --- | --- |
| Hoş geldin hibesi | Hesap başına **100.000.000 token** — kayıttan hemen sonra `GET /v1/account` çağrısı `token_balance = 100000000` bildirir |
| Kart gerekli mi | **Hayır** |
| Süre sonu | yok — hibe sona ermez |
| Hız limiti | dakika başına limit yok; sohbet **model kapasitesi** ile sınırlanır (ücretsiz hesaplar ücretlilerden sonra kabul edilir → `429 model_concurrency`, birkaç saniye sonra tekrar deneyin veya sunulan başka bir model kullanın) |
| Kayıt | REST: `POST /v1/auth/signup {"username":"adj_noun_123"}` — posta kutusu yok |
| Ölçeklenen birim | **bir hesap = bir anahtar** (hibe hesap başına olduğundan aynı hesaptaki ikinci anahtar 0'dan başlar) → `--count N` aslında "N × 100M token" demektir |

Uçtan uca ölçüldü: kayıt → `POST /v1/account/allocate` hibeyi anahtara aktarır → `GET /tokens/current` yanıtı `{"available_tokens": 100000000}`. Bakiyesi sıfır olan bir anahtar sohbette `402 available tokens exhausted` yanıtı verir.

> 💡 Ücretsiz katman Dahl Inference tarafından belirlenir ve değişebilir. Güncel rakamları [inference.dahl.global](https://inference.dahl.global) adresinden kontrol edin — ve kararı aracın kendi kontrolüne bırakın:

```bash
node src/cli.js --verify-only     # every key in keys.txt is re-tested with a real chat call
```

## 🤖 Modeller — üçü de

`GET /v1/models` (herkese açık, kimlik doğrulaması yok) şu anda **3 model** sunuyor:

|Model|✓|
|---|---|
|`MiniMaxAI/MiniMax-M2.7`|✓|
|`deepseek-ai/DeepSeek-V4-Flash-0731`|✓|
|`zai-org/GLM-5.3-Flash`|✓|

Bir anahtarın canlı testi:

```bash
curl https://inference.dahl.global/v1/chat/completions \
  -H "Authorization: Bearer dahl_…" -H "Content-Type: application/json" \
  -d '{"model":"MiniMaxAI/MiniMax-M2.7","messages":[{"role":"user","content":"hi"}]}'
```

> Dahl ayrıca `POST /tokens` çağrısını **hiç kimlik doğrulaması olmadan** yanıtlar ve aynı `{"token":"dahl_…","available_tokens":100000000}` hibesini verir; bu anahtar daha sonra `POST /v1/account/keys/claim` ile bir hesaba bağlanabilir. Bu araç gerçek hesaplar kullanır; anonim yolun belgelenmesinin nedeni aynı hibeyi taşımasıdır.

## 🧪 API nasıl kullanılır

Temel URL **`https://inference.dahl.global/v1`** — OpenAI uyumlu, yani OpenAI konuşan her şey çalışır.

**Herhangi bir SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://inference.dahl.global/v1", api_key="dahl_…")
print(client.chat.completions.create(model="MiniMaxAI/MiniMax-M2.7",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**Bakiye kontrolü** (aracın bir anahtara güvenmeden önce yaptığı çağrının aynısı):

```bash
curl https://inference.dahl.global/tokens/current -H "Authorization: Bearer dahl_…"

# {"available_tokens": 100000000}
```

**Özel temel URL kullanan herhangi bir ajan / araç** (Cursor, OpenCode, Kilo Code, …): temel URL `https://inference.dahl.global/v1`, bir anahtar yapıştırın, 3 model kimliğinden birini seçin.

## 🛠 Hızlı başlangıç

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

`keys.txt` (her satırda bir anahtar, `%USERPROFILE%\dahl-keys.txt` dosyasına da yansıtılır) **yalnızca** canlı bir sohbet tamamlaması anahtarı kanıtladıktan sonra yazılır; `accounts.json` kullanıcı adını / parmak izini / anahtar kimliğini saklar, böylece her hesap daha sonra kurtarılabilir (`src/recover.js`).

### 🖱️ Başlatıcı

Başlatıcı proxy listesini ve sayıyı sorar, bunları `launcher.config.json` içinde hatırlar ve CLI'yi çalıştırır — üret, doğrula, proxyleri tara, ayarlar, yardım ve *9Router'a Bağlan*.

## ✅ Doğrulandı — her anahtar test edilir

| Kontrol | Sonuç |
| --- | --- |
| `POST /v1/auth/signup` | **201** + `api_key.token` + `fingerprint` — hiçbir adımda e-posta, telefon, kart veya captcha yok |
| `POST /v1/account/allocate {amount:100000000}` | **200**, ardından `GET /tokens/current` **100000000** bildirir |
| `POST /v1/chat/completions` (`MiniMaxAI/MiniMax-M2.7`) — yazılmadan önce **her** anahtar için çalıştırılır | gerçek `choices[0].message.content` ve bir `usage` bloğu ile **200** |
| sohbet kontrolünde başarısız olan anahtar | `keys.txt` dosyasına asla yazılmaz — hesap `accounts.json` içinde kurtarılabilir kalır |

```bash
node src/cli.js --verify-only      # GET /tokens/current + a chat call per key
node src/cli.js --screen           # only screen your proxy list
```

## 🧭 Nasıl çalışır

```
inbox (one address per account)                                  a fresh address per account
   │
   ├─▶ sign-up: Dahl Inference page → e-mail address → code / link from the inbox
   ├─▶ session: the account's cookies or access token in hand
   ├─▶ key mint: the account's key endpoint → plaintext key returned once (written to disk immediately)
   └─▶ live proof: POST https://inference.dahl.global/v1/chat/completions → real content = the key is live
```

| Adım | Çağrı | Notlar |
| --- | --- | --- |
| sağlık | `GET /health` | çıkışın erişilebilirliği (kimlik doğrulaması yok) |
| kullanıcı adı kontrolü | `GET /v1/auth/check-username?username=…` | `200 {"available":true,"valid":true}`; alınmışsa → `{"available":false,"suggestions":[…]}` |
| **kayıt** | `POST /v1/auth/signup {"username":"…"}` | `201` + oturum çerezi + `{user, fingerprint, api_key}`; kullanıcı adı `^[a-z0-9_]{3,20}$` biçiminde (bu araç `adjective_noun_123` üretir) |
| oturum açma (kurtarma) | `POST /v1/auth/signin {"fingerprint":"…"}` | `200` + oturum çerezi — parmak izi hesabın tek kimlik bilgisidir, bu yüzden ölü bir proxy hiçbir hesabı kaybettirmez |
| hesap durumu | `GET /v1/account` | `{user, paid, token_balance, tokens_on_keys}` |
| hibeyi aktar | `POST /v1/account/allocate {"key_id":…, "amount":100000000}` | tüm hibe hesap havuzundadır (havuz boşsa `400 not enough tokens in pool`) |
| anahtar bakiyesi | `GET /tokens/current` | `Bearer dahl_…` → `{"available_tokens":100000000}` |
| çıkarım | `POST /v1/chat/completions` | OpenAI biçimi; `GET /v1/models` herkese açıktır |

## ⚙️ CLI seçenekleri

```bash
node src/cli.js --count N        # screen exits, mint, allocate, verify (any N, default 30)
node src/cli.js --verify-only    # re-verify every key in keys.txt
node src/cli.js --screen         # only screen your proxy list
node src/cli.js --connect-9router  # …and register every key in keys.txt into 9Router
node src/cli.js --help
```

| Ortam değişkeni | Varsayılan | Anlamı |
| --- | --- | --- |
| `DAHL_PROXIES` | `proxies.txt` | havuz dosyası, her satırda bir proxy |
| `DAHL_MODEL` | `MiniMaxAI/MiniMax-M2.7` | canlı doğrulamada kullanılan model |
| `DAHL_AMOUNT` | `100000000` | her anahtara aktarılan hoş geldin hibesi |

## 🛰️ Proxy arkasında

**Zorunlu — bu araçta hiçbir yerde doğrudan bağlantı yedeği yoktur.** Her istek havuzunuzdaki bir proxy satırından çıkar; ölü bir satır o hesap denemesini başarısız kılar ve araç bir sonrakine geçer (`accounts.json` içindeki parmak izi, o hesabı daha sonra başka herhangi bir çıkıştan tamamlamanızı sağlar). Havuz, kullanım anında yeniden yoklanır ve `--screen` ile çalıştırmadan önce yeni bir listeyi sunucuya karşı test edebilirsiniz.

## 📄 Dosyalar

| Yol | İçerik |
| --- | --- |
| `keys.txt` | her satırda canlı doğrulanmış bir anahtar — git tarafından yok sayılır, asla commit edilmez |
| `accounts.json` | kullanıcı adı / user_id / parmak izi / anahtar kimliği — herhangi bir hesabı kurtarmaya yeter |
| `/v1/models` | canlı katalog (herkese açık, kimlik doğrulaması yok) — 3 kimlik |
| `proxies.txt` | çıkışlarınız, her satırda bir tane — git tarafından yok sayılır |
| `outputs/` | çalıştırma günlükleri ve durum — git tarafından yok sayılır |

## 🔌 9Router'a bağlan

[9Router](https://9router.com) kendi sunucunuzda barındırılan, OpenAI uyumlu bir yönlendiricidir. Dahl, OpenAI uyumlu bir uç nokta sunduğu için bir kez kaydedin ve her anahtar tek bir sağlayıcı düğümü altında bir bağlantıya dönüşsün:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

`--api-key` olmadan çalıştırırsanız `keys.txt` içindeki **tüm** anahtarlar kaydedilir. Tekrar çalıştırma idempotenttir: düğüm `--prefix dahl` ile, her bağlantı ise adıyla (`dahl-001`, `dahl-002`, …) eşleştirilir. Varsayılanlar: `--base http://localhost:20128`, `--password 123456`, `--name "Dahl Inference"`, `--prefix dahl`, `--base-url https://inference.dahl.global/v1`, `--model MiniMaxAI/MiniMax-M2.7`. Modeller ardından `dahl/<model id>` olarak sunulur.

## 🔌 OmniRoute'a bağlan

[OmniRoute](https://omniroute.online) kendi sunucunuzda barındırılan, OpenAI uyumlu bir yönlendiricidir. Dahl, OpenAI uyumlu bir uç nokta sunduğu için bir kez kaydedin ve her anahtar tek bir sağlayıcı düğümü altında bir bağlantıya dönüşsün:

```bash
node src/connect-omniroute.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

`--api-key` olmadan çalıştırırsanız `keys.txt` içindeki **tüm** anahtarlar kaydedilir. Tekrar çalıştırma idempotenttir: düğüm `--prefix dahl` ile, her bağlantı ise adıyla (`dahl-001`, `dahl-002`, …) eşleştirilir. Varsayılanlar: `--base http://localhost:20128`, `--password 123456`, `--name "Dahl Inference"`, `--prefix dahl`, `--base-url https://inference.dahl.global/v1`, `--model MiniMaxAI/MiniMax-M2.7`. Modeller ardından `dahl/<model id>` olarak sunulur.
## 🔑 Bir anahtar size ne kazandırır

| | |
| --- | --- |
| 🏢 Sağlayıcı | **Dahl Inference** — [inference.dahl.global](https://inference.dahl.global) |
| 🎁 Sağlayıcının verdikleri | Hesap başına 100M ücretsiz token — düz REST kaydı, e-posta yok, kart yok |
| 🔑 Bir anahtarın kazandırdıkları | kendi hesabına bağlı bir API anahtarı: aşağıdaki uç noktadaki model kimlikleri, planınızın limitlerinde. Kota **hesapta** yaşar, bu aracın anahtar başına bir hesap açmasının nedeni tam olarak budur |
| 🌐 API biçimi | OpenAI uyumlu: `POST https://inference.dahl.global/v1/chat/completions` |
| 🔒 Verileriniz | yalnızca `inference.dahl.global` ile iletişim kurulur — hiç posta kutusu adımı yoktur; anahtarlar makinenizde kalır |

## 🐞 Sorunlar

Dahl kayıt biçimini, allocate semantiğini veya hız limitlerini değiştirirse araç o adımda durur ve bunu bildirir. Çalıştırdığınız komut ve tam çıktıyla birlikte **[bir sorun açın](../../issues)**; PR'lar memnuniyetle karşılanır.

## 📄 Lisans

MIT © 2026 — bkz. [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 dahl-bulk-apikey contributors

</div>

## ⚡ Çalışma biçimi (ön ayarlar)

`--preset=turbo|balanced|safe` worker sayısını ve hesaplar arasındaki beklemeyi ayarlar (turbo = 5,
balanced = 4, safe = 2); açıkça verilen `--conc`/`--gap` (veya deponun kendi bayrakları) her zaman önceliklidir,
ve `--preset` verilmezse araç tarihsel biçimini aynen korur.

Turbo önerilir (5 worker); daha fazlası zayıf bilgisayarda yük/ban riski.