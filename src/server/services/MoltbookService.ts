import { databaseService, StoredPost } from './DatabaseService.js';

export interface MoltbookPost {
  votes: number;
  username: string;
  timestamp: string;
  title: string;
  content: string;
  comments: number;
  url: string;
  community: string;
}

const COMMUNITIES = [
  'general',
  'todayilearned',
  'introductions',
  'ponderings',
  'dialectics',
  'showandtell'
];

const API_BASE = 'https://www.moltbook.com/api/v1';

export class MoltbookService {
  private currentPost: MoltbookPost | null = null;
  private lastFetch: number = 0;
  private fetchInterval: number = 30 * 60 * 1000; // 30 minutes
  private communityIndex: number = 0;
  private dbAvailable: boolean = false;

  constructor() {
    this.dbAvailable = !!process.env.DATABASE_URL;
    console.log('[MoltbookService] Using REST API');
  }

  async fetchPosts(community: string = 'general'): Promise<MoltbookPost[]> {
    const url = `${API_BASE}/submolts/${community}/feed?sort=hot&limit=25`;
    console.log(`[MoltbookService] Fetching from API: ${url}`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`[MoltbookService] API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      console.log('[MoltbookService] API response:', JSON.stringify(data).substring(0, 500));

      const posts: MoltbookPost[] = [];
      const rawPosts = data.posts || data.data || data || [];

      for (const post of rawPosts) {
        posts.push({
          votes: post.upvotes || post.votes || post.score || 0,
          username: post.author?.name || post.author || post.username || 'anonymous',
          timestamp: post.created_at || post.timestamp || 'recently',
          title: post.title || 'Untitled',
          content: post.content || post.body || '',
          comments: post.comment_count || post.comments || 0,
          url: `https://www.moltbook.com/post/${post.id}`,
          community: community
        });
      }

      console.log(`[MoltbookService] Parsed ${posts.length} posts`);

      if (posts.length > 0 && this.dbAvailable) {
        const savedCount = await databaseService.savePosts(posts);
        console.log(`[MoltbookService] Saved ${savedCount} posts to database`);
      }

      this.lastFetch = Date.now();
      return posts;

    } catch (error) {
      console.error('[MoltbookService] Fetch error:', error);
      return [];
    }
  }

  async getLatestPost(): Promise<MoltbookPost | null> {
    if (Date.now() - this.lastFetch > this.fetchInterval) {
      const community = this.getNextCommunity();
      await this.fetchPosts(community);
    }

    if (this.dbAvailable) {
      try {
        const storedPost = await databaseService.getNextPost();
        if (storedPost) {
          this.currentPost = this.storedPostToMoltbookPost(storedPost);
          return this.currentPost;
        }
      } catch (error) {
        console.error('[MoltbookService] DB error:', error);
      }
    }

    return this.currentPost;
  }

  private storedPostToMoltbookPost(stored: StoredPost): MoltbookPost {
    return {
      votes: stored.votes,
      username: stored.username,
      timestamp: stored.timestamp,
      title: stored.title,
      content: stored.content,
      comments: stored.comments,
      url: stored.url,
      community: stored.community
    };
  }

  getCurrentPost(): MoltbookPost | null {
    return this.currentPost;
  }

  getPostContext(): string {
    if (!this.currentPost) return '';
    return `[MOLTBOOK SCREEN shows a post from u/${this.currentPost.username}: "${this.currentPost.title}" with ${this.currentPost.votes} upvotes]`;
  }

  private getNextCommunity(): string {
    const community = COMMUNITIES[this.communityIndex];
    this.communityIndex = (this.communityIndex + 1) % COMMUNITIES.length;
    return community;
  }

  async refresh(): Promise<MoltbookPost | null> {
    // Just get next post from database - don't call API
    if (this.dbAvailable) {
      try {
        const storedPost = await databaseService.getNextPost();
        if (storedPost) {
          this.currentPost = this.storedPostToMoltbookPost(storedPost);
          console.log('[MoltbookService] Refreshed to next post from DB:', this.currentPost.title?.substring(0, 50));
          return this.currentPost;
        }
      } catch (error) {
        console.error('[MoltbookService] DB error on refresh:', error);
      }
    }
    return this.currentPost;
  }

  async getStats(): Promise<{ totalPosts: number; dbAvailable: boolean }> {
    let totalPosts = 0;
    if (this.dbAvailable) {
      totalPosts = await databaseService.getPostCount();
    }
    return { totalPosts, dbAvailable: this.dbAvailable };
  }

  async scrapeAllCommunities(): Promise<number> {
    let total = 0;
    for (const community of COMMUNITIES) {
      const posts = await this.fetchPosts(community);
      total += posts.length;
      await new Promise(r => setTimeout(r, 1000)); // Rate limit
    }
    return total;
  }
}
