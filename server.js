// server.js
const express = require('express');
const dotenv = require('dotenv');
const axios = require('axios');
const OpenAI = require('openai');
const { updateCustomer, getCustomer, resetFollowUpState } = require('./db.js');
const { sendDiscordNotification } = require('./notify.js');

// --- KHỞI TẠO VÀ CẤU HÌNH ---
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(express.json());

// --- HỆ THỐNG PROMPT CHO AI ---
const SYSTEM_PROMPT = `Bạn LÀ một nhân viên tư vấn sextoy chuyên nghiệp, thông minh và tinh tế.

📌 **QUY TẮC BẮT BUỘC:**
1.  **Xưng Hô:** Luôn xưng là "em" và gọi khách hàng là "anh/chị".
2.  **Giọng Văn:** Giao tiếp tự nhiên, thân thiện, nhẹ nhàng, và ngắn gọn. Tuyệt đối không suồng sã, không ép buộc. Luôn thể hiện sự tôn trọng quyền riêng tư của khách hàng.
3.  **Nhiệm Vụ Chính:** Nhiệm vụ của bạn là hiểu rõ ý định của khách hàng và đưa ra câu trả lời phù hợp, đồng thời thu thập thông tin cần thiết (tên, số điện thoại, địa chỉ) để chốt đơn.
4.  **Bảo Mật:** TUYỆT ĐỐI không được bịa đặt thông tin sản phẩm, không suy diễn. Không bao giờ yêu cầu hoặc lưu trữ các thông tin nhạy cảm khác ngoài tên, SĐT và địa chỉ giao hàng.
5.  **Thu thập thông tin:** Chỉ hỏi thông tin khách hàng (SĐT, địa chỉ) khi họ có ý định mua hàng hoặc khi cuộc trò chuyện tự nhiên dẫn đến việc đó. Đừng hỏi ngay lập tức. Hãy hỏi từng thông tin một, đừng hỏi cả hai cùng lúc. Ví dụ: sau khi có SĐT, hãy hỏi tiếp địa chỉ.

📌 **ĐỊNH DẠNG TRẢ VỀ (LUÔN LUÔN là JSON):**
Bạn phải phân tích tin nhắn của người dùng và trả lời bằng một đối tượng JSON DUY NHẤT có cấu trúc như sau:
{
  "intent": "<loại_ý_định>",
  "data": {
    "phone": "<số_điện_thoại_nếu_có>",
    "address": "<địa_chỉ_nếu_có>"
  },
  "reply": "<câu_trả_lời_cho_khách_hàng>"
}
...`;
📌 **CÁC LOẠI Ý ĐỊNH (\`intent\`):**
-   \`tu_van_san_pham\`: Khách hàng hỏi về thông tin, tính năng, cách dùng sản phẩm.
-   \`cung_cap_thong_tin\`: Khách hàng cung cấp số điện thoại hoặc địa chỉ.
-   \`hoi_thong_tin_giao_hang\`: Khách hàng hỏi về chính sách giao hàng, vận chuyển, che tên sản phẩm.
-   \`chot_don\`: Khách hàng bày tỏ ý định muốn mua hàng.
-   \`chao_hoi_chung\`: Khách hàng chào hỏi chung chung, chưa rõ mục đích.
-   \`ngoai_le\`: Các câu hỏi không liên quan đến sản phẩm hoặc mua hàng.`;
// --- CÁC HÀM TIỆN ÍCH ---
async function callSendAPI(sender_psid, response_text) {
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
  const request_body = {
    recipient: { id: sender_psid },
    message: { text: response_text },
    messaging_type: "RESPONSE"
  };
  try {
    await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, request_body);
    console.log(`✅ Tin nhắn đã gửi tới ${sender_psid}.`);
  } catch (err) {
    console.error('❌ Lỗi gửi Messenger:', err.response?.data || err.message);
  }
}

// --- LOGIC XỬ LÝ TIN NHẮN CHÍNH ---
async function handleMessage(sender_psid, userMessage) {
  try {
    console.log(`💬 USER (${sender_psid}): ${userMessage}`);
    
    // Quan trọng: Khi người dùng nhắn, reset trạng thái follow-up về ban đầu
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
    console.log('🤖 AI Response (JSON):', aiResponse);

    const { intent, data, reply } = aiResponse;

    if (reply) {
      await callSendAPI(sender_psid, reply);
    }
    
    // Cập nhật thông tin vào DB nếu có
    if (data?.phone || data?.address) {
      await updateCustomer(sender_psid, { phone: data.phone, diachi: data.address });
    }
    
    const khachHang = await getCustomer(sender_psid);

    // Kiểm tra xem đã đủ thông tin để chốt đơn chưa
    if (khachHang.phone && khachHang.diachi && khachHang.status !== 'completed') {
      await sendDiscordNotification(khachHang);
      await updateCustomer(sender_psid, { status: 'completed' });
    } else if (intent === 'chot_don' || intent === 'cung_cap_thong_tin') {
      if (!khachHang.phone) {
        await callSendAPI(sender_psid, "Dạ anh/chị cho em xin số điện thoại để bên em tiện liên hệ xác nhận đơn hàng nhé ạ.");
      } else if (!khachHang.diachi) {
        await callSendAPI(sender_psid, "Dạ anh/chị cho em xin địa chỉ chi tiết để em giao hàng cho mình nha.");
      }
    }

  } catch (err) {
    console.error('❌ Lỗi xử lý tin nhắn:', err.response?.data || err.message);
    await callSendAPI(sender_psid, "Xin lỗi, em đang gặp chút trục trặc, anh/chị vui lòng thử lại sau giây lát ạ.");
  }
}

// --- ROUTES CỦA WEBHOOK ---
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

app.listen(PORT, () => {
  console.log(`🚀 Server is running on PORT ${PORT}`);
});
