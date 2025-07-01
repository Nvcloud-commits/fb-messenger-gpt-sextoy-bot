/**
 * FB Messenger GPT Bot - Phiên bản UTF-8, Chat tự nhiên
 * Author: Dave (ChatGPT)
 */

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
const port = process.env.PORT || 3000;

// Middleware xử lý JSON
app.use(bodyParser.json());

// 👉 Khởi tạo OpenAI với API key
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// 👉 Route kiểm tra server hoạt động
app.get('/', (req, res) => {
  res.send('✅ Bot FB Messenger GPT đã sẵn sàng.');
});

// 👉 Route nhận tin nhắn từ Messenger
app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message || 'Xin chào!';

    // Gọi OpenAI Chat Completion với tone tự nhiên
    const completion = await openai.createChatCompletion({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Bạn là chatbot tư vấn sextoy. Trả lời bằng tiếng Việt tự nhiên, linh hoạt, giọng thân thiện.
          Hãy xưng 'chị yêu' nếu nói với khách nữ, 'anh yêu' nếu khách nam. Luôn tôn trọng và không robot.`
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      temperature: 0.7, // thêm chút sáng tạo
    });

    const reply = completion.data.choices[0].message.content.trim();
    console.log(`[User]: ${userMessage}`);
    console.log(`[Bot]: ${reply}`);

    res.json({ reply });

  } catch (error) {
    console.error('❌ Lỗi:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Đã có lỗi xảy ra, thử lại sau.' });
  }
});

// 👉 Server listen
app.listen(port, () => {
  console.log(`🚀 Server running tại http://localhost:${port}`);
});
