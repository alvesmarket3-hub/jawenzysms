/**
 * VerifyPro - SMS Dağıtım, Bakiye Doğrulama ve Web Sunucu Katmanı
 * Dil: Node.js (Express)
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
// Railway'in otomatik port ataması için process.env.PORT eklenmiştir
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Sitenin açılması için gerekli olan yönlendirmeler (Cannot GET / Çözümü)
app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Bellek içi güvenli veritabanı yapısı
let users = [
    { email: 'demo@verifypro.com', password: 'password123', balance: 250.00, is_admin: true }
];

// Giriş Yap API
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        return res.status(401).json({ success: false, message: 'E-posta veya şifre hatalı!' });
    }
    res.json({ success: true, message: 'Giriş başarılı!', user });
});

// Kayıt Ol API
app.post('/api/auth/register', (req, res) => {
    const { email, password } = req.body;
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ success: false, message: 'Bu e-posta zaten kayıtlı!' });
    }
    
    const newUser = { email, password, balance: 0.00, is_admin: false };
    users.push(newUser);
    res.json({ success: true, message: 'Hesabınız başarıyla oluşturuldu! Giriş yapabilirsiniz.' });
});

// Güvenli Satın Alım ve Cüzdan API
app.post('/api/purchase', (req, res) => {
    const { email, price, type } = req.body;
    const user = users.find(u => u.email === email);

    if (!user || user.balance < price) {
        return res.status(402).json({ success: false, message: 'Bakiye yetersiz veya geçersiz oturum!' });
    }

    user.balance = parseFloat((user.balance - price).toFixed(2));
    res.json({ success: true, type, newBalance: user.balance });
});

// Yönetici: Kullanıcı Listesi Çekme
app.get('/api/admin/users', (req, res) => {
    res.json({ users });
});

// Yönetici: Bakiye Enjekte Etme
app.post('/api/admin/add-balance', (req, res) => {
    const { email, amount } = req.body;
    const user = users.find(u => u.email === email);
    if (user) {
        user.balance = parseFloat((user.balance + amount).toFixed(2));
        return res.json({ success: true, newBalance: user.balance });
    }
    res.status(404).json({ success: false });
});

// Sunucuyu başlat
app.listen(PORT, () => console.log(`Sunucu port ${PORT} üzerinde hazır.`));
