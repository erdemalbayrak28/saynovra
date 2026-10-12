"""Runs the Muhasebe app against a throwaway demo database for screen capture.

DATABASE_URL must point at a demo SQLite file and APP_USERNAME / APP_PASSWORD at demo credentials
before this starts; the real instance/nazay.db is never opened.

Usage: python serve_muhasebe.py <app_dir> <port>
"""
import os
import sys
from datetime import date, time, timedelta

assert os.environ.get('DATABASE_URL', '').startswith('sqlite:///'), 'refusing to run without a demo DATABASE_URL'
assert os.environ.get('APP_PASSWORD'), 'demo APP_PASSWORD required'

app_dir, port = sys.argv[1], int(sys.argv[2])
os.chdir(app_dir)
sys.path.insert(0, app_dir)

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402
from app.models import Company, Expense, Income, Invoice, Job, Payment, Reminder  # noqa: E402

app = create_app()
TODAY = date.today()
day = lambda offset: TODAY + timedelta(days=offset)  # noqa: E731


def seed():
    if Company.query.count():
        return
    companies = [
        Company(name='Atlas Lojistik A.Ş.', contact_name='Murat Bey', phone='0555 000 00 21', tax_number='1112223334'),
        Company(name='Defne Mimarlık', contact_name='Seda Hanım', phone='0555 000 00 22', tax_number='2223334445'),
        Company(name='Ege Tekstil Ltd.', contact_name='Kerem Bey', phone='0555 000 00 23', tax_number='3334445556'),
        Company(name='Poyraz Hukuk Bürosu', contact_name='Av. Deniz Hanım', phone='0555 000 00 24', tax_number='4445556667'),
        Company(name='Mavi Tur Seyahat', contact_name='Onur Bey', phone='0555 000 00 25', tax_number='5556667778'),
    ]
    db.session.add_all(companies)
    db.session.flush()
    atlas, defne, ege, poyraz, mavi = companies

    invoices = [
        Invoice(company=atlas, invoice_no='NT-2041', issue_date=day(-34), due_date=day(-4), amount=48500, description='Gümrük evrakları çevirisi'),
        Invoice(company=atlas, invoice_no='NT-2058', issue_date=day(-9), due_date=day(21), amount=22750, description='Sözleşme çevirisi (EN-TR)'),
        Invoice(company=defne, invoice_no='NT-2049', issue_date=day(-20), due_date=day(3), amount=18400, description='Teknik şartname çevirisi'),
        Invoice(company=ege, invoice_no='NT-2052', issue_date=day(-16), due_date=day(5), amount=1250, currency='EUR', description='Katalog çevirisi (TR-DE)'),
        Invoice(company=poyraz, invoice_no='NT-2037', issue_date=day(-41), due_date=day(-11), amount=31200, description='Yeminli mahkeme evrakı'),
        Invoice(company=poyraz, invoice_no='NT-2060', issue_date=day(-5), due_date=day(25), amount=14600, description='Vekâletname, noter tasdikli'),
        Invoice(company=mavi, invoice_no='NT-2055', issue_date=day(-12), due_date=day(18), amount=9800, description='Web sitesi yerelleştirme'),
    ]
    db.session.add_all(invoices)
    db.session.flush()
    db.session.add_all([
        Payment(invoice=invoices[0], amount=20000, payment_date=day(-10), method='Havale'),
        Payment(invoice=invoices[2], amount=18400, payment_date=day(-2), method='Havale'),
        Payment(invoice=invoices[4], amount=31200, payment_date=day(-14), method='EFT'),
        Payment(invoice=invoices[6], amount=4000, payment_date=day(-1), method='Nakit'),
    ])

    db.session.add_all([
        Job(company=atlas, title='İhracat beyannameleri', job_type='Yeminli Çeviri', source_lang='Türkçe', target_lang='İngilizce', page_count=18, received_date=day(-2), deadline=day(1), status='devam', translator='Ceren', amount=12600, translator_cost=5400),
        Job(company=ege, title='Ürün kataloğu 2027', job_type='Yazılı Çeviri', source_lang='Türkçe', target_lang='Almanca', page_count=42, received_date=day(-4), deadline=day(4), status='devam', translator='Volkan', amount=29400, translator_cost=13800),
        Job(customer_name='Kapı Müşterisi', title='Diploma ve transkript', job_type='Noter Tasdikli', source_lang='Türkçe', target_lang='Almanca', page_count=3, received_date=day(-1), deadline=day(0), status='bekliyor', translator='Ceren', amount=2400, translator_cost=900),
        Job(company=poyraz, title='Dava dosyası ekleri', job_type='Yeminli Çeviri', source_lang='İngilizce', target_lang='Türkçe', page_count=27, received_date=day(-6), deadline=day(-1), status='devam', translator='Aslı', amount=18900, translator_cost=8100),
        Job(company=mavi, title='Tur broşürü', job_type='Yazılı Çeviri', source_lang='Türkçe', target_lang='Rusça', page_count=8, received_date=day(-9), deadline=day(-3), delivered_date=day(-4), status='teslim', translator='Volkan', amount=5600, translator_cost=2400),
        Job(company=defne, title='Proje şartnamesi', job_type='Yazılı Çeviri', source_lang='İngilizce', target_lang='Türkçe', page_count=31, received_date=day(-12), deadline=day(-6), delivered_date=day(-6), status='teslim', translator='Aslı', amount=18400, translator_cost=8700),
    ])

    db.session.add_all([
        Reminder(title='Atlas Lojistik: vadesi geçen faturayı hatırlat', remind_date=day(0), remind_time=time(10, 30), company=atlas, invoice=invoices[0]),
        Reminder(title='KDV beyannamesi ver', remind_date=day(0), repeat_interval='aylik'),
        Reminder(title='Diploma çevirisini notere götür', remind_date=day(0), remind_time=time(15, 0)),
        Reminder(title='Defne Mimarlık yeni iş görüşmesi', remind_date=day(2), remind_time=time(11, 0), company=defne),
        Reminder(title='Ofis kirasını öde', remind_date=day(4), repeat_interval='aylik'),
    ])

    db.session.add_all([
        Income(date=day(0), category='Kapı Müşterisi', description='Pasaport çevirisi', amount=1200),
        Income(date=day(-1), category='Noter İşi', description='Vekâletname', amount=2600),
        Income(date=day(-3), category='Nakit Satış', description='Öğrenci belgesi', amount=850),
        Income(date=day(-6), category='Kapı Müşterisi', description='Evlilik cüzdanı', amount=1400),
        Expense(date=day(-2), category='Kira', description='Ofis kirası', amount=28000, recurring=True),
        Expense(date=day(-5), category='Elektrik', description='Ekim faturası', amount=2350, recurring=True),
        Expense(date=day(-5), category='İnternet/Telefon', description='Fiber + hat', amount=1180, recurring=True),
        Expense(date=day(-8), category='Çevirmen/Taşeron Ödemesi', description='Serbest çevirmen ödemeleri', amount=16500),
        Expense(date=day(-11), category='Yazılım/Abonelik', description='CAT aracı lisansı', amount=3200),
    ])
    db.session.commit()


with app.app_context():
    seed()

app.run(host='127.0.0.1', port=port, debug=False)
