// server.js
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Verify webhook
app.get('/webhook', (req, res) => {
  if (
    req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === process.env.VERIFY_TOKEN
  ) {
    console.log('Webhook verified!');
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.sendStatus(403);
  }
});

// Receive messages
app.post('/webhook', (req, res) => {
  console.log('Received POST:', JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

// Start server
app.listen(PORT, () => {
  console.log(`Webhook server is listening on port ${PORT}`);
});
