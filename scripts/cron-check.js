const { getAllCustomers, updateCustomer } = require('../db.js');
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const FOLLOWUP_INTERVAL_1_HOURS = 2;
const FOLLOWUP_INTERVAL_2_HOURS = 12;
const CRON_RUN_INTERVAL_MINUTES = 5;

async function sendFollowUp(psid, message) {
  try {
    const request_body = {
      recipient: { id: psid },
      message: { text: message }
    };
    await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, request_body);
    console.log(`[CRON] ✅ Gửi follow-up cho ${psid}`);
  } catch (err) {
    console.error(`[CRON] ❌ Lỗi gửi follow-up cho ${psid}:`, err.response?.data || err.message);
  }
}

function hoursSince(dateString) {
  const diff = Date.now() - new Date(dateString).getTime();
  return diff / (1000 * 60 * 60);
}

async function checkAndSendFollowUps() {
  console.log('[CRON] Bắt đầu quét...');
  const allCustomers = getAllCustomers();

  for (const psid in allCustomers) {
    const customer = allCustomers[psid];
    const timeSinceUpdate = hoursSince(customer.updatedAt);

    if (customer.status === 'pending_info' && timeSinceUpdate >= FOLLOWUP_INTERVAL_1_HOURS) {
      await sendFollowUp(psid, "Dạ em thấy anh/chị vẫn quan tâm, cần hỗ trợ thêm gì không ạ?");
      await updateCustomer(psid, { status: 'followup_1' });
    } else if (customer.status === 'followup_1' && timeSinceUpdate >= FOLLOWUP_INTERVAL_2_HOURS) {
      await sendFollowUp(psid, "Dạ em nhắc nhẹ anh/chị ạ, nếu còn cần tư vấn cứ nhắn em nhé!");
      await updateCustomer(psid, { status: 'followup_2' });
    }
  }
  console.log('[CRON] ✅ Quét xong.');
}

console.log(`[CRON] Service khởi chạy. Sẽ chạy mỗi ${CRON_RUN_INTERVAL_MINUTES} phút.`);
setInterval(checkAndSendFollowUps, CRON_RUN_INTERVAL_MINUTES * 60 * 1000);
checkAndSendFollowUps();
