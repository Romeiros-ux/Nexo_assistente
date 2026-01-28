import express from 'express';

const app = express();
const PORT = 3002;

app.get('/test', (req, res) => {
  res.json({ message: 'Test OK' });
});

app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
});
