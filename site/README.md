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
| `public/js/app.js` | Mobil menü, proje özeti formu, proje listesi ve adım adım galeri, otomasyon simülatörü |
| `public/js/demo.js` | Bilgisayar ekranındaki randevu ve ön muhasebe demoları |
| `public/media/` | Hero videosu ve kapak görseli; `media/isler/` proje kapakları ve galeri ekranları |
| `public/projects.json` | "İşler" bölümünün verisi |
| `public/css/fonts.css`, `public/fonts/` | Yerel yazı tipleri (Space Grotesk, Inter, JetBrains Mono) |

## Canlı demo (bilgisayar ekranı)

"Canlı Demo" bölümündeki bilgisayarın üç sekmesi var:

| Sekme | Ne yapar | Kod |
|---|---|---|
| Randevu paneli | Randevu ekleme, isimle arama, duruma göre süzme, tahsilat, aylık takvim | `public/js/demo.js` |
| Ön muhasebe | Faturaya kısmi ödeme, hatırlatma tamamlama, gider ekleme, 12 aylık grafik | `public/js/demo.js` |
| Otomasyon | Üç senaryolu otomasyon akışı ve terminal kaydı | `public/js/app.js` (`SIMULATION_SCENARIOS`) |

Demo gerçek uygulamaların kopyası değildir; aynı işleyişi gösteren, tarayıcıda çalışan küçük bir örnektir. Veriler `demo.js` içindeki `seed()` fonksiyonundan gelir, bellekte tutulur, sayfa yenilenince ya da "Sıfırla"ya basınca ilk haline döner. Hiçbir şey kaydedilmez veya gönderilmez. Tarihler bugüne göre üretildiği için takvim her zaman dolu görünür.

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
    "slides": [
      {
        "title": "Adım başlığı",
        "text": "Bu ekranda ne olduğu.",
        "image": "media/isler/proje/01.webp",
        "before": { "image": "media/isler/proje/01a.webp", "spot": { "x": 42.5, "y": 48 } }
      },
      { "title": "Bir sonraki adım", "text": "Açıklama.", "image": "media/isler/proje/02.webp", "box": { "x": 3, "y": 26, "w": 94, "h": 30 } }
    ],
    "url": "https://ornek.com"
  }
]
```

Yalnızca `title` ve `description` zorunludur. `poster` 9:16 kapak görselidir. `slides` karta basınca açılan adım adım galeriyi oluşturur:

- `image`: adımın telefon ekranı (390×844 oranında).
- `before`: isteğe bağlı. Önce dokunulan yeri gösteren ekran çıkar, bir buçuk saniye sonra `image` ekranına geçilir.
- `spot`: dokunma halkası, `box`: çerçeve. Değerler görselin yüzdesi cinsindendir.

Görseller aynı siteden, `url` ise `https` olmak zorundadır; diğerleri yok sayılır.

Mevcut dört projenin ekranları ve `slides` kayıtları uygulama kayıtlarından üretilir; elle düzenlemek yerine `icerik/_build/app-video/gallery.py` içindeki `PICKS` listesini değiştirip betiği yeniden çalıştırın (bkz. `icerik/_build/app-video/README.md`).

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
