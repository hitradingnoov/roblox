const axios = require('axios');

module.exports = async (req, res) => {
    // CORS başlıkları
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Roblox-Secret');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Roblox POST isteği doğrulaması
    const payload = req.body;
    
    if (!payload || !payload.roblox_user_id) {
        return res.status(400).json({ success: false, message: "Geçersiz veya boş veri" });
    }

    try {
        const response = await axios.post('https://bloxbet.unaux.com/roblox_webhook.php', payload, {
            headers: {
                'Content-Type': 'application/json',
                'X-Roblox-Secret': req.headers['x-roblox-secret'] || '',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        return res.status(response.status).json(response.data);
    } catch (error) {
        console.error("Proxy Hata:", error.message);
        return res.status(500).json({ 
            success: false, 
            message: "Proxy Hatasi: " + (error.response ? JSON.stringify(error.response.data) : error.message) 
        });
    }
};
