# Changelog

## 2026-10-12

- Klasör düzeni: `dist/` → `public/`; stil dosyaları `public/css/`, betik `public/js/` altına alındı.
- Kullanılmayan `app.ts`, `assets/`, `_codex-yedek/` ve `.openai/` silindi.
- Firebase Hosting ayarı eklendi (`firebase.json`): güvenlik başlıkları ve önbellek süreleri.
- Site https://saynovra.web.app adresinde yayına alındı; `og:url`, `og:image` ve `canonical` eklendi.

## 2026-10-11

- Canlı Simülasyon 1. sıraya taşındı (`01 / Canlı Simülasyon`), Hizmetler 2. sıraya (`02 / Hizmetler`), Süreç 3. sıraya (`03 / Süreç`) ve İşler 4. sıraya (`04 / İşler`) alındı. Üst menü ve Hero'daki yönlendirme butonu Canlı Akış'a bağlandı.
- Canlı "AI Agent & Otomasyon Simülatörü" (interaktif terminal ve akış adımları) eklendi: 3 farklı senaryo (E-Ticaret, WhatsApp Destek, B2B Entegrasyon), anlık log akışı ve forma doğrudan bağlanan CTA. Sayfadaki marka fontları (Space Grotesk, Inter, JetBrains Mono) ve CSP kuralları birebir korundu.
- Site baştan yazıldı: marka yazı tipleri (Space Grotesk, Inter, JetBrains Mono) yerel olarak eklendi, dış kaynak bağımlılığı kalmadı.
- Hizmetler, Instagram gönderileriyle aynı dört panel düzenine geçirildi (koyu, açık ve lime temalar).
- Hero'ya canlı "örnek akış" bileşeni eklendi.
- Süreç bölümü İhtiyaç → Mimari → Geliştirme → Canlı ve bakım adımlarıyla güncellendi.
- "İşler" bölümü `projects.json` boşken gizleniyor; "yakında" boş durumu kaldırıldı.
- İletişim: Instagram bağlantısı doğrudan mesaj ekranını açıyor (`ig.me/m/saynovra`); form özeti kopyalıyor, pano engellenirse metni elle kopyalanacak şekilde gösteriyor. `.txt` indirme kaldırıldı.
- İletişim formu iPhone görünümlü bir mesaj ekranına taşındı: altta ortada yuvarlak "Gönder" butonu, gönderilen özet yeşil mesaj balonu olarak görünüyor.
- Hero: örnek akış kartının yerine 8 saniyelik döngüsel marka animasyonu (`media/hero.mp4`, 463 KB) kondu. Kaynağı `icerik/_build/hero-video/`.
- Content-Security-Policy eklendi, favicon ayrı dosyaya alındı.
- En küçük yazı boyutu 9px'ten 13px'e çıkarıldı; dokunma hedefleri en az 44px.

## 2026-10-10

- SAYNOVRA marka paletine uygun, mobil uyumlu tanıtım sayfası oluşturuldu.
- Hizmetler, çalışma süreci, sonradan doldurulacak projeler ve proje briefi bölümleri eklendi.
- Mevcut marka görselleri sayfaya dahil edildi.
