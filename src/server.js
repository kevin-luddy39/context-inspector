const express = require('express');
const path = require('path');
const { analyzeContext } = require('./core/analyzer');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'web')));

app.post('/api/analyze', (req, res) => {
  const { text, chunkSize } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  const result = analyzeContext(text, { chunkSize: chunkSize || 500 });
  res.json(result);
});

app.listen(PORT, () => console.log(`Context Inspector UI at http://localhost:${PORT}`));
