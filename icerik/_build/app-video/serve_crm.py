"""Runs the Bahçe CRM against a throwaway demo database for screen capture.

The real app directory is only read: DATABASE_URL points at a demo SQLite file and the
login password is replaced in memory with DEMO_PASSWORD, so no real data or credential is used.

Usage: python serve_crm.py <app_dir> <port>   (env: DATABASE_URL, DEMO_PASSWORD)
"""
import os
import sys
from datetime import date, timedelta

app_dir, port = sys.argv[1], int(sys.argv[2])
os.chdir(app_dir)
sys.path.insert(0, app_dir)

import main  # noqa: E402
import uvicorn  # noqa: E402

main.VALID_USERNAME = 'demo'
main.VALID_PASSWORD = os.environ['DEMO_PASSWORD']

TODAY = date.today()
# (ad_soyad, kaynak, durum, etkinlik, gün farkı, kişi, fiyat, avans, ödeme, not)
ROWS = [
    ('Elif Yıldız', 'Instagram', 'Randevu Oluşturuldu', 'Nişan', 6, 80, 95000, 20000, 0, 'Pembe-beyaz konsept, canlı müzik'),
    ('Zeynep Kara', 'WhatsApp', 'Randevu Oluşturuldu', 'Kına', 9, 120, 140000, 40000, 0, 'Bindallı köşesi istiyor'),
    ('Merve Aksoy', 'Instagram', 'Görüşüldü', 'Bride to Be', 13, 25, 32000, 0, 0, 'Fiyat teklifi gönderildi'),
    ('Ayşe Demir', 'Telefon', 'Randevu Oluşturuldu', 'Doğum Günü', 3, 40, 45000, 15000, 0, 'Balon süsleme, pasta dışarıdan'),
    ('Selin Öztürk', 'Yüz Yüze', 'Yeni Ulaştı', 'Kahvaltı', 16, 30, 27000, 0, 0, 'Pazar sabahı için sordu'),
    ('Buse Arslan', 'Instagram', 'Etkinlik Gerçekleşti', 'Nişan', -8, 90, 110000, 30000, 80000, ''),
    ('Derya Çelik', 'WhatsApp', 'Etkinlik Gerçekleşti', 'Kına', -15, 110, 135000, 35000, 100000, ''),
    ('Gizem Şahin', 'Instagram', 'Randevu Oluşturuldu', 'Nişan', 20, 70, 88000, 25000, 0, 'Fotoğrafçı dahil'),
    ('Esra Koç', 'Telefon', 'Görüşüldü', 'Doğum Günü', 11, 35, 38000, 0, 0, 'Çarşamba tekrar aranacak'),
    ('İrem Aydın', 'WhatsApp', 'Randevu Oluşturuldu', 'Bride to Be', 4, 20, 30000, 10000, 0, ''),
    ('Cansu Polat', 'Instagram', 'Etkinlik Gerçekleşti', 'Kahvaltı', -3, 45, 40500, 10000, 30500, ''),
    ('Nazlı Güneş', 'Yüz Yüze', 'Randevu Oluşturuldu', 'Kına', 27, 130, 150000, 50000, 0, 'Semazen gösterisi'),
    ('Tuğba Eren', 'Instagram', 'İptal', 'Nişan', 18, 60, 80000, 0, 0, 'Tarih uymadı'),
    ('Pınar Yavuz', 'WhatsApp', 'Yeni Ulaştı', 'Doğum Günü', 23, 28, 33000, 0, 0, ''),
]


def seed():
    db = main.SessionLocal()
    try:
        if db.query(main.Customer).count():
            return
        for i, (name, source, status, event, offset, people, price, deposit, paid, note) in enumerate(ROWS):
            db.add(main.Customer(
                ad_soyad=name, telefon=f'0555 000 00 {i + 10}', kaynak=source, durum=status, etkinlik_adi=event,
                etkinlik_tarihi=TODAY + timedelta(days=offset), kisi_sayisi=people, toplam_fiyat=price,
                alinan_avans=deposit, alinan_odeme=paid, notlar=note,
            ))
        db.commit()
    finally:
        db.close()


seed()
uvicorn.run(main.app, host='127.0.0.1', port=port, log_level='warning')
