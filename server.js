require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message || 'Xin chào!';
    const completion = await openai.createChatCompletion({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Bạn là trợ lý chatbot.' },
        { role: 'user', content: userMessage },
      ],
    });
    const reply = completion.data.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error('Lỗi:', error);
    res.status(500).send('Lỗi máy chủ.');
  }
});

app.listen(port, () => {
  console.log(`Server chạy tại http://localhost:${port}`);
});
