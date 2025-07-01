import OpenAI from "openai";
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message || 'Xin chào!';
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Bạn là trợ lý chatbot." },
        { role: "user", content: userMessage }
      ],
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error('Lỗi:', error);
    res.status(500).send('Lỗi máy chủ!');
  }
});

app.listen(port, () => {
  console.log(`✅ Server chạy tại http://localhost:${port}`);
});
