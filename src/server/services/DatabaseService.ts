import { neon, NeonQueryFunction } from '@neondatabase/serverless';

export interface StoredPost {
  id: number;
  url: string;
  votes: number;
  username: string;
  timestamp: string;
  title: string;
  content: string;
  comments: number;
  community: string;
  shown_count: number;
  last_shown_at: Date | null;
  created_at: Date;
}

export class DatabaseService {
  private sql: NeonQueryFunction<false, false> | null = null;
  private initialized = false;

  private getSql(): NeonQueryFunction<false, false> {
    if (!this.sql) {
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL not set in environment');
      }
      this.sql = neon(dbUrl);
    }
    return this.sql;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const sql = this.getSql();

    // Create the posts table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS moltbook_posts (
        id SERIAL PRIMARY KEY,
        url TEXT UNIQUE NOT NULL,
        votes INTEGER DEFAULT 0,
        username TEXT,
        timestamp TEXT,
        title TEXT NOT NULL,
        content TEXT,
        comments INTEGER DEFAULT 0,
        community TEXT DEFAULT 'general',
        shown_count INTEGER DEFAULT 0,
        last_shown_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create index for efficient querying of least-shown posts
    await sql`
      CREATE INDEX IF NOT EXISTS idx_moltbook_shown
      ON moltbook_posts (shown_count ASC, last_shown_at ASC NULLS FIRST)
    `;

    this.initialized = true;
    console.log('[DatabaseService] Initialized moltbook_posts table');
  }

  async savePost(post: {
    url: string;
    votes: number;
    username: string;
    timestamp: string;
    title: string;
    content: string;
    comments: number;
    community: string;
  }): Promise<StoredPost | null> {
    await this.initialize();
    const sql = this.getSql();

    try {
      // Upsert - insert or update if URL exists
      const result = await sql`
        INSERT INTO moltbook_posts (url, votes, username, timestamp, title, content, comments, community)
        VALUES (${post.url}, ${post.votes}, ${post.username}, ${post.timestamp}, ${post.title}, ${post.content}, ${post.comments}, ${post.community})
        ON CONFLICT (url) DO UPDATE SET
          votes = ${post.votes},
          timestamp = ${post.timestamp},
          comments = ${post.comments}
        RETURNING *
      ` as unknown as StoredPost[];
      return result[0];
    } catch (error) {
      console.error('[DatabaseService] Error saving post:', error);
      return null;
    }
  }

  async savePosts(posts: Array<{
    url: string;
    votes: number;
    username: string;
    timestamp: string;
    title: string;
    content: string;
    comments: number;
    community: string;
  }>): Promise<number> {
    let savedCount = 0;
    for (const post of posts) {
      const saved = await this.savePost(post);
      if (saved) savedCount++;
    }
    console.log(`[DatabaseService] Saved ${savedCount} posts`);
    return savedCount;
  }

  async getNextPost(): Promise<StoredPost | null> {
    await this.initialize();
    const sql = this.getSql();

    try {
      // Get the post that has been shown the least, preferring ones never shown
      const result = await sql`
        SELECT * FROM moltbook_posts
        ORDER BY shown_count ASC, last_shown_at ASC NULLS FIRST
        LIMIT 1
      ` as unknown as StoredPost[];

      if (result.length === 0) return null;

      const post = result[0];

      // Mark this post as shown
      await sql`
        UPDATE moltbook_posts
        SET shown_count = shown_count + 1, last_shown_at = NOW()
        WHERE id = ${post.id}
      `;

      return post;
    } catch (error) {
      console.error('[DatabaseService] Error getting next post:', error);
      return null;
    }
  }

  async getRandomPost(): Promise<StoredPost | null> {
    await this.initialize();
    const sql = this.getSql();

    try {
      // Get a random post, weighted towards less-shown posts
      const result = await sql`
        SELECT * FROM moltbook_posts
        ORDER BY RANDOM()
        LIMIT 1
      ` as unknown as StoredPost[];

      if (result.length === 0) return null;

      const post = result[0];

      // Mark this post as shown
      await sql`
        UPDATE moltbook_posts
        SET shown_count = shown_count + 1, last_shown_at = NOW()
        WHERE id = ${post.id}
      `;

      return post;
    } catch (error) {
      console.error('[DatabaseService] Error getting random post:', error);
      return null;
    }
  }

  async getPostCount(): Promise<number> {
    await this.initialize();
    const sql = this.getSql();

    try {
      const result = await sql`SELECT COUNT(*) as count FROM moltbook_posts` as unknown as Array<{count: string}>;
      return parseInt(result[0].count);
    } catch (error) {
      console.error('[DatabaseService] Error getting post count:', error);
      return 0;
    }
  }

  async getAllPosts(): Promise<StoredPost[]> {
    await this.initialize();
    const sql = this.getSql();

    try {
      const result = await sql`
        SELECT * FROM moltbook_posts
        ORDER BY created_at DESC
      ` as unknown as StoredPost[];
      return result;
    } catch (error) {
      console.error('[DatabaseService] Error getting all posts:', error);
      return [];
    }
  }

  async resetShownCounts(): Promise<void> {
    await this.initialize();
    const sql = this.getSql();

    try {
      await sql`UPDATE moltbook_posts SET shown_count = 0, last_shown_at = NULL`;
      console.log('[DatabaseService] Reset all shown counts');
    } catch (error) {
      console.error('[DatabaseService] Error resetting shown counts:', error);
    }
  }
}

// Singleton instance
export const databaseService = new DatabaseService();
