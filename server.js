/**
 * VerifyPro Enterprise - Gelişmiş Kalıcı API & Yönetim Katmanı
 */
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const DATA_FILE = path.join(__dirname, 'veri.json');
const NUMBERS_FILE = path.join(__dirname, 'numaralar.txt');

// Başlangıç Veritabanı Şablonu
let db = {
    users: [
        { id: 1, email: 'demo@verifypro.com', password: 'password123', balance: 250.00, isBanned: false },
        { id: 2, email: 'admin@verifypro.com', password: 'adminpassword', balance: 9999.00, isBanned: false }
    ],
    orders: [],
    chats: [
        { id: 1, sender: 'Sistem', text: 'VerifyPro Canlı Destek Merkezine Hoş Geldiniz!', time: '12:00' }
    ]
};

function loadDatabase() {
    if (fs.existsSync(DATA_FILE)) {
        try { db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); } catch (e) { saveDatabase(); }
    } else { saveDatabase(); }
}
function saveDatabase() { fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 4), 'utf-8'); }
loadDatabase();

// 🌐 URL Yönlendirmeleri
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// 🔐 Kayıt Ol & Giriş Yap API
app.post('/api/auth/register', (req, res) => {
    const { email, password } = req.body;
    if (db.users.find(u => u.email === email)) return res.json({ success: false, message: 'Bu e-posta zaten kayıtlı!' });
    const newUser = { id: Date.now(), email, password, balance: 0.00, isBanned: false };
    db.users.push(newUser); saveDatabase();
    res.json({ success: true, user: newUser });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.users.find(u => u.email === email && u.password === password);
    if (!user) return res.status(401).json({ success: false, message: 'E-posta veya şifre hatalı!' });
    if (user.isBanned) return res.status(403).json({ success: false, message: 'Hesabınız askıya alınmıştır (Banned)!' });
    res.json({ success: true, user });
});

// 🔢 SMS Satın Alma Modülü
app.post('/api/purchase', (req, res) => {
    const { email, price, serviceName } = req.body;
    const user = db.users.find(u => u.email === email);
    if (!user) return res.json({ success: false, message: 'Kullanıcı bulunamadı.' });
    if (user.isBanned) return res.json({ success: false, message: 'Banlı hesap işlem yapamaz.' });
    if (user.balance < price) return res.json({ success: false, message: 'Yetersiz bakiye!' });

    user.balance = parseFloat((user.balance - price).toFixed(2));
    
    let secilenNumara = "+90 532 " + Math.floor(100 + Math.random() * 900) + " 00 00";
    if (fs.existsSync(NUMBERS_FILE)) {
        const data = fs.readFileSync(NUMBERS_FILE, 'utf-8').split('\n').map(s => s.trim()).filter(s => s.length > 0);
        if (data.length > 0) secilenNumara = data[Math.floor(Math.random() * data.length)];
    }

    const newOrder = {
        id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
        userEmail: email, serviceName, number: secilenNumara, status: 'Waiting', smsCode: '', time: new Date().toLocaleTimeString('tr-TR')
    };
    db.orders.unshift(newOrder); saveDatabase();
    res.json({ success: true, newBalance: user.balance, order: newOrder });
});

app.get('/api/orders', (req, res) => res.json({ success: true, orders: db.orders }));

// 💬 Canlı Chat API
app.get('/api/chats', (req, res) => res.json({ success: true, chats: db.chats }));
app.post('/api/chats/send', (req, res) => {
    const { sender, text } = req.body;
    db.chats.push({ id: Date.now(), sender, text, time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) });
    saveDatabase(); res.json({ success: true });
});

// 🛠️ YÖNETİCİ (ADMIN) ÖZEL APILERİ
app.get('/api/admin/users', (req, res) => res.json({ success: true, users: db.users }));

app.post('/api/admin/update-balance', (req, res) => {
    const { userId, amount } = req.body;
    const user = db.users.find(u => u.id == userId);
    if (user) { user.balance = parseFloat(parseFloat(amount).toFixed(2)); saveDatabase(); }
    res.json({ success: true });
});

app.post('/api/admin/toggle-ban', (req, res) => {
    const { userId } = req.body;
    const user = db.users.find(u => u.id == userId);
    if (user) { user.isBanned = !user.isBanned; saveDatabase(); }
    res.json({ success: true });
});

app.post('/api/admin/delete-user', (req, res) => {
    const { userId } = req.body;
    db.users = db.users.filter(u => u.id != userId); saveDatabase();
    res.json({ success: true });
});

app.post('/api/admin/set-code', (req, res) => {
    const { orderId, smsCode } = req.body;
    const order = db.orders.find(o => o.id === orderId);
    if (order) { order.smsCode = smsCode; order.status = 'Completed'; saveDatabase(); }
    res.json({ success: true });
});

app.listen(PORT, "0.0.0.0", () => console.log(`Sunucu aktif: port ${PORT}`));
