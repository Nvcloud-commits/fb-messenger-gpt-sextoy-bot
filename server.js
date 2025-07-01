// server.js (ES Module)

import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ✅ Route test POST /chat
app.post('/chat', async (req, res) => {
  try {
    const userMessage = req.body.message || 'Xin chào!';
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Bạn là trợ lý chatbot." },
        { role: "user", content: userMessage }
      ]
    });

    const reply = completion.choices[0].message.content;
    console.log('💬 User:', userMessage);
    console.log('🤖 GPT:', reply);

    res.json({ reply });
  } catch (error) {
    console.error('❌ Lỗi GPT:', error.response?.data || error.message);
    res.status(500).send('Lỗi máy chủ');
  }
});

// ✅ Route webhook Facebook Messenger
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

app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    body.entry.forEach(async entry => {
      const webhook_event = entry.messaging[0];
      const sender_psid = webhook_event.sender.id;

      if (webhook_event.message && webhook_event.message.text) {
        const userMessage = webhook_event.message.text;

        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "system", content: "Bạn là trợ lý chatbot." },
              { role: "user", content: userMessage }
            ]
          });

          const reply = completion.choices[0].message.content;

          // Gửi lại tin nhắn cho user
          await callSendAPI(sender_psid, reply);
          console.log('💬 User:', userMessage);
          console.log('🤖 GPT:', reply);

        } catch (error) {
          console.error('❌ Lỗi GPT:', error.response?.data || error.message);
        }
      }
    });

    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

async function callSendAPI(sender_psid, response) {
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

  const request_body = {
    recipient: {
      id: sender_psid
    },
    message: {
      text: response
    }
  };

  await axios.post(`https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, request_body);
}

app.listen(port, () => {
  console.log(`✅ Server chạy tại http://localhost:${port}`);
});
