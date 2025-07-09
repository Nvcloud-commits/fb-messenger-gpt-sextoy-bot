// notify.js

import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export async function sendDiscordNotification(customer) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL_TAB1;
  if (!webhookUrl) {
    console.warn('[Discord] Biến DISCORD_WEBHOOK_URL_TAB1 chưa được thiết lập. Bỏ qua thông báo.');
    return;
  }

  // Sử dụng Discord Embeds để tin nhắn đẹp hơn
  const embed = {
    color: 0x00ff00, // Màu xanh lá
    title: '🎉 ĐƠN HÀNG MỚI TỪ MESSENGER 🎉',
    description: 'Một đơn hàng mới đã có đủ thông tin. Vui lòng kiểm tra và xác nhận!',
    fields: [
      {
        name: '👤 Khách hàng (PSID)',
        value: `\`${customer.psid}\``,
        inline: false,
      },
      {
        name: '📞 Số điện thoại',
        value: `\`${customer.phone}\``,
        inline: true,
      },
      {
        name: '🏠 Địa chỉ',
        value: `\`${customer.diachi}\``,
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Hệ thống Chatbot Bán hàng',
    },
  };

  try {
    await axios.post(webhookUrl, { embeds: [embed] });
    console.log(`[Discord] ✅ Gửi thông báo đơn hàng của ${customer.psid} thành công.`);
  } catch (err) {
    console.error('❌ Lỗi gửi thông báo Discord:', err.response?.data || err.message);
  }
}
