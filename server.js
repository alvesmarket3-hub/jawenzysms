/**
 * VerifyPro - Gelişmiş SMS Onay & Manuel Kod Kontrol API Katmanı
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

app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Veri Modelleri
let users = [
    { id: 1, email: 'demo@verifypro.com', password: 'password123', balance: 500.00, is_admin: true }
];
let orders = [];

// Giriş API
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
        return res.status(401).json({ success: false, message: 'E-posta veya şifre hatalı!' });
    }
    res.json({ success: true, user });
});

// Satın Alma API (numaralar.txt dosyasından numara çeker)
app.post('/api/purchase', (req, res) => {
    const { email, price, serviceName } = req.body;
    const user = users.find(u => u.email === email);

    if (!user || user.balance < price) {
        return res.status(402).json({ success: false, message: 'Bakiyeniz yetersiz!' });
    }

    user.balance = parseFloat((user.balance - price).toFixed(2));
    
    // txt dosyasından numara çekme mantığı
    let secilenNumara = "+90 532 " + Math.floor(100 + Math.random() * 900) + " 00 00"; // Dosya okunamazsa fallback
    try {
        const dosyaYolu = path.join(__dirname, 'numaralar.txt');
        if (fs.existsSync(dosyaYolu)) {
            const data = fs.readFileSync(dosyaYolu, 'utf-8');
            const satirlar = data.split('\n').map(s => s.trim()).filter(s => s.length > 0);
            if (satirlar.length > 0) {
                const rastgeleIndeks = Math.floor(Math.random() * satirlar.length);
                secilenNumara = satirlar[rastgeleIndeks];
            }
        }
    } catch (err) {
        console.log("Dosya okuma hatası, varsayılan numara üretildi.");
    }

    const newOrder = {
        id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
        serviceName,
        number: secilenNumara,
        status: 'Waiting',
        smsCode: '' // Başlangıçta boş, admin dolduracak
    };
    
    orders.unshift(newOrder);

    res.json({ success: true, newBalance: user.balance, order: newOrder });
});

// Tüm Siparişleri Getir (Kullanıcı ve Admin Paneli İçin)
app.get('/api/orders', (req, res) => {
    res.json({ success: true, orders });
});

// Admin Manuel Kod Girme API
app.post('/api/admin/set-code', (req, res) => {
    const { orderId, smsCode } = req.body;
    const order = orders.find(o => o.id === orderId);
    
    if (!order) {
        return res.status(404).json({ success: false, message: 'Sipariş bulunamadı!' });
    }

    order.smsCode = smsCode;
    order.status = 'Completed'; // Durumu tamamlandı yapıyoruz

    res.json({ success: true, message: 'SMS kodu başarıyla tanımlandı!', order });
});

app.listen(PORT, "0.0.0.0", () => console.log(`Sunucu port ${PORT} üzerinde hazır.`));
