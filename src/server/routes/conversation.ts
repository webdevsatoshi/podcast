import { Router } from 'express';
import { ConversationService } from '../services/ConversationService.js';

const router = Router();
const conversationService = new ConversationService();

// Start the autonomous conversation
router.post('/start', async (_req, res) => {
  try {
    const result = await conversationService.startConversation();
    res.json(result);
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

// Get the next line of dialogue
router.get('/next', async (_req, res) => {
  try {
    const dialogue = await conversationService.getNextDialogue();
    res.json(dialogue);
  } catch (error) {
    console.error('Error getting next dialogue:', error);
    res.status(500).json({ error: 'Failed to get dialogue' });
  }
});

// Get current status
router.get('/status', (_req, res) => {
  const status = conversationService.getStatus();
  res.json(status);
});

// Stop the current conversation
router.post('/stop', (_req, res) => {
  conversationService.stop();
  res.json({ status: 'stopped' });
});

export const conversationRouter = router;
