import { Router } from 'express';
import { MoltbookService } from '../services/MoltbookService.js';

const router = Router();
const moltbookService = new MoltbookService();

// GET /posts - get all cached posts (optionally filtered by community)
router.get('/posts', async (req, res) => {
  try {
    const community = (req.query.community as string) || 'general';
    const posts = await moltbookService.fetchPosts(community);
    res.json(posts);
  } catch (error) {
    console.error('Moltbook fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// GET /latest - get the current displayed post
router.get('/latest', async (_req, res) => {
  try {
    const post = await moltbookService.getLatestPost();
    res.json(post);
  } catch (error) {
    console.error('Moltbook latest error:', error);
    res.status(500).json({ error: 'Failed to get latest post' });
  }
});

// POST /refresh - force refresh the current post
router.post('/refresh', async (_req, res) => {
  try {
    const post = await moltbookService.refresh();
    res.json(post);
  } catch (error) {
    console.error('Moltbook refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh' });
  }
});

// GET /context - get the AI context string for the current post
router.get('/context', (_req, res) => {
  const context = moltbookService.getPostContext();
  res.json({ context });
});

// GET /stats - get stats about stored posts
router.get('/stats', async (_req, res) => {
  try {
    const stats = await moltbookService.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Moltbook stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// POST /scrape-all - scrape all communities and store posts
router.post('/scrape-all', async (_req, res) => {
  try {
    console.log('[MoltbookRouter] Starting full scrape of all communities...');
    const totalScraped = await moltbookService.scrapeAllCommunities();
    const stats = await moltbookService.getStats();
    res.json({
      message: `Scraped ${totalScraped} posts from all communities`,
      totalScraped,
      totalInDb: stats.totalPosts
    });
  } catch (error) {
    console.error('Moltbook scrape-all error:', error);
    res.status(500).json({ error: 'Failed to scrape all communities' });
  }
});

export const moltbookRouter = router;

// Export the service instance for use in ConversationService
export { moltbookService };
