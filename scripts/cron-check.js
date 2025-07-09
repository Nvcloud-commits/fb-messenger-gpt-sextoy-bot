// scripts/cron-check.js

const { getAllCustomers, updateCustomer } = require('../db.js');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const FOLLOWUP_INTERVAL_1_HOURS = 2;   // Gửi lần 1 sau 2 giờ
const FOLLOWUP_INTERVAL_2_HOURS = 12;  // Gửi lần 2 sau 12 giờ kể từ lần 1
const CRON_RUN_INTERVAL_MINUTES = 5;   // Chạy cron mỗi 5 phút

async function sendFollowUp(psid, message) {
  try {
    const request_body = {
      recipient: { id: psid },
      message: { text: message }
    };
    await axios.post(
      `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      request_body
    );
    console.log(`[CRON] ✅ Follow-up đã gửi cho ${psid}`);
  } catch (error) {
    console.error(`[CRON] ❌ Lỗi gửi follow-up cho ${psid}:`, error.response?.data || error.message);
  }
}

function hoursSince(dateString) {
  const diff = Date.now() - new Date(dateString).getTime();
  return diff / (1000 * 60 * 60);
}

async function checkAndSendFollowUps() {
  console.log('[CRON] 🔍 Bắt đầu quét khách hàng cần follow-up...');
  const allCustomers = getAllCustomers();

  for (const psid in allCustomers) {
    const customer = allCustomers[psid];
    const timeSinceUpdate = hoursSince(customer.updatedAt);

    if (customer.status === 'pending_info' && timeSinceUpdate >= FOLLOWUP_INTERVAL_1_HOURS) {
      await sendFollowUp(psid, 'Dạ em thấy anh/chị vẫn đang quan tâm, nếu cần em sẵn sàng hỗ trợ thêm ạ!');
      await updateCustomer(psid, { status: 'followup_1' });
    } else if (customer.status === 'followup_1' && timeSinceUpdate >= FOLLOWUP_INTERVAL_2_HOURS) {
      await sendFollowUp(psid, 'Dạ em chào anh/chị, em xin phép nhắc nhẹ ạ. Nếu anh/chị còn quan tâm sản phẩm bên em, đừng ngại nhắn em tư vấn thêm nha! ❤️');
      await updateCustomer(psid, { status: 'followup_2' });
    }
  }
  console.log('[CRON] ✅ Quét xong.');
}

// --- CHẠY NGAY ---
console.log(`[CRON] 🚀 Follow-up service khởi chạy. Lặp lại mỗi ${CRON_RUN_INTERVAL_MINUTES} phút.`);
setInterval(checkAndSendFollowUps, CRON_RUN_INTERVAL_MINUTES * 60 * 1000);
checkAndSendFollowUps();
