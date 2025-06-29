// ==============================
// Load biến môi trường từ .env
// ==============================
require('dotenv').config();

const express = require('express');
const app = express();

// ==============================
// Đọc PORT từ .env hoặc mặc định 3000
// ==============================
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ==============================
// Xác minh Webhook (GET)
// ==============================
app.get('/webhook', (req, res) => {
  console.log('🔥 Verify request received:');
  console.log(req.query);

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('MODE:', mode);
  console.log('TOKEN:', token);
  console.log('EXPECTED TOKEN:', process.env.VERIFY_TOKEN);
  console.log('CHALLENGE:', challenge);

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
      console.log('✅ Webhook verified!');
      res.status(200).send(challenge);
    } else {
      console.log('❌ Webhook verification failed.');
      res.sendStatus(403);
    }
  } else {
    console.log('⚠️ Missing mode or token.');
    res.sendStatus(400);
  }
});

// ==============================
// Nhận message từ Facebook (POST)
// ==============================
app.post('/webhook', (req, res) => {
  console.log('📥 Received webhook POST:');
  console.log(JSON.stringify(req.body, null, 2));

  // TODO: Xử lý payload ở đây (sau này gọi OpenAI)

  res.sendStatus(200);
});

// ==============================
// Start server
// ==============================
app.listen(PORT, () => {
  console.log(`🚀 Webhook server is listening on port ${PORT}`);
});
