require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
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

// Route test: Chat tiếng Việt trả về chuẩn UTF-8
app.post('/chat', async (req, res) => {
  try {
    // Đảm bảo header trả về UTF-8
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    const userMessage = req.body.message || 'Xin chào!';
    const completion = await openai.createChatCompletion({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Bạn là một trợ lý chatbot trả lời tự nhiên bằng tiếng Việt.' },
        { role: 'user', content: userMessage },
      ],
    });

    const reply = completion.data.choices[0].message.content;
    res.status(200).json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Đã có lỗi xảy ra.' });
  }
});

// Khởi động server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
