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
| `public/js/app.js` | Mobil menü, proje özeti formu, proje listesi ve video penceresi |
| `public/media/` | Hero videosu ve kapak görseli; `media/isler/` proje videoları ve kapakları |
| `public/projects.json` | "İşler" bölümünün verisi |
| `public/css/fonts.css`, `public/fonts/` | Yerel yazı tipleri (Space Grotesk, Inter, JetBrains Mono) |

## Proje eklemek

"İşler" bölümü `public/projects.json` dosyasından dolar. Dosya boşsa bölüm ve menü bağlantısı gizlenir.

```json
[
  {
    "tag": "Web sitesi",
    "title": "Proje adı",
    "description": "Bir iki cümlelik özet.",
    "features": ["Öne çıkan özellik", "Bir diğeri"],
    "poster": "media/isler/proje.jpg",
    "video": "media/isler/proje.mp4",
    "duration": 52,
    "chapters": [{ "time": 3.7, "title": "Adım başlığı", "text": "Adımın açıklaması." }],
    "url": "https://ornek.com"
  }
]
```

Yalnızca `title` ve `description` zorunludur. `poster` 9:16 kapak görseli, `video` tıklayınca açılan kayıttır; `chapters` video penceresindeki tıklanabilir adım listesini oluşturur (`time` saniye). Görsel ve video aynı siteden, `url` ise `https` olmak zorundadır; diğerleri yok sayılır.

Videolar `icerik/gonderiler/uygulama-tanitim-v2/` altındaki müzikli sürümlerden 720×1280 olarak küçültülür:

```bash
ffmpeg -i kaynak.mp4 -vf scale=720:1280 -c:v libx264 -preset slow -crf 30 -movflags +faststart -c:a aac -b:a 96k public/media/isler/proje.mp4
```

Adım listesinden videoda ileri atlamak sunucunun parçalı indirmeyi (HTTP Range) desteklemesine bağlıdır. Firebase Hosting destekler; `python -m http.server` desteklemediği için yerelde adıma tıklamak videoyu başa sarar.

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
