/**
 * FB Messenger GPT Bot - Phiên bản chuẩn UTF-8
 * Author: Dave (ChatGPT)
 */

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Cấu hình OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Test route: Gửi câu hỏi và nhận câu trả lời tiếng Việt
app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message || 'Xin chào!';

    const completion = await openai.createChatCompletion({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Bạn là một chatbot trả lời bằng tiếng Việt, giọng điệu tự nhiên, lịch sự, gọi khách là "chị yêu" nếu là khách hàng nữ.`
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
    });

    const reply = completion.data.choices[0].message.content;
    res.json({ reply });

  } catch (error) {
    console.error(error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Đã có lỗi xảy ra.' });
  }
});

// Route test đơn giản
app.get('/', (req, res) => {
  res.send('Bot FB Messenger GPT chạy OK.');
});

app.listen(port, () => {
  console.log(`✅ Server đang chạy tại http://localhost:${port}`);
});
