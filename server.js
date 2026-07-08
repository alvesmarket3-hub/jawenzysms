/**
 * VerifyPro - Gelişmiş Kalıcı SMS & Bağımsız Admin URL Altyapısı
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Dosya tabanlı kalıcı veritabanı yolları
const DATA_FILE = path.join(__dirname, 'veri.json');
const NUMBERS_FILE = path.join(__dirname, 'numaralar.txt');

// Başlangıç verileri şablonu
let db = {
    users: [{ id: 1, email: 'demo@verifypro.com', password: 'password123', balance: 500.00 }],
    orders: []
};

// Veritabanını dosyadan yükle (Dosya yoksa oluşturur, varsa okur)
function loadDatabase() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const fileData = fs.readFileSync(DATA_FILE, 'utf-8');
            db = JSON.parse(fileData);
        } else {
            saveDatabase();
        }
    } catch (err) {
        console.error("Veritabanı yükleme hatası:", err);
    }
}

// Veritabanını dosyaya kalıcı olarak kaydet
function saveDatabase() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 4), 'utf-8');
    } catch (err) {
        console.error("Veritabanı kaydetme hatası:", err);
    }
}

loadDatabase();

// 🌐 URL Yönlendirmeleri
// Kullanıcı Paneli: siteadi.com/
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin Paneli Özel URL: siteadi.com/admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Giriş API
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.users.find(u => u.email === email && u.password === password);
    if (!user) {
        return res.status(401).json({ success: false, message: 'E-posta veya şifre hatalı!' });
    }
    res.json({ success: true, user });
});

// Satın Alma API (Numarayı txt dosyasından çeker)
app.post('/api/purchase', (req, res) => {
    const { email, price, serviceName } = req.body;
    const user = db.users.find(u => u.email === email);

    if (!user || user.balance < price) {
        return res.status(402).json({ success: false, message: 'Bakiyeniz yetersiz!' });
    }

    // Bakiyeyi düşür
    user.balance = parseFloat((user.balance - price).toFixed(2));
    
    // Numaralar.txt dosyasından numara havuzu okuma
    let secilenNumara = "+90 532 " + Math.floor(100 + Math.random() * 900) + " 00 00"; 
    try {
        if (fs.existsSync(NUMBERS_FILE)) {
            const data = fs.readFileSync(NUMBERS_FILE, 'utf-8');
            const satirlar = data.split('\n').map(s => s.trim()).filter(s => s.length > 0);
            if (satirlar.length > 0) {
                const rastgeleIndeks = Math.floor(Math.random() * satirlar.length);
                secilenNumara = satirlar[rastgeleIndeks];
            }
        }
    } catch (err) {
        console.log("Dosya okuma hatası, fallback numara üretildi.");
    }

    const newOrder = {
        id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
        serviceName,
        number: secilenNumara,
        status: 'Waiting',
        smsCode: '',
        date: new Date().toLocaleTimeString('tr-TR')
    };
    
    db.orders.unshift(newOrder);
    saveDatabase(); // Kalıcı kaydet

    res.json({ success: true, newBalance: user.balance, order: newOrder });
});

// Tüm Siparişleri Çekme API
app.get('/api/orders', (req, res) => {
    res.json({ success: true, orders: db.orders });
});

// Admin Manuel Kod Giriş API'si
app.post('/api/admin/set-code', (req, res) => {
    const { orderId, smsCode } = req.body;
    const order = db.orders.find(o => o.id === orderId);
    
    if (!order) {
        return res.status(404).json({ success: false, message: 'Sipariş bulunamadı!' });
    }

    order.smsCode = smsCode;
    order.status = 'Completed';
    
    saveDatabase(); // Kalıcı kaydet

    res.json({ success: true, message: 'SMS kodu kalıcı olarak kaydedildi ve iletildi!' });
});

app.listen(PORT, "0.0.0.0", () => console.log(`Sunucu port ${PORT} üzerinde hazır.`));
