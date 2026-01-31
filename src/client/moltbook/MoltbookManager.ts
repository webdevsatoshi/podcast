import { MoltbookPost } from '../ui/MoltbookScreen';

type PostCallback = (post: MoltbookPost) => void;

export class MoltbookManager {
  private pollInterval: number = 60000; // 1 minute client-side check
  private pollTimer: number | null = null;
  private listeners: PostCallback[] = [];
  private currentPost: MoltbookPost | null = null;
  private isRunning: boolean = false;

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log('[MoltbookManager] Starting with poll interval:', this.pollInterval, 'ms');

    // Fetch immediately on start
    this.fetchLatest();

    // Then poll at regular intervals
    this.pollTimer = window.setInterval(() => {
      this.fetchLatest();
    }, this.pollInterval);
  }

  stop(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.isRunning = false;
    console.log('[MoltbookManager] Stopped');
  }

  onNewPost(callback: PostCallback): void {
    this.listeners.push(callback);
  }

  removeListener(callback: PostCallback): void {
    const index = this.listeners.indexOf(callback);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  getCurrentPost(): MoltbookPost | null {
    return this.currentPost;
  }

  async forceRefresh(): Promise<MoltbookPost | null> {
    try {
      const response = await fetch('/api/moltbook/refresh', { method: 'POST' });
      const post = await response.json();

      if (post && post.title) {
        this.currentPost = post;
        this.notifyListeners(post);
        return post;
      }
    } catch (error) {
      console.error('[MoltbookManager] Force refresh error:', error);
    }
    return null;
  }

  private async fetchLatest(): Promise<void> {
    try {
      const response = await fetch('/api/moltbook/latest');

      if (!response.ok) {
        console.error('[MoltbookManager] Fetch failed:', response.status);
        return;
      }

      const post = await response.json();

      // Only notify if post is different from current
      if (post && post.title) {
        const isNew = !this.currentPost || post.title !== this.currentPost.title;

        if (isNew) {
          console.log('[MoltbookManager] New post:', post.title.substring(0, 50) + '...');
          this.currentPost = post;
          this.notifyListeners(post);
        }
      }
    } catch (error) {
      console.error('[MoltbookManager] Fetch error:', error);
      // Keep showing last post on error
    }
  }

  private notifyListeners(post: MoltbookPost): void {
    for (const listener of this.listeners) {
      try {
        listener(post);
      } catch (error) {
        console.error('[MoltbookManager] Listener error:', error);
      }
    }
  }

  // Utility: Set poll interval (in milliseconds)
  setPollInterval(ms: number): void {
    this.pollInterval = ms;

    // Restart polling if running
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }
}
