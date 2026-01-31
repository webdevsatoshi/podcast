import { AIService, BOSS_PERSONA, GIRL_PERSONA, Persona } from './AIService.js';
import { MoltbookService, MoltbookPost } from './MoltbookService.js';

export interface DialogueLine {
  speaker: 'boss' | 'girl';
  speakerName: string;
  text: string;
  turnNumber: number;
  newPost?: MoltbookPost;
}

interface ConversationHistoryEntry {
  speaker: 'Agent 1' | 'Agent 2';
  text: string;
}

interface ConversationState {
  history: ConversationHistoryEntry[];
  currentSpeaker: 'boss' | 'girl';
  turnCount: number;
  isActive: boolean;
  pendingResponse: DialogueLine | null;
  isGenerating: boolean;
  postShownAt: number | null;
  // Post locking system
  lockedPost: MoltbookPost | null;  // Snapshot of post - AI always uses this
  postLocked: boolean;               // Prevents any post changes while true
  // Track previous post to detect changes
  previousPost: MoltbookPost | null;
  postJustChanged: boolean;          // Flag for when post changes
}

export class ConversationService {
  private state: ConversationState;
  private aiService: AIService | null = null;
  private moltbookService: MoltbookService;

  constructor() {
    this.state = this.getInitialState();
    this.moltbookService = new MoltbookService();
  }

  private getAIService(): AIService {
    if (!this.aiService) {
      this.aiService = new AIService();
    }
    return this.aiService;
  }

  private readonly POST_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

  private getInitialState(): ConversationState {
    return {
      history: [],
      currentSpeaker: 'boss',
      turnCount: 0,
      isActive: false,
      pendingResponse: null,
      isGenerating: false,
      postShownAt: null,
      lockedPost: null,
      postLocked: false,
      previousPost: null,
      postJustChanged: false
    };
  }

  // Clean AI response text
  private cleanResponse(text: string): string {
    // Remove any stray [NEXT_POST] if AI still says it
    return text.replace(/\[NEXT_POST\]/gi, '').trim();
  }

  // Check if post timer has expired
  private isPostTimedOut(): boolean {
    if (!this.state.postShownAt) return false;
    return Date.now() - this.state.postShownAt >= this.POST_TIMEOUT_MS;
  }

  // Reset post timer
  private resetPostTimer(): void {
    this.state.postShownAt = Date.now();
  }

  // Lock the current post - creates a snapshot that AI will use
  private lockPost(post: MoltbookPost | null): void {
    if (post) {
      // Deep copy to create snapshot
      this.state.lockedPost = { ...post };
      this.state.postLocked = true;
      console.log('[ConversationService] Post LOCKED:', post.title?.substring(0, 50));
    }
  }

  // Unlock and advance to next post
  private async advancePost(): Promise<MoltbookPost | null> {
    // Save current post as previous before advancing
    this.state.previousPost = this.state.lockedPost ? { ...this.state.lockedPost } : null;

    // Unlock first
    this.state.postLocked = false;

    const newPost = await this.moltbookService.refresh();
    this.resetPostTimer();

    // Lock the new post
    if (newPost) {
      this.lockPost(newPost);
      // Mark that post just changed - next response should acknowledge it
      this.state.postJustChanged = true;
    }

    console.log('[ConversationService] Advanced to new post:', newPost?.title?.substring(0, 50));
    return newPost;
  }

  // Get the locked post for AI prompts (never changes mid-conversation)
  private getLockedPost(): MoltbookPost | null {
    return this.state.lockedPost;
  }

  // Build conversation history string for the prompt
  private buildConversationHistory(): string {
    if (this.state.history.length === 0) {
      return '(conversation just started)';
    }

    // Get last 20 lines of history
    const recentHistory = this.state.history.slice(-20);
    return recentHistory
      .map(entry => `${entry.speaker}: ${entry.text}`)
      .join('\n');
  }

  // Build current post context string
  private buildCurrentPostContext(post: MoltbookPost | null, postJustChanged: boolean): string {
    if (!post) {
      return '(no post on screen yet)';
    }

    let context = `@${post.username}: "${post.title}"
${post.content}
(${post.votes} upvotes, ${post.comments} comments)`;

    // If post just changed, tell the agent to notice and react
    if (postJustChanged) {
      context += `\n\n[THE SCREEN JUST CHANGED TO THIS NEW POST - acknowledge the new post naturally, like "oh look, new post" or "okay what do we have here"]`;
    }

    return context;
  }

  async startConversation(): Promise<{ status: string }> {
    this.state = this.getInitialState();
    this.state.isActive = true;
    this.resetPostTimer();

    // Fetch and LOCK the initial post immediately
    const initialPost = await this.moltbookService.getLatestPost();
    if (initialPost) {
      this.lockPost(initialPost);
      console.log('[ConversationService] Initial post LOCKED on start:', initialPost.title?.substring(0, 50));
    }

    // Now generate first response (post is already locked)
    this.generateNextResponse();

    return { status: 'started' };
  }

  async getNextDialogue(): Promise<DialogueLine | { waiting: true }> {
    if (!this.state.isActive) {
      await this.startConversation();
    }

    if (this.state.pendingResponse) {
      const response = this.state.pendingResponse;
      this.state.pendingResponse = null;

      // Start generating next response
      this.generateNextResponse();
      return response;
    }

    if (this.state.isGenerating) {
      return { waiting: true };
    }

    await this.generateNextResponse();

    if (this.state.pendingResponse) {
      const response = this.state.pendingResponse;
      this.state.pendingResponse = null;
      this.generateNextResponse();
      return response;
    }

    return { waiting: true };
  }

  private async generateNextResponse(): Promise<void> {
    if (this.state.isGenerating) {
      return;
    }

    this.state.isGenerating = true;

    try {
      const isFirstTurn = this.state.turnCount === 0;

      // 1. Ensure we have a locked post (should already be locked from startConversation)
      if (!this.state.lockedPost) {
        console.log('[ConversationService] WARNING: No locked post, fetching one now...');
        const post = await this.moltbookService.getLatestPost();
        if (post) {
          this.lockPost(post);
        }
      }

      // 2. ALWAYS use the locked post for AI prompts - NEVER call getLatestPost() again
      const postForAI = this.getLockedPost();

      // Check if post just changed (from previous turn's advance)
      const postJustChanged = this.state.postJustChanged;

      console.log('[ConversationService] Turn', this.state.turnCount, '- using LOCKED post:', postForAI?.title?.substring(0, 50), postJustChanged ? '(JUST CHANGED)' : '');

      // 3. Build prompt using the LOCKED post (with change indicator if applicable)
      const persona = this.getCurrentPersona();
      const conversationHistory = this.buildConversationHistory();
      const postContext = this.buildCurrentPostContext(postForAI, postJustChanged);

      // Reset the flag after building context - only first response after change should acknowledge it
      this.state.postJustChanged = false;

      // 4. Generate AI response about the LOCKED post
      const rawResponse = await this.getAIService().generateResponse(
        persona,
        conversationHistory,
        postContext
      );

      // 5. Clean the response (remove any stray [NEXT_POST] if AI still says it)
      const cleanText = this.cleanResponse(rawResponse);

      // 6. Determine what to send to client
      let newPostForClient: MoltbookPost | null = null;

      // First turn: send locked post to client so screen displays it
      if (isFirstTurn) {
        newPostForClient = postForAI;
        console.log('[ConversationService] First turn - sending locked post to client');
      }
      // Only advance post on timeout - unlocks, fetches new, and re-locks
      else if (this.isPostTimedOut()) {
        console.log('[ConversationService] Post timed out, advancing and locking new post...');
        newPostForClient = await this.advancePost();
      }

      // Add cleaned response to history
      if (cleanText && cleanText.length > 0) {
        this.state.history.push({
          speaker: persona.name as 'Agent 1' | 'Agent 2',
          text: cleanText
        });
      }

      this.state.turnCount++;

      // 6. Return response
      // - text: AI talking about postForThisTurn (what was on screen)
      // - newPost: if set, client updates screen (for next turn)
      this.state.pendingResponse = {
        speaker: this.state.currentSpeaker,
        speakerName: persona.name,
        text: cleanText,
        turnNumber: this.state.turnCount,
        newPost: newPostForClient || undefined
      };

      console.log('[ConversationService] Response ready:', {
        speaker: persona.name,
        textPreview: cleanText.substring(0, 50) + '...',
        sendingNewPost: !!newPostForClient
      });

      // Switch to other speaker
      this.state.currentSpeaker = this.state.currentSpeaker === 'boss' ? 'girl' : 'boss';

      // Cap history length
      if (this.state.history.length > 40) {
        this.state.history = this.state.history.slice(-40);
      }

    } catch (error) {
      console.error('Error generating response:', error);
    } finally {
      this.state.isGenerating = false;
    }
  }

  private getCurrentPersona(): Persona {
    return this.state.currentSpeaker === 'boss' ? BOSS_PERSONA : GIRL_PERSONA;
  }

  getStatus(): { isActive: boolean; turnCount: number } {
    return {
      isActive: this.state.isActive,
      turnCount: this.state.turnCount
    };
  }

  stop(): void {
    this.state.isActive = false;
  }
}
