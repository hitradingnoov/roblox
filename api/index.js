const { Client } = require('pg');

export default async function handler(req, res) {
  // CORS Başlıkları
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Roblox-Secret');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const client = new Client({
    connectionString: "postgres://avnadmin:AIVEN_PAROLANIZ@pg-1a5937ae-ustakerempro-4c59.g.aivencloud.com:27908/defaultdb?sslmode=require",
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const { action, payload } = req.body || {};

    // 1. Roblox Webhook'tan Gelen Bakiye Güncelleme
    if (action === 'deposit') {
      const { roblox_user_id, amount } = payload;
      const userRes = await client.query(
        "SELECT id, username FROM users WHERE roblox_id = $1 OR oauth_uid = $1",
        [roblox_user_id]
      );

      if (userRes.rows.length === 0) {
        await client.end();
        return res.status(400).json({ success: false, message: 'Kullanıcı bulunamadı!' });
      }

      const user = userRes.rows[0];
      await client.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [amount, user.id]);
      await client.end();

      return res.status(200).json({
        success: true,
        message: 'SQL GÜNCELLENDİ!',
        user_id: user.id,
        username: user.username,
        added_bux: amount
      });
    }

    // 2. Roblox OAuth Callback (Giriş / Kayıt)
    if (action === 'auth_callback') {
      const { oauth_provider, oauth_uid, username, avatar } = payload;
      
      const checkRes = await client.query(
        "SELECT * FROM users WHERE oauth_provider = $1 AND oauth_uid = $2",
        [oauth_provider, oauth_uid]
      );

      if (checkRes.rows.length > 0) {
        const user = checkRes.rows[0];
        await client.query(
          "UPDATE users SET username = $1, avatar = $2, roblox_id = $3 WHERE id = $4",
          [username, avatar, oauth_uid, user.id]
        );
        
        const updatedUser = await client.query("SELECT * FROM users WHERE id = $1", [user.id]);
        await client.end();
        return res.status(200).json({ success: true, user: updatedUser.rows[0] });
      } else {
        const insertRes = await client.query(
          "INSERT INTO users (oauth_provider, oauth_uid, roblox_id, username, avatar, balance) VALUES ($1, $2, $3, $4, $5, 0.00) RETURNING *",
          [oauth_provider, oauth_uid, oauth_uid, username, avatar]
        );
        await client.end();
        return res.status(200).json({ success: true, user: insertRes.rows[0] });
      }
    }

    // 3. Genel SQL Sorgusu Çalıştırma Bridge
    if (action === 'query') {
      const { sql, params } = payload;
      const queryRes = await client.query(sql, params || []);
      await client.end();
      return res.status(200).json({ success: true, rows: queryRes.rows });
    }

    await client.end();
    return res.status(400).json({ success: false, message: 'Geçersiz aksiyon!' });

  } catch (err) {
    if (client) await client.end();
    return res.status(500).json({ success: false, error: err.message });
  }
}
