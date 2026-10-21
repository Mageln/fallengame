import express from 'express';
import cors from 'cors';
import { userRouter } from './routes/user.js';
import { gameRouter } from './routes/game.js';
import { clanRouter } from './routes/clan.js';
import { shopRouter } from './routes/shop.js';
import { casinoRouter } from './routes/casino.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.VITE_APP_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/user', userRouter);
app.use('/api/game', gameRouter);
app.use('/clans', clanRouter);
app.use('/api/clans', clanRouter);
app.use('/api/clan', clanRouter);
app.use('/api/shop', shopRouter);
app.use('/api/casino', casinoRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
