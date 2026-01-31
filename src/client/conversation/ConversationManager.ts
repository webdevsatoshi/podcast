import { MoltbookPost } from '../ui/MoltbookScreen';

export interface DialogueLine {
  speaker: 'boss' | 'girl';
  speakerName: string;
  text: string;
  turnNumber: number;
  newPost?: MoltbookPost;
}

type DialogueCallback = (dialogue: DialogueLine) => void;
type PostChangeCallback = (post: MoltbookPost) => void;

export class ConversationManager {
  private pollInterval: number = 2000;
  private pollTimer: number | null = null;
  private dialogueListeners: DialogueCallback[] = [];
  private postChangeListeners: PostChangeCallback[] = [];
  private isActive: boolean = false;
  private isPaused: boolean = false;
  private isWaitingForAnimation: boolean = false;

  async startConversation(): Promise<boolean> {
    try {
      const response = await fetch('/api/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        console.error('Failed to start conversation');
        return false;
      }

      this.isActive = true;
      this.isPaused = false;
      this.startPolling();
      return true;
    } catch (error) {
      console.error('Error starting conversation:', error);
      return false;
    }
  }

  onDialogue(callback: DialogueCallback): void {
    this.dialogueListeners.push(callback);
  }

  onPostChange(callback: PostChangeCallback): void {
    this.postChangeListeners.push(callback);
  }

  private notifyPostChange(post: MoltbookPost): void {
    for (const listener of this.postChangeListeners) {
      listener(post);
    }
  }

  private startPolling(): void {
    this.poll();

    this.pollTimer = window.setInterval(() => {
      if (!this.isPaused && !this.isWaitingForAnimation) {
        this.poll();
      }
    }, this.pollInterval);
  }

  private async poll(): Promise<void> {
    if (!this.isActive || this.isWaitingForAnimation) {
      console.log('[ConversationManager] Poll skipped - active:', this.isActive, 'waiting:', this.isWaitingForAnimation);
      return;
    }

    console.log('[ConversationManager] Polling /api/next...');
    try {
      const response = await fetch('/api/next');
      const data = await response.json();

      if ('waiting' in data && data.waiting) {
        console.log('[ConversationManager] Server says waiting...');
        return;
      }

      const dialogue = data as DialogueLine;

      // If response includes a new post, notify listeners
      if (dialogue.newPost) {
        console.log('[ConversationManager] New post received:', dialogue.newPost.title?.substring(0, 50));
        this.notifyPostChange(dialogue.newPost);
      }

      // DialogueLine with speaker info
      this.isWaitingForAnimation = true;
      this.notifyDialogue(dialogue);
    } catch (error) {
      console.error('Polling error:', error);
    }
  }

  dialogueComplete(): void {
    console.log('[ConversationManager] dialogueComplete() - resuming polling');
    this.isWaitingForAnimation = false;
  }

  private notifyDialogue(dialogue: DialogueLine): void {
    for (const listener of this.dialogueListeners) {
      listener(dialogue);
    }
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  togglePause(): boolean {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  stop(): void {
    this.isActive = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  isRunning(): boolean {
    return this.isActive && !this.isPaused;
  }
}
