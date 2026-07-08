/**
 * VerifyPro Enterprise v2 - Gelişmiş Dinamik Altyapı
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

// Sabit Bakiye Paketleri Tanımı
const BAKİYE_PAKETLERİ = [
    { id: 'p1', name: 'Başlangıç Paketi', bakiye: 100, price: 100 },
    { id: 'p2', name: 'Standart Paket', bakiye: 250, price: 230 }, // İndirimli
    { id: 'p3', name: 'Profesyonel Paket', bakiye: 500, price: 450 },
    { id: 'p4', name: 'Premium Kurumsal', bakiye: 1000, price: 850 }
];

let db = {
    users: [
        { id: 1, email: 'demo@verifypro.com', password: 'password123', balance: 15.00, isBanned: false }
    ],
    orders: [],
    chats: [] // { id, userEmail, sender, text, time }
};

function loadDatabase() {
    if (fs.existsSync(DATA_FILE)) {
        try { db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); } catch (e) { saveDatabase(); }
    } else { saveDatabase(); }
}
function saveDatabase() { fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 4), 'utf-8'); }
loadDatabase();

// Statik Sayfa Yönlendirmeleri
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// 🔐 Kimlik Doğrulama API'leri
app.post('/api/auth/register', (req, res) => {
    const { email, password } = req.body;
    if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return res.json({ success: false, message: 'Bu e-posta adresi zaten kullanımda!' });
    }
    const newUser = { id: Date.now(), email, password, balance: 0.00, isBanned: false };
    db.users.push(newUser); saveDatabase();
    res.json({ success: true, user: newUser });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) return res.status(401).json({ success: false, message: 'E-posta veya şifre hatalı!' });
    if (user.isBanned) return res.status(403).json({ success: false, message: 'Hesabınız askıya alınmıştır!' });
    res.json({ success: true, user });
});

app.get('/api/user/profile', (req, res) => {
    const email = req.query.email;
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return res.json({ success: false });
    res.json({ success: true, balance: user.balance, isBanned: user.isBanned });
});

// 🔢 SMS Satın Alma Sistemi
app.post('/api/purchase', (req, res) => {
    const { email, price, serviceName } = req.body;
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user || user.isBanned || user.balance < price) {
        return res.json({ success: false, message: 'İşlem gerçekleştirilemedi. Bakiyenizi kontrol edin.' });
    }

    user.balance = parseFloat((user.balance - price).toFixed(2));
    
    let randomNum = "+90 505 " + Math.floor(1000000 + Math.random() * 9000000);
    if (fs.existsSync(NUMBERS_FILE)) {
        const lines = fs.readFileSync(NUMBERS_FILE, 'utf-8').split('\n').map(s => s.trim()).filter(s => s.length > 0);
        if (lines.length > 0) randomNum = lines[Math.floor(Math.random() * lines.length)];
    }

    const newOrder = {
        id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
        userEmail: user.email, serviceName, number: randomNum, status: 'Waiting', smsCode: '', time: new Date().toLocaleTimeString('tr-TR')
    };
    db.orders.unshift(newOrder); saveDatabase();
    res.json({ success: true, newBalance: user.balance, order: newOrder });
});

app.get('/api/orders', (req, res) => res.json({ success: true, orders: db.orders }));

// 📦 Bakiye Paket Satın Alma API'si (Ödeme Bildirimi / Simülasyonu)
app.get('/api/packages', (req, res) => res.json({ success: true, packages: BAKİYE_PAKETLERİ }));
app.post('/api/packages/buy', (req, res) => {
    const { email, packageId } = req.body;
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    const paket = BAKİYE_PAKETLERİ.find(p => p.id === packageId);
    
    if (!user || !paket) return res.json({ success: false, message: 'Geçersiz istek.' });
    
    // Otomatik onay mekanizması (Gerçek entegrasyonda burası ödeme kuruluşu callback'ine bağlanır)
    user.balance = parseFloat((user.balance + paket.bakiye).toFixed(2));
    
    // Sistem mesajı oluştur
    db.chats.push({
        id: Date.now(),
        userEmail: user.email,
        sender: 'Sistem',
        text: `🎉 ${paket.name} başarıyla tanımlandı! Hesabınıza ${paket.bakiye} ₺ eklendi.`,
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    });
    
    saveDatabase();
    res.json({ success: true, newBalance: user.balance });
});

// 💬 Gerçek Zamanlı Çift Yönlü Sohbet API'si
app.get('/api/chats', (req, res) => {
    const { email } = req.query;
    if (email) {
        // Kullanıcı sadece kendi mesajlarını görür
        const filtered = db.chats.filter(c => c.userEmail.toLowerCase() === email.toLowerCase());
        return res.json({ success: true, chats: filtered });
    }
    // Admin tüm mesajları görür
    res.json({ success: true, chats: db.chats });
});

app.post('/api/chats/send', (req, res) => {
    const { userEmail, sender, text } = req.body;
    if (!userEmail || !text) return res.json({ success: false });

    db.chats.push({
        id: Date.now(),
        userEmail: userEmail.toLowerCase(),
        sender,
        text,
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    });
    saveDatabase();
    res.json({ success: true });
});

// 🛠️ Yönetim (Admin) Paneli API'leri
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
    const user = db.users.find(u => u.id == userId);
    if (user) {
        db.chats = db.chats.filter(c => c.userEmail.toLowerCase() !== user.email.toLowerCase());
        db.orders = db.orders.filter(o => o.userEmail.toLowerCase() !== user.email.toLowerCase());
        db.users = db.users.filter(u => u.id != userId);
        saveDatabase();
    }
    res.json({ success: true });
});

app.post('/api/admin/set-code', (req, res) => {
    const { orderId, smsCode } = req.body;
    const order = db.orders.find(o => o.id === orderId);
    if (order) { order.smsCode = smsCode; order.status = 'Completed'; saveDatabase(); }
    res.json({ success: true });
});

app.listen(PORT, "0.0.0.0", () => console.log(`Sunucu port ${PORT} üzerinde çalışıyor.`));
