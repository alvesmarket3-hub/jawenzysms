/**
 * VerifyPro - SMS Dağıtım & Bakiye Doğrulama API Katmanı
 * Dil: Node.js (Express Framework)
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Statik Dosya ve Ana Sayfa Entegrasyonu (Cannot GET / Çözümü)
app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Bellek İçi Veritabanı Modeli (Mock Veriler)
let users = [
    { id: 1, email: 'demo@verifypro.com', password: 'password123', balance: 250.00, is_admin: true }
];

let orders = [];

// Giriş Yap API
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
        return res.status(401).json({ success: false, message: 'E-posta veya şifre hatalı!' });
    }
    res.json({ success: true, user });
});

// Kayıt Ol API
app.post('/api/auth/register', (req, res) => {
    const { email, password } = req.body;
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ success: false, message: 'Bu e-posta zaten kayıtlı!' });
    }
    const newUser = { id: users.length + 1, email, password, balance: 0.00, is_admin: false };
    users.push(newUser);
    res.json({ success: true, message: 'Kayıt başarılı!' });
});

// Güvenli Satın Alım API
app.post('/api/purchase', (req, res) => {
    const { email, price, serviceName } = req.body;
    const user = users.find(u => u.email === email);

    if (!user || user.balance < price) {
        return res.status(402).json({ success: false, message: 'Bakiye yetersiz veya oturum geçersiz!' });
    }

    user.balance = parseFloat((user.balance - price).toFixed(2));
    
    const randomNum = "+90 53" + Math.floor(2 + Math.random() * 8) + " " + Math.floor(100 + Math.random() * 900) + " " + Math.floor(10 + Math.random() * 90);
    const newOrder = { id: 'ORD-' + Math.floor(100000 + Math.random() * 900000), serviceName, number: randomNum, status: 'Waiting' };
    orders.unshift(newOrder);

    res.json({ success: true, newBalance: user.balance, order: newOrder });
});

// PayTR Webhook Entegrasyon Şablonu
app.post('/api/payments/paytr-webhook', (req, res) => {
    const { merchant_oid, status, total_amount, email } = req.body;
    if (status === 'success') {
        const user = users.find(u => u.email === email);
        if (user) {
            user.balance += (parseFloat(total_amount) / 100);
            return res.send('OK');
        }
    }
    res.status(400).send('FAIL');
});

// Admin Kullanıcıları Getir
app.get('/api/admin/users', (req, res) => {
    res.json({ users });
});

app.listen(PORT, "0.0.0.0", () => console.log(`Sunucu port ${PORT} üzerinde hazır.`));
