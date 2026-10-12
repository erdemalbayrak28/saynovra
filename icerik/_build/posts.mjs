// Slide definitions for the first 9 posts. Each slide: { theme, body, bottom? }
// Carousels render at 1080x1350, reel scenes at 1080x1920.

const rows = (items) =>
  `<div class="rows push">${items.map((t, i) => `<div><i>${String(i + 1).padStart(2, '0')}</i>${t}</div>`).join('')}</div>`;

const stack = (items, hot = -1) =>
  `<div class="stack push">${items.map(([k, t], i) => `<div${i === hot ? ' class="hot"' : ''}><i>${k}</i>${t}</div>`).join('')}</div>`;

const cards = (items, hot = -1) =>
  `<div class="cards push">${items
    .map(([t, p], i) => `<div${i === hot ? ' class="hot"' : ''}><i>${String(i + 1).padStart(2, '0')}</i>${t}${p ? `<p>${p}</p>` : ''}</div>`)
    .join('')}</div>`;

const term = (lines) =>
  `<div class="term push"><div class="bar"><span></span><span></span><span></span></div>${lines.map(([c, t]) => `<p class="${c}">${t}</p>`).join('')}</div>`;

const LOCKUP = (cta, dm) =>
  `<div class="lockup">%LOGO%<div class="name">SAYNOVRA</div><div class="line">Software • AI • Automation</div><div class="cta">${cta}</div><div class="dm">${dm}</div></div>`;

export const posts = [
  // ───────────────────────── 01
  {
    slug: '01-claude-code-nedir',
    kind: 'carousel',
    slides: [
      {
        theme: 'dark',
        body: `<div class="mid"><div class="tag">AI araçları / 01</div><h1>Claude Code <em>nedir?</em></h1><p class="sub">Kod öneren değil, işi baştan sona yürüten yapay zekâ.</p></div>`,
      },
      {
        theme: 'dark',
        body: `<h2>Sohbet botu değil, <em>ajan.</em></h2><p class="sub">Anthropic'in geliştirdiği, projenin içinde çalışan yazılım ajanı.</p>
        ${stack([['Okur', 'Tüm kod tabanını tarar'], ['Yazar', 'Dosyaları oluşturur, düzenler'], ['Çalıştırır', 'Komut ve testleri koşturur'], ['Düzeltir', 'Hatayı görür, tekrar dener']], 2)}`,
      },
      {
        theme: 'dark',
        body: `<h2>Tek cümle <em>yeter.</em></h2><p class="sub">Sen hedefi söylersin, adımları o planlar.</p>
        ${term([
          ['cmd', '> iletişim formunu CRM\'e bağla'],
          ['dim', ''],
          ['', '● Proje yapısı okunuyor'],
          ['', '● form.ts ve crm-client.ts bulundu'],
          ['', '● Entegrasyon yazılıyor'],
          ['', '● Testler çalıştırılıyor'],
          ['cmd', '✓ 6 test geçti, değişiklik hazır'],
        ])}`,
      },
      {
        theme: 'light',
        body: `<h2>Nerede <em>işe yarar?</em></h2>
        ${cards([['Yeni özellik', 'Fikirden çalışan koda'], ['Hata ayıklama', 'Log okur, kök nedeni bulur'], ['Eski kod', 'Belgesiz projeyi anlatır'], ['Tekrarlayan iş', 'Test, refactor, doküman']], 0)}`,
      },
      {
        theme: 'lime',
        body: `<h2>Araç hızlandırır. Mimariyi insan kurar.</h2>
        <p class="note push">Neyin yapılacağına, nasıl denetleneceğine ve neyin canlıya çıkacağına hâlâ mühendis karar verir.<br><br>Kaydet. Sıradaki gönderi: Claude Code ve Codex farkı.</p>`,
      },
    ],
  },

  // ───────────────────────── 02 (reel)
  {
    slug: '02-reel-ayni-isi-elle-yapma',
    kind: 'reel',
    slides: [
      { theme: 'dark', body: `<div class="mid"><div class="tag">Otomasyon</div><h1>Aynı işi her gün <em>elle mi</em> yapıyorsun?</h1></div>` },
      { theme: 'dark', body: `<div class="tag">Bugün</div><h2>Her sipariş için aynı 4 adım.</h2>${rows(['Siparişi oku', 'CRM\'e elle gir', 'Faturayı elle kes', 'Müşteriye elle yaz'])}` },
      { theme: 'lime', body: `<div class="mid"><div class="tag">Çözüm</div><h1>Bir kere kur.</h1><p class="sub">Tekrarlayan işi sistem yapsın.</p></div>` },
      {
        theme: 'light',
        body: `<div class="tag">Sonra</div><h2>Sipariş gelir, gerisi <em>kendi</em> akar.</h2>
        <div class="flow push"><div class="box">Gelen sipariş / form</div><div class="arrow">↓</div><div class="box hot">API</div><div class="arrow">↓</div>
        <div class="trio"><div class="box">CRM'e kaydolur</div><div class="box">Fatura kesilir</div><div class="box">Müşteriye bildirim</div></div></div>`,
      },
      { theme: 'dark', body: LOCKUP('Hangi işi hâlâ elle yapıyorsun?', 'DM\'den yaz, birlikte kuralım') },
    ],
  },

  // ───────────────────────── 03
  {
    slug: '03-claude-code-vs-codex',
    kind: 'carousel',
    slides: [
      {
        theme: 'dark',
        body: `<div class="mid"><div class="tag">AI araçları / 02</div><h1>Claude Code <em>vs</em> Codex</h1><p class="sub">İki yazılım ajanı. Aynı fikir, farklı ekosistem.</p></div>`,
      },
      {
        theme: 'dark',
        body: `<h2>Kim <em>kimin?</em></h2>
        <div class="vs push">
          <div class="hot"><h3>Claude Code</h3><small lang="en">Anthropic</small><p>Claude modelleriyle çalışır</p><p>Terminal, IDE, masaüstü, web</p><p>MCP ile araçlara bağlanır</p></div>
          <div><h3>Codex</h3><small lang="en">OpenAI</small><p>OpenAI modelleriyle çalışır</p><p>CLI, IDE eklentisi, bulut</p><p>Arka planda görev yürütür</p></div>
        </div>`,
      },
      {
        theme: 'light',
        body: `<h2>Ortak <em>noktaları</em></h2><p class="sub">İkisi de otomatik tamamlama değil, görev yürüten ajan.</p>
        ${rows(['Kod tabanını kendi okur', 'Çok adımlı işi planlar', 'Komut çalıştırır, test eder', 'Riskli adımda onay ister'])}`,
      },
      {
        theme: 'dark',
        body: `<h2>Seçerken <em>neye</em> bakılır?</h2>
        ${stack([['Ekip', 'Hangi ekosistemi kullanıyor?'], ['İş tipi', 'Canlı eşli çalışma mı, arka plan mı?'], ['Bağlantı', 'Hangi araçlara erişmesi gerek?'], ['Denetim', 'Çıktıyı kim, nasıl kontrol edecek?']], 3)}`,
      },
      {
        theme: 'lime',
        body: `<h2>Asıl soru hangisi değil.</h2>
        <p class="note push">Asıl soru: çıkan işi kim denetliyor? İyi kurulmuş bir süreçte ikisi de hız kazandırır. Denetimsiz kullanımda ikisi de borç üretir.<br><br>Sen hangisini kullanıyorsun? Yorumlara yaz.</p>`,
      },
    ],
  },

  // ───────────────────────── 04
  {
    slug: '04-mcp-nedir',
    kind: 'carousel',
    slides: [
      {
        theme: 'dark',
        body: `<div class="mid"><div class="tag">AI araçları / 03</div><h1>MCP <em>nedir?</em></h1><p class="sub">Yapay zekâyı şirketinizin araçlarına bağlayan açık standart.</p></div>`,
      },
      {
        theme: 'dark',
        body: `<h2>Sorun: yapay zekâ <em>kör.</em></h2><p class="sub">Model ne kadar iyi olursa olsun, sizin verinizi kendi başına göremez.</p>
        ${rows(['Siparişlerinizi bilmez', 'Stok durumunu göremez', 'Takviminize erişemez', 'Sisteminizde işlem yapamaz'])}`,
      },
      {
        theme: 'light',
        body: `<h2>MCP bir <em>köprü.</em></h2><p class="sub">Model Context Protocol: tek bağlantı biçimi, her araç için.</p>
        <div class="flow push"><div class="box hot">Yapay zekâ</div><div class="arrow">↕</div><div class="box" style="text-align:center">MCP server</div><div class="arrow">↕</div>
        <div class="trio"><div class="box">CRM</div><div class="box">Veritabanı</div><div class="box">Muhasebe</div></div></div>`,
      },
      {
        theme: 'dark',
        body: `<h2>Sonuç: soru değil, <em>iş.</em></h2>
        ${term([
          ['cmd', '> dünkü siparişleri özetle,'],
          ['cmd', '  faturası eksik olanları kes'],
          ['dim', ''],
          ['', '● siparisler.listele(dün)'],
          ['', '● 14 sipariş, 3 fatura eksik'],
          ['', '● fatura.olustur × 3'],
          ['cmd', '✓ 3 fatura kesildi, özet hazır'],
        ])}`,
      },
      {
        theme: 'lime',
        body: `<h2>Kendi sisteminize özel MCP server.</h2>
        <p class="note push">Yapay zekânın neye erişeceğini ve neyi yapamayacağını siz belirlersiniz. Yetki ve kayıt sizde kalır.<br><br>Hangi sisteminizi bağlamak isterdiniz? DM'den yazın.</p>`,
      },
    ],
  },

  // ───────────────────────── 05 (reel)
  {
    slug: '05-reel-ajan-nasil-calisir',
    kind: 'reel',
    slides: [
      { theme: 'dark', body: `<div class="mid"><div class="tag">Claude Code</div><h1>Bir AI ajanı işi <em>nasıl</em> yapar?</h1></div>` },
      { theme: 'dark', body: `<div class="mid"><div class="big">01</div><h1>Okur.</h1><p class="sub">Önce projeyi anlar. Hangi dosya ne yapıyor, neye dokunmalı.</p></div>` },
      { theme: 'dark', body: `<div class="mid"><div class="big">02</div><h1>Planlar.</h1><p class="sub">İşi adımlara böler. Riskli adımda sana sorar.</p></div>` },
      { theme: 'dark', body: `<div class="mid"><div class="big">03</div><h1>Yazar.</h1><p class="sub">Kodu yazar, dosyaları düzenler, komutları çalıştırır.</p></div>` },
      { theme: 'lime', body: `<div class="mid"><div class="big">04</div><h1>Test eder.</h1><p class="sub">Çalıştırır, hatayı görür, düzeltir. Sonucu sana raporlar.</p></div>` },
      { theme: 'dark', body: LOCKUP('Soruya cevap veren değil, işi yapan sistemler.', 'Takip et') },
    ],
  },

  // ───────────────────────── 06
  {
    slug: '06-chatbot-vs-ai-agent',
    kind: 'carousel',
    slides: [
      {
        theme: 'lime',
        body: `<div class="mid"><div class="tag">Yapay zekâ / Temel</div><h1>Chatbot ≠ AI agent</h1><p class="sub">Biri cevap verir. Diğeri işi bitirir.</p></div>`,
      },
      {
        theme: 'dark',
        body: `<h2>Fark <em>nerede?</em></h2>
        <div class="vs push">
          <div><h3>Chatbot</h3><small>Konuşur</small><p>Soruya cevap verir</p><p>Bildiğiyle sınırlıdır</p><p>İşi sana geri bırakır</p></div>
          <div class="hot"><h3>AI agent</h3><small>Yapar</small><p>Hedefi adımlara böler</p><p>Araçlara ve veriye bağlanır</p><p>İşlemi kendisi tamamlar</p></div>
        </div>`,
      },
      {
        theme: 'light',
        body: `<h2>Aynı müşteri, <em>iki</em> sonuç.</h2><p class="sub">"Siparişim nerede, adresimi değiştirebilir miyim?"</p>
        ${stack([['Chatbot', 'Kargo sayfasının linkini verir'], ['Agent', 'Siparişi bulur, adresi günceller, onay gönderir']], 1)}`,
      },
      {
        theme: 'dark',
        body: `<h2>Hangisi <em>size</em> lazım?</h2>
        ${cards([['Sık sorulan sorular', 'Chatbot yeterli'], ['İşlem gerektiren talepler', 'Agent gerekir'], ['Tek kanal, tek konu', 'Chatbot yeterli'], ['Birden çok sistem', 'Agent gerekir']], 1)}`,
        bottom: 'DM\'den yaz',
      },
    ],
  },

  // ───────────────────────── 07
  {
    slug: '07-otomasyona-hazir-5-is',
    kind: 'carousel',
    slides: [
      {
        theme: 'dark',
        body: `<div class="mid"><div class="tag">Otomasyon / Rehber</div><h1>Otomasyona hazır <em>5 iş</em></h1><p class="sub">İşletmenizde bugün elle yapılan, yarın sistemin yapabileceği işler.</p></div>`,
      },
      { theme: 'dark', body: `<div class="big">01</div><h2 style="margin-top:40px">Sipariş → <em>fatura</em></h2><p class="sub">Sipariş düştüğü anda fatura kesilir, müşteriye iletilir, muhasebeye işlenir.</p><p class="note push" style="color:var(--mute)">Elle: her sipariş için ayrı ayrı.<br>Sistemle: sıfır dokunuş.</p>` },
      { theme: 'dark', body: `<div class="big">02</div><h2 style="margin-top:40px">Randevu <em>hatırlatma</em></h2><p class="sub">Randevudan önce otomatik mesaj. Onay, iptal ve erteleme tek tıkla.</p><p class="note push" style="color:var(--mute)">Gelmeyen müşteri azalır,<br>telefon trafiği biter.</p>` },
      { theme: 'dark', body: `<div class="big">03</div><h2 style="margin-top:40px">Form → <em>CRM</em></h2><p class="sub">Web sitesi, Instagram ve WhatsApp'tan gelen talepler tek listede toplanır.</p><p class="note push" style="color:var(--mute)">Hiçbir talep arada kaybolmaz,<br>kim ilgilenecek belli olur.</p>` },
      { theme: 'dark', body: `<div class="big">04</div><h2 style="margin-top:40px">Stok <em>uyarısı</em></h2><p class="sub">Kritik seviyeye inen ürün için anında bildirim, istenirse otomatik sipariş taslağı.</p><p class="note push" style="color:var(--mute)">"Bitmiş" cevabını<br>müşteri değil, siz ilk duyarsınız.</p>` },
      { theme: 'dark', body: `<div class="big">05</div><h2 style="margin-top:40px">Haftalık <em>rapor</em></h2><p class="sub">Satış, gelir ve bekleyen işler her pazartesi sabahı kutunuzda.</p><p class="note push" style="color:var(--mute)">Excel'de saatlerce toplamak yerine<br>hazır özet.</p>` },
      {
        theme: 'lime',
        body: `<h2>Bunlardan hangisi sizde hâlâ elle?</h2>
        <p class="note push">Numarasını DM'den yazın. Mevcut araçlarınıza bakıp nasıl kurulacağını anlatalım.<br><br>İşinize yarayacaksa kaydedin.</p>`,
        bottom: 'DM\'den yaz',
      },
    ],
  },

  // ───────────────────────── 08 (reel)
  {
    slug: '08-reel-prompt-3-kural',
    kind: 'reel',
    slides: [
      { theme: 'dark', body: `<div class="mid"><div class="tag">Yapay zekâ / İpucu</div><h1>Yapay zekâdan iyi sonuç almanın <em>3 kuralı</em></h1></div>` },
      { theme: 'dark', body: `<div class="mid"><div class="big">01</div><h1>Bağlam ver.</h1><p class="sub">Kim için, ne amaçla, hangi koşulda? Bilmediğini tahmin eder.</p></div>` },
      { theme: 'dark', body: `<div class="mid"><div class="big">02</div><h1>Çıktıyı tarif et.</h1><p class="sub">Uzunluk, biçim, ton. "Güzel bir metin" tarif değildir.</p></div>` },
      { theme: 'dark', body: `<div class="mid"><div class="big">03</div><h1>Örnek göster.</h1><p class="sub">Beğendiğin bir örnek, on satır açıklamadan daha çok şey anlatır.</p></div>` },
      {
        theme: 'light',
        body: `<div class="tag">Fark</div><h2>Aynı istek, <em>iki</em> yazım.</h2>
        ${stack([['Zayıf', 'Bana bir ürün açıklaması yaz'], ['Güçlü', 'El yapımı sabun için, 3 cümle, samimi tonda, sonunda sipariş çağrısı olan açıklama yaz']], 1)}`,
      },
      { theme: 'dark', body: LOCKUP('Kaydet, bir sonraki denemende kullan.', 'Takip et') },
    ],
  },

  // ───────────────────────── 09
  {
    slug: '09-fikirden-calisan-sisteme',
    kind: 'carousel',
    slides: [
      {
        theme: 'dark',
        body: `<div class="mid"><div class="tag">Nasıl çalışıyoruz</div><h1>Fikirden <em>çalışan</em> sisteme.</h1><p class="sub">Bir proje bizde 4 adımda ilerler.</p></div>`,
      },
      { theme: 'dark', body: `<div class="big">01</div><h2 style="margin-top:40px">İhtiyaç</h2><p class="sub">Önce işinizi dinleriz. Hangi iş elle yapılıyor, nerede zaman kaybediliyor, ne ölçülecek?</p><p class="note push" style="color:var(--mute)">Çıktı: net kapsam ve öncelik listesi.</p>` },
      { theme: 'dark', body: `<div class="big">02</div><h2 style="margin-top:40px">Mimari</h2><p class="sub">Hangi sistem neyle konuşacak, veri nerede duracak, güvenlik nasıl sağlanacak?</p><p class="note push" style="color:var(--mute)">Çıktı: kod yazılmadan önce onayladığınız plan.</p>` },
      { theme: 'dark', body: `<div class="big">03</div><h2 style="margin-top:40px">Geliştirme</h2><p class="sub">Küçük parçalar hâlinde teslim. Her adımda çalışan bir şey görürsünüz.</p><p class="note push" style="color:var(--mute)">Çıktı: test edilmiş, çalışan sistem.</p>` },
      { theme: 'dark', body: `<div class="big">04</div><h2 style="margin-top:40px">Canlı ve bakım</h2><p class="sub">Yayına alırız, izleriz, güncelleriz. Sistem büyüdükçe yanınızdayız.</p><p class="note push" style="color:var(--mute)">Çıktı: kesintisiz çalışan altyapı.</p>` },
      { theme: 'dark', body: LOCKUP('Projenizi konuşalım.', 'İletişim için DM'), bare: true },
    ],
  },
];
