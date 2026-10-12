# SAYNOVRA

Instagram `@saynovra` için tanıtım sitesi, gönderi üretim hattı ve marka dosyaları.

## Klasör haritası

| Klasör | Ne var | Tür |
|---|---|---|
| `site/public/` | Yayındaki internet sitesi | Kod |
| `site/public/css/`, `site/public/js/` | Sitenin stil ve betik dosyaları | Kod |
| `site/public/media/`, `site/public/fonts/` | Sitenin videosu, kapak görseli ve yazı tipleri | Görsel / video |
| `icerik/_build/` | Gönderi ve videoları üreten betikler | Kod |
| `icerik/gonderiler/` | Paylaşıma hazır görseller ve videolar | Görsel / video |
| `icerik/takvim.md` | Gönderi takvimi ve açıklama metinleri | Metin |
| `marka/gorseller/` | Profil fotoğrafı ve "ne yapıyoruz" görselleri | Görsel |
| `marka/videolar/` | Ham videolar | Video |

## Sık kullanılanlar

```bash
# siteyi yerelde aç → http://127.0.0.1:4173
python -m http.server 4173 --bind 127.0.0.1 --directory site/public
```

```bash
# siteyi yayına al
cd site && firebase deploy --only hosting
```

```bash
# gönderi görsellerini yeniden üret
cd icerik && node _build/build.mjs
```

Ayrıntılar: [site/README.md](site/README.md), [icerik/_build/app-video/README.md](icerik/_build/app-video/README.md).

## Git

`icerik/gonderiler/` altındaki videolar ve `marka/videolar/` büyük oldukları için depoya girmez; yalnızca bu bilgisayarda durur. Yedeğini ayrıca alın.
