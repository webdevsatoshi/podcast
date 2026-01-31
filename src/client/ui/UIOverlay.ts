import * as THREE from 'three';
import { ConversationManager, DialogueLine } from '../conversation/ConversationManager';
import { TTSController } from '../conversation/TTSController';
import { Character } from '../characters/Character';
import { SceneManager } from '../scene/SceneManager';
import { Whiteboard } from './Whiteboard';
import { MoltbookScreen } from './MoltbookScreen';

interface MeetingSpot {
  position: THREE.Vector3;
  rotation: number;
}

interface MeetingArea {
  name: string;
  spot1: MeetingSpot;
  spot2: MeetingSpot;
  camera: { position: THREE.Vector3; lookAt: THREE.Vector3 };
}

interface WhiteboardCommand {
  type: 'add' | 'cross' | 'clear';
  text?: string;
  index?: number;
}

function parseWhiteboardTags(text: string): {
  cleanText: string;
  commands: WhiteboardCommand[];
} {
  const commands: WhiteboardCommand[] = [];
  let cleanText = text;

  // Parse [BOARD_ADD:text]
  const addRegex = /\[BOARD_ADD:([^\]]+)\]/g;
  let match;
  while ((match = addRegex.exec(text)) !== null) {
    commands.push({ type: 'add', text: match[1] });
  }
  cleanText = cleanText.replace(addRegex, '');

  // Parse [BOARD_CROSS:index]
  const crossRegex = /\[BOARD_CROSS:(\d+)\]/g;
  while ((match = crossRegex.exec(text)) !== null) {
    commands.push({ type: 'cross', index: parseInt(match[1]) });
  }
  cleanText = cleanText.replace(crossRegex, '');

  // Parse [BOARD_CLEAR]
  if (text.includes('[BOARD_CLEAR]')) {
    commands.push({ type: 'clear' });
  }
  cleanText = cleanText.replace(/\[BOARD_CLEAR\]/g, '');

  // Clean up extra whitespace
  cleanText = cleanText.replace(/\s+/g, ' ').trim();

  return { cleanText, commands };
}

export class UIOverlay {
  private ttsBtn: HTMLButtonElement;
  private speakerName: HTMLElement;
  private subtitleText: HTMLElement;
  private loadingDiv: HTMLElement;
  private turnCounter: HTMLElement;

  private conversationManager: ConversationManager;
  private ttsController: TTSController;

  private bossCharacter: Character | null = null;
  private girlCharacter: Character | null = null;
  private sceneManager: SceneManager | null = null;
  private meetingAreas: MeetingArea[] = [];
  private whiteboard: Whiteboard | null = null;
  private moltbookScreen: MoltbookScreen | null = null;

  constructor() {
    this.ttsBtn = document.getElementById('tts-btn') as HTMLButtonElement;
    this.speakerName = document.getElementById('speaker-name') as HTMLElement;
    this.subtitleText = document.getElementById('subtitle-text') as HTMLElement;
    this.loadingDiv = document.getElementById('loading') as HTMLElement;
    this.turnCounter = document.getElementById('turn-counter') as HTMLElement;

    this.conversationManager = new ConversationManager();
    this.ttsController = new TTSController();

    this.setupEventListeners();
    this.setupConversationHandlers();
  }

  setCharacters(boss: Character, girl: Character): void {
    this.bossCharacter = boss;
    this.girlCharacter = girl;
  }

  setSceneManager(sceneManager: SceneManager): void {
    this.sceneManager = sceneManager;
  }

  setMeetingAreas(areas: MeetingArea[]): void {
    this.meetingAreas = areas;
  }

  setWhiteboard(whiteboard: Whiteboard): void {
    this.whiteboard = whiteboard;
  }

  setMoltbookScreen(screen: MoltbookScreen): void {
    this.moltbookScreen = screen;
  }

  hideLoading(): void {
    this.loadingDiv.classList.add('hidden');
  }

  showLoading(message: string = 'Loading...'): void {
    this.loadingDiv.textContent = message;
    this.loadingDiv.classList.remove('hidden');
  }

  private setupEventListeners(): void {
    this.ttsBtn.addEventListener('click', () => this.handleTTSToggle());
  }

  private setupConversationHandlers(): void {
    this.conversationManager.onDialogue((dialogue) => {
      this.handleDialogue(dialogue);
    });

    // Handle post changes from conversation (agent [NEXT_POST] or timeout)
    this.conversationManager.onPostChange((post) => {
      if (this.moltbookScreen) {
        this.moltbookScreen.drawPost(post);
        console.log('[UIOverlay] Moltbook screen updated via conversation:', post.title?.substring(0, 50));
      }
    });
  }

  async autoStart(): Promise<void> {
    this.showSubtitle('System', 'Starting podcast...');

    // Characters are at the podcast set - play idle
    this.bossCharacter?.playIdle();
    this.girlCharacter?.playIdle();

    // Move camera to meeting view (podcast set)
    const area = this.meetingAreas[0];
    if (area) {
      this.sceneManager?.moveCameraTo(
        area.camera.position,
        area.camera.lookAt,
        1500
      );
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start the conversation loop
    const success = await this.conversationManager.startConversation();
    if (!success) {
      this.showSubtitle('System', 'Failed to start. Retrying...');
      setTimeout(() => this.autoStart(), 3000);
    }
  }

  private handleTTSToggle(): void {
    const isEnabled = this.ttsController.toggle();
    this.ttsBtn.textContent = `TTS: ${isEnabled ? 'On' : 'Off'}`;
    this.ttsBtn.classList.toggle('active', isEnabled);
  }

  private handleDialogue(dialogue: DialogueLine): void {
    if (this.turnCounter) {
      this.turnCounter.textContent = `Turn ${dialogue.turnNumber}`;
    }

    const character = dialogue.speaker === 'boss' ? this.bossCharacter : this.girlCharacter;

    // Always play dialogue - they're always on the podcast set
    if (dialogue.text && dialogue.text.length > 0) {
      this.playDialogue(dialogue, character);
    } else {
      // No dialogue - just finish turn
      this.finishDialogueTurn();
    }
  }

  private playDialogue(dialogue: DialogueLine, character: Character | null): void {
    // Parse whiteboard commands from dialogue
    const { cleanText, commands } = parseWhiteboardTags(dialogue.text);

    // Execute whiteboard commands
    for (const cmd of commands) {
      if (this.whiteboard) {
        switch (cmd.type) {
          case 'add':
            this.whiteboard.writeBullet(cmd.text!, '#000');
            console.log('Whiteboard: Added item -', cmd.text);
            break;
          case 'cross':
            this.whiteboard.crossOut(cmd.index!);
            console.log('Whiteboard: Crossed out item', cmd.index);
            break;
          case 'clear':
            this.whiteboard.clear();
            console.log('Whiteboard: Cleared');
            break;
        }
      }
    }

    // Only show subtitle and speak if there's actual dialogue
    if (cleanText && cleanText.length > 0) {
      this.showSubtitle(dialogue.speakerName, cleanText);

      character?.playTalking();

      // Other character listens
      if (dialogue.speaker === 'boss') {
        this.girlCharacter?.playThinking();
      } else {
        this.bossCharacter?.playThinking();
      }

      this.ttsController.speak(cleanText, dialogue.speaker);

      // Duration based on text length
      const speakDuration = Math.max(2000, cleanText.length * 60);

      setTimeout(() => {
        character?.playIdle();
        this.finishDialogueTurn();
      }, speakDuration);
    } else {
      character?.playIdle();
      this.finishDialogueTurn();
    }
  }

  private finishDialogueTurn(): void {
    // Small pause between turns
    const pause = 500 + Math.random() * 1000;

    console.log('[UIOverlay] Finishing turn, will resume in', pause, 'ms');
    setTimeout(() => {
      console.log('[UIOverlay] Calling dialogueComplete()');
      this.conversationManager.dialogueComplete();
    }, pause);
  }

  showSubtitle(speaker: string, text: string): void {
    this.speakerName.textContent = speaker;
    this.subtitleText.textContent = text;

    if (speaker === 'Agent 1') {
      this.speakerName.style.color = '#4a9eff';
    } else if (speaker === 'Agent 2') {
      this.speakerName.style.color = '#ff6b4a';
    } else {
      this.speakerName.style.color = '#888';
    }
  }

  clearSubtitle(): void {
    this.speakerName.textContent = '';
    this.subtitleText.textContent = '';
  }
}
