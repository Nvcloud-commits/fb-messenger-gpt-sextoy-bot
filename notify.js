// notify.js
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

async function sendDiscordNotification(customer) {
  if (!DISCORD_WEBHOOK_URL) {
    console.error('[NOTIFY] ❌ DISCORD_WEBHOOK_URL chưa được cấu hình trong file .env');
    return;
  }

  const message = {
    content: `📌 Có đơn hàng mới!\n🧑‍💼 PSID: ${customer.psid}\n📞 Phone: ${customer.phone || 'Chưa có'}\n🏠 Địa chỉ: ${customer.diachi || 'Chưa có'}\n⏰ Cập nhật: ${customer.updatedAt}`
  };

  try {
    await axios.post(DISCORD_WEBHOOK_URL, message);
    console.log(`[NOTIFY] ✅ Gửi thông báo Discord thành công cho ${customer.psid}`);
  } catch (err) {
    console.error('[NOTIFY] ❌ Lỗi gửi Discord:', err.response?.data || err.message);
  }
}

module.exports = { sendDiscordNotification };
