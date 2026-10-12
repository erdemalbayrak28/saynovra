# Uygulama tanıtım videoları

Dört ürünün telefon ekranından nasıl çalıştığını gösteren dikey videolar (1080×1920, 30 fps, sessiz).
Ekran görüntüleri gerçek uygulamalardan alınır; veriler uydurmadır, müşteri adları ve logolar maskelenir.

| Video | Kaynak proje | Arka plan |
|---|---|---|
| `01-mekan-sitesi` | `tercume-bahce/nazaybahce` | Gece bahçesi |
| `02-kurumsal-site` | `tercume-bahce/nazaytercume` | Uzay |
| `03-randevu-crm` | `nazay-uuygulama` | Deniz altı |
| `04-muhasebe` | `nazay muhasebe` | Gün batımı |

## Üretim

```bash
WORK=/tmp/appvideo
bash servers.sh start "$WORK"                      # uygulamaları demo veritabanıyla açar
DEMO_PASSWORD_FILE="$WORK/demo.pw" node capture.cjs "$WORK/frames"      # telefon boyutunda kareleri kaydeder
for v in bahce tercume crm muh; do node render.cjs "$WORK/frames" ../../gonderiler/uygulama-tanitim-v2 $v; done
bash servers.sh stop "$WORK"
```

Tek video için `capture.cjs` ve `render.cjs` sonuna adını yazın (`crm` gibi). Hızlı kontrol için
`node render.cjs <frames> <out> crm --stills 100,400,-10` yalnızca o kareleri PNG olarak yazar.

## Dosyalar

- `servers.sh`, `serve_crm.py`, `serve_muhasebe.py`: uygulamaları geçici demo veritabanı ve rastgele demo şifresiyle çalıştırır. Gerçek veritabanları açılmaz.
- `lib.cjs`: telefon tarayıcısı, marka/telefon/e-posta maskeleme, dışarıya giden isteklerin engellenmesi.
- `capture.cjs`: her ürünün adım adım senaryosu. Adım başlıkları ve açıklamaları burada.
- `compose.html`, `backgrounds.js`: telefon, açıklama kartları, bağlantı çizgisi, arka planlar, kapanış.
- `render.cjs`: video başlıkları, hangi arka plan, telefon hangi tarafta.
- `music.py`: videonun kendi zaman çizelgesinden müzik üretir ve `-muzikli.mp4` olarak ekler
  (`python music.py <frames> <video_klasörü> crm`). Tempo, her açıklama kartı bir vuruşa denk gelecek şekilde
  ayarlanır; kartta akor değişir ve vurgu gelir, dokunuşlarda tık sesi olur. Akorlar ve tempo aralığı `MOODS` içinde.

## Kayıt sırasında yapılan düzeltmeler

Uygulamaların kendi dosyaları değişmez; aşağıdakiler yalnızca kayıt tarayıcısında uygulanır.

- "Nazay Bahçe" → "Etkinlik Bahçesi", "Nazay Tercüme" → "Tercüme Ofisi"; logolar gizlenir, telefon ve e-posta maskelenir.
- Tercüme sitesindeki Google yorumlarında yorumcu adı ve avatarı bulanıklaştırılır.
- Bahçe sitesinde menü bağlantısına basınca menü kapanır ama simge çarpı olarak kalır; kayıtta simge düzeltilir.
- WhatsApp bağlantıları ve analiz istekleri engellenir, formlar gerçek mesaj göndermez.
