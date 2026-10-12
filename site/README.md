# SAYNOVRA · Tanıtım sitesi

Tek sayfalık statik site. Derleme adımı ve bağımlılık yok; `public/` klasörü olduğu gibi yayınlanır.

## Yerelde çalıştırma

```bash
python -m http.server 4173 --bind 127.0.0.1 --directory public
```

Ardından `http://127.0.0.1:4173` adresini açın. Pano (kopyalama) özelliği yalnızca `localhost` veya HTTPS altında çalışır.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `public/index.html` | Sayfa içeriği ve metinler |
| `public/css/styles.css` | Görünüm. Renk ve yazı tipi değişkenleri dosyanın başında |
| `public/js/app.js` | Mobil menü, proje özeti formu, proje listesi |
| `public/media/` | Hero videosu ve kapak görseli |
| `public/projects.json` | "İşler" bölümünün verisi |
| `public/css/fonts.css`, `public/fonts/` | Yerel yazı tipleri (Space Grotesk, Inter, JetBrains Mono) |

## Proje eklemek

`projects.json` boşken "İşler" bölümü ve menü bağlantısı gizlidir. Kayıt eklendiğinde kendiliğinden görünür.

```json
[
  {
    "title": "Proje adı",
    "description": "Bir iki cümlelik özet.",
    "image": "media/proje.jpg",
    "url": "https://ornek.com"
  }
]
```

`image` ve `url` isteğe bağlıdır. Görsel aynı siteden, bağlantı `https` olmak zorundadır; diğerleri yok sayılır.

## İletişim kanalı

Tek kanal Instagram: `https://ig.me/m/saynovra`. Kullanıcı adı değişirse `index.html` içindeki üç bağlantı ve `app.js` başındaki `INSTAGRAM_HANDLE` güncellenir. Form hiçbir sunucuya veri göndermez; özeti panoya kopyalar.

## Güvenlik

Sayfa `Content-Security-Policy` meta etiketiyle yalnızca kendi kaynaklarını yükler. Satır içi `style` veya `script` eklenirse tarayıcı engeller; stil `styles.css`, betik `app.js` içinde kalmalıdır.

## Yayın

Firebase Hosting. Ayarlar `firebase.json` (yayın dizini, güvenlik ve önbellek başlıkları) ve `.firebaserc` (proje kimliği) içinde.

```bash
firebase deploy --only hosting
```

Yayın adresi: https://saynovra.web.app. Özel alan adı bağlanırsa `index.html` içindeki `og:url`, `og:image` ve `canonical` yeni adrese çevrilmelidir.
