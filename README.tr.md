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

**Otomatik oluşturulan API anahtarlarıyla toplu Dahl Inference hesabı oluşturun — OpenAI uyumlu çıkarım + 9Router bağlayıcısı.**

[![Node](https://img.shields.io/badge/Node-%E2%89%A518-3DA639?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Dependencies](https://img.shields.io/badge/dependencies-0-blue?style=for-the-badge)](#)
[![License](https://img.shields.io/badge/license-MIT-6ea8fe?style=for-the-badge)](LICENSE)
[![Models](https://img.shields.io/badge/models-3%20served-412991?style=for-the-badge)](https://inference.dahl.global/docs)
[![9Router](https://img.shields.io/badge/9Router-connector-8B5CF6?style=for-the-badge)](#-connect-to-9router)
[![OmniRoute](https://img.shields.io/badge/OmniRoute-connector-8B5CF6?style=for-the-badge)](#-connect-to-omniroute)
[![X](https://img.shields.io/badge/X-%40bigbullapp-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/bigbullapp)

[🛠 Hızlı başlangıç](#-quick-start) · [🎁 Ücretsiz katman](#-free-tier--how-much-you-get) · [🤖 Modeller](#-models--all-3-of-them) · [🧪 API'yi kullanma](#-how-to-use-the-api) · [✅ Doğrulandı](#-verified-working--every-key-is-tested) · [🧭 Nasıl çalışır](#-how-it-works) · [🔌 9Router](#-connect-to-9router) · [⚙️ Seçenekler](#️-cli-options) · [🛰️ Proxy'ler](#️-behind-a-proxy) · [🐞 Sorunlar](#-issues)

</div>

<div align="center">

**English** · [Türkçe](README.tr.md) · [中文](README.cn.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Português](README.pt.md)

</div>

---

## ✨ Bu neden var

Dahl Inference her hesaba **100.000.000 token'lık hoş geldin hibesi** verir ve hesabın ilk API anahtarı kayıt çağrısının kendisi tarafından döndürülür. Hibe *hesap havuzunda* yaşar ve tek bir `allocate` çağrısıyla anahtara taşınır — bu yüzden burada doğru birim hesap başına bir anahtardır. Tüm akış **düz REST JSON**'dur: e-posta yok, telefon yok, kart yok, captcha yok, tarayıcı yok.

## 🎁 Ücretsiz katman — ne kadar alırsınız

**Her yeni Dahl hesabı 100.000.000 token'lık hoş geldin hibesi taşır — e-posta yok, telefon yok, kart yok, captcha yok.**

| Ne | Değer |
| --- | --- |
| Hoş geldin hibesi | Hesap başına **100.000.000 token** — `GET /v1/account` kayıttan hemen sonra `token_balance = 100000000` bildirir |
| Kart gerekli mi | **Hayır** |
| Son kullanma | yok — hibe süresi dolmaz |
| Hız sınırı | dakika başına sınır yok; sohbet **model kapasitesi** ile kapılıdır (ücretsiz hesaplar ücretlilerden sonra kabul edilir → `429 model_concurrency`, birkaç saniye sonra yeniden deneyin veya başka bir sunulan model kullanın) |
| Kayıt | REST: `POST /v1/auth/signup {"username":"adj_noun_123"}` — posta kutusu yok |
| Ölçeklenen birim | **bir hesap = bir anahtar** (hibe hesap başınadır: aynı hesaptaki ikinci anahtar 0'dan başlar) → `--count N` aslında "N × 100M token" demektir |

Uçtan uca ölçüldü: kayıt → `POST /v1/account/allocate` hibeyi anahtara taşır → `GET /tokens/current` `{"available_tokens": 100000000}` yanıtını verir. Bakiyesi sıfır olan bir anahtar sohbette `402 available tokens exhausted` yanıtını verir.

> 💡 Ücretsiz katman Dahl Inference tarafından belirlenir ve değişebilir. Güncel sayıları [inference.dahl.global](https://inference.dahl.global) adresinden kontrol edin — ve aracın kendi kapısının karar vermesine izin verin:

```bash
node src/cli.js --verify-only     # keys.txt içindeki her anahtar gerçek bir sohbet çağrısıyla yeniden test edilir
```

## 🤖 Modeller — üçünün tamamı

`GET /v1/models` (herkese açık, kimlik doğrulama yok) şu anda **3 model** sunar:

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

> Dahl ayrıca `POST /tokens` isteğine **hiç kimlik doğrulama olmadan** yanıt verir ve aynı `{"token":"dahl_…","available_tokens":100000000}` hibesini verir; bu daha sonra `POST /v1/account/keys/claim` ile bir hesaba bağlanabilir. Bu araç gerçek hesaplar kullanır; anonim yol aynı hibeyi taşıdığı için belgelenmiştir.

## 🧪 API nasıl kullanılır

Temel URL **`https://inference.dahl.global/v1`** — OpenAI uyumlu, yani OpenAI konuşan her şey çalışır.

**Herhangi bir SDK / curl**

```python
from openai import OpenAI
client = OpenAI(base_url="https://inference.dahl.global/v1", api_key="dahl_…")
print(client.chat.completions.create(model="MiniMaxAI/MiniMax-M2.7",
      messages=[{"role": "user", "content": "hi"}]).choices[0].message.content)
```

**Bakiye kontrolü** (aracın bir anahtara güvenmeden önce yaptığı aynı çağrı):

```bash
curl https://inference.dahl.global/tokens/current -H "Authorization: Bearer dahl_…"
# {"available_tokens": 100000000}
```

**Özel temel URL kullanan herhangi bir ajan / araç** (Cursor, OpenCode, Kilo Code, …): temel URL `https://inference.dahl.global/v1`, bir anahtar yapıştırın, 3 model kimliğinden birini seçin.

## 🛠 Hızlı başlangıç

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

`keys.txt` (satır başına bir anahtar, `%USERPROFILE%\dahl-keys.txt` dosyasına yansıtılır) **yalnızca** canlı bir sohbet tamamlaması anahtarı kanıtladıktan sonra yazılır; `accounts.json` kullanıcı adını / parmak izini / anahtar kimliğini saklar, böylece herhangi bir hesap daha sonra kurtarılabilir (`src/recover.js`).

### 🖱️ Başlatıcı

Başlatıcı proxy listesini (isteğe bağlı — olmadan CLI doğrudan çalışır) ve sayıyı sorar, bunları `launcher.config.json` içinde hatırlar ve CLI'yi çalıştırır — oluştur, doğrula, proxy'leri tara, ayarlar, yardım ve *9Router'a Bağlan*.

## ✅ Çalıştığı doğrulandı — her anahtar test edilir

> **Kalite kapıları.** Buradaki her anahtar `keys.txt` dosyasına yazılmadan önce canlı bir `chat-200` geçti
> (ölü anahtarlar asla gönderilmez). Yönlendirici kombinasyonları model düzeyinde aynı kuralı izler: bir giriş
> **yalnızca model `chat-200` yanıtlıyorsa ve araçları çağırabiliyorsa** eklenir — araç desteği olmayan bir model,
> ölü bir anahtar veya ölü bir sağlayıcı eklenmek yerine çıkarılır. **9Router ve OmniRoute** ile çalışır.

| Kontrol | Sonuç |
| --- | --- |
| `POST /v1/auth/signup` | **201** + `api_key.token` + `fingerprint` — hiçbir adımda e-posta, telefon, kart veya captcha yok |
| `POST /v1/account/allocate {amount:100000000}` | **200**, ardından `GET /tokens/current` **100000000** bildirir |
| `POST /v1/chat/completions` (`MiniMaxAI/MiniMax-M2.7`) — yazılmadan önce **her** anahtar için çalıştırılır | Gerçek `choices[0].message.content` ve bir `usage` bloğu ile **200** |
| sohbet kontrolünde başarısız olan bir anahtar | `keys.txt` dosyasına asla yazılmaz — hesap `accounts.json` içinde kurtarılabilir kalır |

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
| sağlık | `GET /health` | çıkışın erişilebilirliği (kimlik doğrulama yok) |
| kullanıcı adı kontrolü | `GET /v1/auth/check-username?username=…` | `200 {"available":true,"valid":true}`; alınmışsa → `{"available":false,"suggestions":[…]}` |
| **kayıt** | `POST /v1/auth/signup {"username":"…"}` | `201` + oturum çerezi + `{user, fingerprint, api_key}`; kullanıcı adı `^[a-z0-9_]{3,20}$` (bu araç `adjective_noun_123` üretir) |
| oturum açma (kurtarma) | `POST /v1/auth/signin {"fingerprint":"…"}` | `200` + oturum çerezi — parmak izi hesabın tek kimlik bilgisidir, bu yüzden ölü bir proxy bir hesabı asla kaybetmez |
| hesap durumu | `GET /v1/account` | `{user, paid, token_balance, tokens_on_keys}` |
| hibeyi tahsis et | `POST /v1/account/allocate {"key_id":…, "amount":100000000}` | tüm hibe hesap havuzudur (boşken `400 not enough tokens in pool`) |
| anahtar bakiyesi | `GET /tokens/current` | `Bearer dahl_…` → `{"available_tokens":100000000}` |
| çıkarım | `POST /v1/chat/completions` | OpenAI şekli; `GET /v1/models` herkese açıktır |

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
| `DAHL_PROXIES` | `proxies.txt` | havuz dosyası, satır başına bir proxy — isteğe bağlı: havuz olmadan CLI doğrudan bağlanır |
| `DAHL_MODEL` | `MiniMaxAI/MiniMax-M2.7` | canlı doğrulama için kullanılan model |
| `DAHL_AMOUNT` | `100000000` | her anahtara tahsis edilen hoş geldin hibesi |

## 🛰️ Proxy arkasında

**İsteğe bağlı — ölçekte önerilir (IP başına sınırlar, yasaklar).** Araç proxy olmadan da çalışır.

- **Havuzla:** çıkışları `proxies.txt` dosyasına koyun (veya `DAHL_PROXIES` ayarlayın) ve her istek bir proxy satırından geçer — havuz kullanım anında yeniden yoklanır, ölü bir satır o hesap denemesini başarısız kılar ve araç devam eder (`accounts.json` içindeki parmak izi, daha sonra başka bir çıkıştan tamamlamanıza olanak tanır).
- **Havuz olmadan:** CLI `running WITHOUT a proxy (direct)` yazdırır ve doğrudan bağlanır; kayıt, tahsis ve doğrulama değişmez — yalnızca paketlerin çıktığı yer değişir.
- `--screen` her iki modda da çalışır: bir çalıştırmadan önce sahip olduğunuz çıkışları (veya doğrudan rotayı) ana bilgisayara karşı test eder.

## 📄 Dosyalar

| Yol | İçerik |
| --- | --- |
| `keys.txt` | satır başına bir canlı doğrulanmış anahtar — git tarafından yok sayılır, asla işlenmez |
| `accounts.json` | kullanıcı adı / user_id / parmak izi / anahtar kimliği — herhangi bir hesabı kurtarmak için yeterli |
| `/v1/models` | canlı katalog (herkese açık, kimlik doğrulama yok) — 3 kimlik |
| `proxies.txt` | çıkışlarınız, satır başına bir tane — git tarafından yok sayılır |
| `outputs/` | çalıştırma günlükleri ve durumu — git tarafından yok sayılır |

## 🔌 9Router'a bağlan

[9Router](https://9router.com) kendi kendine barındırılan, OpenAI uyumlu bir yönlendiricidir. Dahl, OpenAI uyumlu bir uç nokta sunar, bu yüzden bir kez kaydedin ve her anahtar tek bir sağlayıcı düğümü altında bir bağlantı haline gelir:

```bash
node src/connect-9router.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

`--api-key` olmadan çalıştırın, `keys.txt` içindeki **her** anahtarı kaydetmek için. Yeniden çalıştırma etkisizdir: düğüm `--prefix dahl` ile eşleştirilir, her bağlantı adıyla (`dahl-001`, `dahl-002`, …). Varsayılanlar: `--base http://localhost:20128`, `--password 123456`, `--name "Dahl Inference"`, `--prefix dahl`, `--base-url https://inference.dahl.global/v1`, `--model MiniMaxAI/MiniMax-M2.7`. Modeller daha sonra `dahl/<model id>` olarak sunulur.

## 🔌 OmniRoute'a bağlan

[OmniRoute](https://omniroute.online) kendi kendine barındırılan, OpenAI uyumlu bir yönlendiricidir. Dahl, OpenAI uyumlu bir uç nokta sunar, bu yüzden bir kez kaydedin ve her anahtar tek bir sağlayıcı düğümü altında bir bağlantı haline gelir:

```bash
node src/connect-omniroute.js \
  --base http://localhost:20128 --password 123456 \
  --api-key dahl_xxxxxxxx
```

`--api-key` olmadan çalıştırın, `keys.txt` içindeki **her** anahtarı kaydetmek için. Yeniden çalıştırma etkisizdir: düğüm `--prefix dahl` ile eşleştirilir, her bağlantı adıyla (`dahl-001`, `dahl-002`, …). Varsayılanlar: `--base http://localhost:20128`, `--password 123456`, `--name "Dahl Inference"`, `--prefix dahl`, `--base-url https://inference.dahl.global/v1`, `--model MiniMaxAI/MiniMax-M2.7`. Modeller daha sonra `dahl/<model id>` olarak sunulur.
## 🔑 Bir anahtar size ne kazandırır

| | |
| --- | --- |
| 🏢 Sağlayıcı | **Dahl Inference** — [inference.dahl.global](https://inference.dahl.global) |
| 🎁 Sağlayıcının verdikleri | Hesap başına 100M ücretsiz token — düz REST kaydı, e-posta yok, kart yok |
| 🔑 Bir anahtar size ne kazandırır | kendi hesabına kapsamlı bir API anahtarı: aşağıdaki uç noktadaki model kimlikleri, planınızın sınırlarında. Kota **hesapta** yaşar, bu yüzden bu araç anahtar başına bir hesap oluşturur |
| 🌐 API şekli | OpenAI uyumlu: `POST https://inference.dahl.global/v1/chat/completions` |
| 🔒 Verileriniz | yalnızca `inference.dahl.global` ile iletişim kurulur — hiçbir posta kutusu adımı yoktur; anahtarlar makinenizde kalır |

## 🐞 Sorunlar

Dahl kayıt şeklini, tahsis semantiğini veya hız sınırlarını değiştirirse, araç o adımda durur ve bunu söyler. Çalıştırdığınız komut ve tam çıktıyla birlikte **[bir sorun açın](../../issues)**; PR'lar memnuniyetle karşılanır.

## 📄 Lisans

MIT © 2026 — bkz. [LICENSE](LICENSE).

<div align="center">

**[MIT](LICENSE)** © 2026 dahl-bulk-apikey katkıda bulunanlar

</div>

## ⚡ Çalıştırma şekli (ön ayarlar)

`--preset=turbo|balanced|safe` worker sayısını + hesaplar arasındaki duraklamayı ayarlar (turbo = 5,
balanced = 4, safe = 2); açık `--conc`/`--gap` (veya deponun kendi bayrakları) her zaman kazanır,
ve `--preset` olmadan araç tarihsel şeklini tam olarak korur.

Turbo önerilir (5 worker); daha fazlası zayıf bilgisayarda yük/ban riski.