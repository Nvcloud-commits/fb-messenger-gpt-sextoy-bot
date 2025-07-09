import express from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import OpenAI from 'openai';

// --- KHỞI TẠO VÀ CẤU HÌNH ---
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware để đọc JSON body
app.use(express.json());


// --- HỆ THỐNG PROMPT CHO AI ---
// Prompt này yêu cầu AI trả về JSON, giúp backend xử lý dễ dàng.
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

📌 **CÁC LOẠI Ý ĐỊNH (\`intent\`):**
-   \`tu_van_san_pham\`: Khách hàng hỏi về thông tin, tính năng, cách dùng sản phẩm.
-   \`cung_cap_thong_tin\`: Khách hàng cung cấp số điện thoại hoặc địa chỉ.
-   \`hoi_thong_tin_giao_hang\`: Khách hàng hỏi về chính sách giao hàng, vận chuyển, che tên sản phẩm.
-   \`chot_don\`: Khách hàng bày tỏ ý định muốn mua hàng.
-   \`chao_hoi_chung\`: Khách hàng chào hỏi chung chung, chưa rõ mục đích.
-   \`ngoai_le\`: Các câu hỏi không liên quan đến sản phẩm hoặc mua hàng.`;


// --- GIẢ LẬP DATABASE (Để dễ copy-paste) ---
// TRONG THỰC TẾ: Bạn nên dùng một DB thật sự như MongoDB, PostgreSQL...
const inMemoryDB = new Map();

// Hàm lấy thông tin khách hàng
async function getKhachHang(psid) {
    if (!inMemoryDB.has(psid)) {
        inMemoryDB.set(psid, { phone: null, diachi: null, status: 'new' });
    }
    return inMemoryDB.get(psid);
}

// Hàm cập nhật thông tin khách hàng
async function capNhatKhachHang(psid, phone, diachi, status) {
    const khachHang = await getKhachHang(psid);
    if (phone) khachHang.phone = phone;
    if (diachi) khachHang.diachi = diachi;
    if (status) khachHang.status = status;
    
    // Nếu có cả SĐT và địa chỉ, cập nhật trạng thái
    if (khachHang.phone && khachHang.diachi && khachHang.status !== 'notified') {
        khachHang.status = 'ready_to_notify';
    }

    inMemoryDB.set(psid, khachHang);
    console.log(`[DB] Cập nhật khách hàng ${psid}:`, khachHang);
    return khachHang;
}


// --- CÁC HÀM TIỆN ÍCH ---

// Hàm gửi tin nhắn qua Messenger API
export async function callSendAPI(sender_psid, response_text) {
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

// Hàm gửi thông báo qua Discord Webhook
async function sendDiscordNotification(psid, phone, diachi) {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        console.log("[Discord] Chưa cấu hình DISCORD_WEBHOOK_URL, bỏ qua thông báo.");
        return;
    }
    const content = `
    🎉 **ĐƠN HÀNG MỚI TỪ MESSENGER** 🎉
    -----------------------------------
    **PSID Khách hàng:** \`${psid}\`
    **Số điện thoại:** \`${phone}\`
    **Địa chỉ:** \`${diachi}\`
    -----------------------------------
    Vui lòng vào hệ thống xác nhận đơn hàng!
    `;
    try {
        await axios.post(webhookUrl, { content });
        console.log(`[Discord] ✅ Đã gửi thông báo đơn hàng của ${psid}.`);
    } catch (error) {
        console.error('[Discord] ❌ Lỗi gửi thông báo:', error.message);
    }
}


// --- LOGIC XỬ LÝ TIN NHẮN CHÍNH ---
async function handleMessage(sender_psid, userMessage) {
  try {
    console.log(`💬 USER (${sender_psid}): ${userMessage}`);
    
    // Gọi OpenAI với prompt đã được tối ưu
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" }, // Ép buộc output là JSON
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ]
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content);
    console.log('🤖 AI Response (JSON):', aiResponse);

    const { intent, data, reply } = aiResponse;

    // 1. Gửi câu trả lời của AI cho người dùng trước
    if (reply) {
      await callSendAPI(sender_psid, reply);
    }

    // 2. Xử lý logic dựa trên intent và data
    if (data?.phone || data?.address) {
        await capNhatKhachHang(sender_psid, data.phone, data.address);
    }
    
    // Lấy thông tin khách hàng mới nhất từ DB (giả lập)
    const khachHang = await getKhachHang(sender_psid);

    // 3. Logic gửi thông báo hoặc hỏi thêm thông tin
    if (khachHang.status === 'ready_to_notify') {
        // Đã đủ thông tin, gửi thông báo và đánh dấu đã gửi
        await sendDiscordNotification(sender_psid, khachHang.phone, khachHang.diachi);
        await capNhatKhachHang(sender_psid, null, null, 'notified');
    } else if (intent === 'chot_don' || intent === 'cung_cap_thong_tin') {
        // Nếu khách muốn chốt đơn hoặc vừa cung cấp 1 phần thông tin, kiểm tra xem thiếu gì
        if (!khachHang.phone) {
            await callSendAPI(sender_psid, "Dạ anh/chị cho em xin số điện thoại để bên em tiện liên hệ xác nhận đơn hàng nhé ạ.");
        } else if (!khachHang.diachi) {
            await callSendAPI(sender_psid, "Dạ anh/chị cho em xin địa chỉ chi tiết để em giao hàng cho mình nha.");
        }
    }

  } catch (err) {
    console.error('❌ Lỗi xử lý tin nhắn:', err.response?.data || err.message);
    // Gửi tin nhắn xin lỗi tới người dùng nếu có lỗi xảy ra
    await callSendAPI(sender_psid, "Xin lỗi, em đang gặp chút trục trặc, anh/chị vui lòng thử lại sau giây lát ạ.");
  }
}


// --- ROUTES CỦA WEBHOOK ---

// Route để Facebook xác thực Webhook
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// Route để nhận sự kiện từ Messenger
app.post('/webhook', (req, res) => {
  const body = req.body;
  if (body.object === 'page') {
    // Phản hồi 200 OK ngay lập tức để Facebook không gửi lại sự kiện
    res.status(200).send('EVENT_RECEIVED'); 
    
    body.entry.forEach(entry => {
      const webhook_event = entry.messaging[0];
      const sender_psid = webhook_event.sender.id;
      
      // Chỉ xử lý nếu có tin nhắn và tin nhắn đó là văn bản
      if (webhook_event.message && webhook_event.message.text) {
        handleMessage(sender_psid, webhook_event.message.text);
      }
    });
  } else {
    res.sendStatus(404);
  }
});


// --- KHỞI ĐỘNG SERVER ---
app.listen(port, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${port}`);
  console.log("🚀 Webhook đang lắng nghe tại /webhook");
});
