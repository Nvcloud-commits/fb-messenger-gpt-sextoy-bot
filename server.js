// server.js
const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');
const OpenAI = require('openai');
const { updateCustomer, getCustomer, resetFollowUpState } = require('./db.js');
const { sendDiscordNotification } = require('./notify.js');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(express.json());

const SYSTEM_PROMPT = `Bạn là nhân viên tư vấn sextoy chuyên nghiệp, thông minh, tinh tế.

1. Xưng là "em", gọi khách là "anh/chị".
2. Văn phong tự nhiên, tôn trọng quyền riêng tư, không ép buộc.
3. Thu thập đủ thông tin tên, SĐT, địa chỉ để chốt đơn.
4. Không bịa đặt sản phẩm.
5. Chỉ hỏi SĐT/địa chỉ khi khách có nhu cầu mua.

ĐỊNH DẠNG JSON:
{
  "intent": "<loai_y_dinh>",
  "data": {
    "phone": "<so_dien_thoai>",
    "address": "<dia_chi>"
  },
  "reply": "<cau_tra_loi_cho_khach>"
}

Các intent:
- tu_van_san_pham
- cung_cap_thong_tin
- hoi_thong_tin_giao_hang
- chot_don
- chao_hoi_chung
- ngoai_le
`;

async function callSendAPI(sender_psid, response_text) {
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
  const request_body = {
    recipient: { id: sender_psid },
    message: { text: response_text },
    messaging_type: "RESPONSE"
  };

  try {
    await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, request_body);
    console.log(`✅ Tin nhắn đã gửi tới ${sender_psid}`);
  } catch (error) {
    console.error('❌ Lỗi gửi Messenger:', error.response?.data || error.message);
  }
}

async function handleMessage(sender_psid, userMessage) {
  try {
    console.log(`💬 USER (${sender_psid}): ${userMessage}`);
    await resetFollowUpState(sender_psid);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ]
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content);
    console.log('🤖 AI Response:', aiResponse);

    const { intent, data, reply } = aiResponse;

    if (reply) {
      await callSendAPI(sender_psid, reply);
    }

    if (data?.phone || data?.address) {
      await updateCustomer(sender_psid, { phone: data.phone, diachi: data.address });
    }

    const khachHang = await getCustomer(sender_psid);

    if (khachHang.phone && khachHang.diachi && khachHang.status !== 'completed') {
      await sendDiscordNotification(khachHang);
      await updateCustomer(sender_psid, { status: 'completed' });
    } else if (intent === 'chot_don' || intent === 'cung_cap_thong_tin') {
      if (!khachHang.phone) {
        await callSendAPI(sender_psid, "Dạ anh/chị cho em xin số điện thoại để tiện liên hệ xác nhận đơn ạ.");
      } else if (!khachHang.diachi) {
        await callSendAPI(sender_psid, "Dạ anh/chị cho em xin địa chỉ chi tiết để em gửi hàng nha.");
      }
    }

  } catch (err) {
    console.error('❌ Lỗi xử lý tin nhắn:', err.response?.data || err.message);
    await callSendAPI(sender_psid, "Xin lỗi, em đang gặp chút trục trặc, anh/chị vui lòng thử lại sau ạ.");
  }
}

app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ WEBHOOK_VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', (req, res) => {
  const body = req.body;
  if (body.object === 'page') {
    res.status(200).send('EVENT_RECEIVED');
    body.entry.forEach(entry => {
      const webhook_event = entry.messaging[0];
      const sender_psid = webhook_event.sender.id;

      if (webhook_event.message && webhook_event.message.text) {
        handleMessage(sender_psid, webhook_event.message.text);
      }
    });
  } else {
    res.sendStatus(404);
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running on PORT ${port}`);
});
