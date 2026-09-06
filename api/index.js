const axios = require('axios');
const crypto = require('crypto');

// Unaux AES Şifre Çözücü Yardımcı Fonksiyonları
function hexToBytes(hex) {
    let bytes = [];
    for (let c = 0; c < hex.length; c += 2) {
        bytes.push(parseInt(hex.substr(c, 2), 16));
    }
    return bytes;
}

function bytesToHex(bytes) {
    return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function decryptUnauxAES(aHex, bHex, cHex) {
    try {
        const key = Buffer.from(hexToBytes(aHex));
        const iv = Buffer.from(hexToBytes(bHex));
        const ciphertext = Buffer.from(hexToBytes(cHex));

        const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
        decipher.setAutoPadding(false);
        let decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        
        return decrypted.toString('hex');
    } catch (e) {
        return null;
    }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const TARGET_URL = 'https://bloxbet.unaux.com/roblox_webhook.php';
    const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    try {
        // 1. ADIM: Unaux Anti-Bot Güvenlik Kodunu Çek
        const firstReq = await axios.get(TARGET_URL, {
            headers: { 'User-Agent': USER_AGENT }
        });

        let testCookie = "";
        const html = firstReq.data;

        // HTML içindeki AES değişkenlerini ayıkla (a, b, c parametreleri)
        if (typeof html === 'string' && html.includes('slowAES.decrypt')) {
            const matches = html.match(/toNumbers\("([a-f0-9]+)"\)/g);
            if (matches && matches.length >= 3) {
                const aHex = matches[0].match(/"([a-f0-9]+)"/)[1];
                const bHex = matches[1].match(/"([a-f0-9]+)"/)[1];
                const cHex = matches[2].match(/"([a-f0-9]+)"/)[1];

                testCookie = decryptUnauxAES(aHex, bHex, cHex);
            }
        }

        // 2. ADIM: Hesaplanan Güvenlik Çereziyle (__test) Asıl POST İsteğini PHP'ye Gönder
        const secondReq = await axios.post(TARGET_URL, req.body, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': USER_AGENT,
                'Cookie': testCookie ? `__test=${testCookie}` : ''
            }
        });

        // PHP'den dönen gerçek cevabı Roblox'a ilet
        return res.status(200).json(secondReq.data);

    } catch (error) {
        console.error("Unaux Proxy Hata:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unaux Bağlantı Hatası: " + error.message
        });
    }
};
