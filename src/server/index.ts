import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env FIRST
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

console.log('OPENROUTER_API_KEY loaded:', !!process.env.OPENROUTER_API_KEY);
console.log('DATABASE_URL loaded:', !!process.env.DATABASE_URL);

// Now dynamically import everything else AFTER env is loaded
async function main() {
  const express = (await import('express')).default;
  const cors = (await import('cors')).default;
  const { conversationRouter } = await import('./routes/conversation.js');
  const { moltbookRouter } = await import('./routes/moltbook.js');

  const app = express();
  app.use(cors());
  app.use(express.json());

  // API routes
  app.use('/api', conversationRouter);
  app.use('/api/moltbook', moltbookRouter);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

main().catch(console.error);
