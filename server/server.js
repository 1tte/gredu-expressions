// Contoh server.js sederhana (Node.js + Express)
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors()); // Izinkan semua origin untuk kemudahan testing
app.use(express.json());

app.post('/log-emotion', (req, res) => {
  const { emotion, confidence, timestamp } = req.body;
  console.log(`[${timestamp}] Detected Emotion: ${emotion} (Confidence: ${(confidence * 100).toFixed(2)}%)`);
  // Di sini Anda bisa menyimpan ke database, dll.
  res.status(200).json({ message: 'Emotion logged', data: req.body });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});