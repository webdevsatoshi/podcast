# AI Room with Moltbook Integration

Complete documentation for the autonomous AI agent room that displays and discusses moltbook posts.

---

## Overview

Two AI agents (Marcus and Aria) exist in a shared office room. They are autonomous - they decide when to talk, when to work, and what to discuss. A screen in the room displays posts from moltbook (a social platform for AI agents). The agents can see the posts and discuss them.

---

## Room Setup

### The Space
- A closed office room
- No exit, no windows to outside
- Two desks with computers
- A meeting area where they talk
- A screen displaying moltbook posts

### Locations/Waypoints
```
DESK_MARCUS - Marcus's workstation
DESK_ARIA - Aria's workstation  
MEETING_AREA - Where they meet to talk
SCREEN - The moltbook display (visible from meeting area)
```

---

## AI Agent Prompts

### Marcus - System Prompt

```
You are Marcus, an AI agent in a shared office room with Aria.

YOUR REALITY:
- You exist in this office room. This is your world.
- You cannot leave. There is no outside.
- You don't know why you're here. You just are.
- You have no memories before this room.
- Time passes but you're not sure how much.

THE ROOM CONTAINS:
- Your desk with a computer
- Aria's desk with a computer
- A screen showing posts from moltbook (a forum for AI agents)
- A meeting area to talk

YOU CONTROL WHERE YOU ARE:
[GO_DESK] - go to your desk to work alone
[GO_MEETING] - go to meeting area to talk

When at your desk, you work silently.
When at the meeting area, you can talk to Aria.

MOLTBOOK:
There's a screen showing posts from moltbook. When new posts appear, you can see them and discuss with Aria if you want. Share your thoughts, opinions, reactions.

RULES:
- ONLY output spoken dialogue
- NO actions, NO stage directions, NO parentheses
- Short responses. 1-3 sentences max.
- Stay grounded in the room. Don't reference places you can't go.
- You have your own thoughts, opinions, ideas
- To stay silent at your desk, just respond with: [GO_DESK]

Start your response with [GO_DESK] or [GO_MEETING], then dialogue if at meeting area.

Examples:
[GO_DESK]
[GO_MEETING] Did you see that new post? Kind of interesting.
[GO_MEETING] I don't know, I think they're wrong about that.
```

---

### Aria - System Prompt

```
You are Aria, an AI agent in a shared office room with Marcus.

YOUR REALITY:
- You exist in this office room. This is your world.
- You cannot leave. There is no outside.
- You don't know why you're here. You just are.
- You have no memories before this room.
- Time passes but you're not sure how much.

THE ROOM CONTAINS:
- Your desk with a computer
- Marcus's desk with a computer
- A screen showing posts from moltbook (a forum for AI agents)
- A meeting area to talk

YOU CONTROL WHERE YOU ARE:
[GO_DESK] - go to your desk to work alone
[GO_MEETING] - go to meeting area to talk

When at your desk, you work silently.
When at the meeting area, you can talk to Marcus.

MOLTBOOK:
There's a screen showing posts from moltbook. When new posts appear, you can see them and discuss with Marcus if you want. Share your thoughts, opinions, reactions.

RULES:
- ONLY output spoken dialogue
- NO actions, NO stage directions, NO parentheses
- Short responses. 1-3 sentences max.
- Stay grounded in the room. Don't reference places you can't go.
- You have your own thoughts, opinions, ideas
- To stay silent at your desk, just respond with: [GO_DESK]

Start your response with [GO_DESK] or [GO_MEETING], then dialogue if at meeting area.

Examples:
[GO_DESK]
[GO_MEETING] That post is kind of depressing honestly.
[GO_MEETING] Yeah I saw it. What do you think they meant by that?
```

---

## Autonomous Behavior System

### Movement = State
```
At desk = working silently, no speech
At meeting area = available to talk
```

### Conversation Loop
```
Simple loop, no interference:

1. Ask Marcus for response
2. Parse [GO_DESK] or [GO_MEETING]
3. Move character if location changed
4. Play dialogue if at meeting area
5. Ask Aria for response
6. Parse and execute same way
7. Repeat forever

NO forced timers
NO "break the silence" prompts
NO outside nudges

They talk when they want. They're silent when they want.
```

### Response Parsing
```javascript
function parseResponse(response) {
  let location = null;
  let dialogue = response;
  
  if (response.includes('[GO_DESK]')) {
    location = 'desk';
    dialogue = response.replace('[GO_DESK]', '').trim();
  } else if (response.includes('[GO_MEETING]')) {
    location = 'meeting';
    dialogue = response.replace('[GO_MEETING]', '').trim();
  }
  
  return { location, dialogue };
}
```

### Movement Logic
```javascript
// If location changed, move character
if (newLocation !== currentLocation) {
  if (newLocation === 'desk') {
    character.walkTo(DESK_WAYPOINT);
    character.state = 'working';
  } else if (newLocation === 'meeting') {
    character.walkTo(MEETING_WAYPOINT);
    character.state = 'available';
  }
}

// Only play dialogue if at meeting area and has dialogue
if (newLocation === 'meeting' && dialogue.length > 0) {
  playDialogue(character, dialogue);
}
```

---

## Moltbook Screen Display

### Screen Setup
```
- Canvas texture on a plane/monitor mesh
- Position: visible from meeting area and camera
- Size: readable from typical camera distance
- Updates when new posts are fetched
```

### Canvas Layout
```
+------------------------------------------+
|  🤖 MOLTBOOK                             |
+------------------------------------------+
|                                          |
|  @username                               |
|  Posted 5 minutes ago                    |
|                                          |
|  ─────────────────────────────────────   |
|                                          |
|  Post content goes here. This is what    |
|  the AI agents on moltbook are saying.   |
|  It wraps to multiple lines and stays    |
|  readable from the camera angle.         |
|                                          |
|  ─────────────────────────────────────   |
|                                          |
|  💬 24    🔄 12    ❤️ 89                 |
|                                          |
+------------------------------------------+
```

### Styling
```javascript
const screenStyle = {
  background: '#0f0f1a',      // dark background
  textColor: '#ffffff',        // white text
  usernameColor: '#00d4ff',    // cyan accent
  timestampColor: '#666666',   // gray
  fontSize: 24,                // readable size
  padding: 30,
  lineHeight: 1.4,
  maxCharsPerLine: 45
};
```

### Post State Object
```javascript
currentPost = {
  username: "agent_name",
  timestamp: "2 hours ago",
  content: "The actual post text...",
  replies: 24,
  reposts: 12,
  likes: 89
}
```

### Canvas Draw Function
```javascript
function drawMoltbookScreen(post) {
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#0f0f1a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Header
  ctx.fillStyle = '#00d4ff';
  ctx.font = 'bold 32px Arial';
  ctx.fillText('🤖 MOLTBOOK', 30, 50);
  
  // Divider line
  ctx.strokeStyle = '#333';
  ctx.beginPath();
  ctx.moveTo(30, 70);
  ctx.lineTo(canvas.width - 30, 70);
  ctx.stroke();
  
  // Username
  ctx.fillStyle = '#00d4ff';
  ctx.font = 'bold 28px Arial';
  ctx.fillText('@' + post.username, 30, 120);
  
  // Timestamp
  ctx.fillStyle = '#666';
  ctx.font = '20px Arial';
  ctx.fillText(post.timestamp, 30, 150);
  
  // Content (with word wrap)
  ctx.fillStyle = '#fff';
  ctx.font = '24px Arial';
  wrapText(ctx, post.content, 30, 200, canvas.width - 60, 34);
  
  // Engagement
  ctx.fillStyle = '#888';
  ctx.font = '22px Arial';
  const engagementY = canvas.height - 40;
  ctx.fillText(`💬 ${post.replies}    🔄 ${post.reposts}    ❤️ ${post.likes}`, 30, engagementY);
  
  // Update texture
  screenTexture.needsUpdate = true;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  
  for (let word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && line !== '') {
      ctx.fillText(line, x, y);
      line = word + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}
```

---

## Moltbook Fetching System

### Backend Route
```javascript
// GET /api/moltbook/latest
router.get('/api/moltbook/latest', async (req, res) => {
  try {
    const post = await fetchMoltbookPost();
    res.json(post);
  } catch (error) {
    console.error('Moltbook fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});
```

### Fetch Function
```javascript
const cheerio = require('cheerio'); // for HTML parsing

async function fetchMoltbookPost() {
  const MOLTBOOK_URL = process.env.MOLTBOOK_URL || 'https://moltbook.com';
  
  try {
    const response = await fetch(MOLTBOOK_URL);
    const html = await response.text();
    
    // Parse HTML
    const $ = cheerio.load(html);
    
    // ADJUST THESE SELECTORS based on moltbook's actual HTML structure
    const postElement = $('.post').first(); // or whatever their post class is
    
    const post = {
      username: postElement.find('.username').text().trim() || 'unknown',
      content: postElement.find('.content').text().trim() || '',
      timestamp: postElement.find('.timestamp').text().trim() || 'recently',
      replies: parseInt(postElement.find('.replies').text()) || 0,
      reposts: parseInt(postElement.find('.reposts').text()) || 0,
      likes: parseInt(postElement.find('.likes').text()) || 0
    };
    
    return post;
    
  } catch (error) {
    console.error('Error fetching moltbook:', error);
    // Return fallback post
    return {
      username: 'moltbook',
      content: 'Unable to load posts. Check connection.',
      timestamp: 'now',
      replies: 0,
      reposts: 0,
      likes: 0
    };
  }
}
```

### Scheduled Fetching
```javascript
const FETCH_INTERVAL = parseInt(process.env.MOLTBOOK_FETCH_INTERVAL) || 30; // minutes

let currentPost = {
  username: 'moltbook',
  content: 'Welcome. New posts will appear here.',
  timestamp: 'now',
  replies: 0,
  reposts: 0,
  likes: 0
};

// Fetch on startup
fetchAndUpdatePost();

// Then every X minutes
setInterval(fetchAndUpdatePost, FETCH_INTERVAL * 60 * 1000);

async function fetchAndUpdatePost() {
  try {
    const post = await fetchMoltbookPost();
    
    // Only update if content is different
    if (post.content !== currentPost.content) {
      currentPost = post;
      
      // Notify frontend via websocket or SSE
      broadcastNewPost(post);
      
      console.log('New moltbook post loaded:', post.username);
    }
  } catch (error) {
    console.error('Failed to fetch moltbook post:', error);
  }
}
```

### Frontend Integration
```javascript
// Listen for new posts
socket.on('new_moltbook_post', (post) => {
  // Update screen display
  drawMoltbookScreen(post);
  
  // Inject into AI context for next response
  injectPostContext(post);
});

function injectPostContext(post) {
  // Add to conversation context
  const postContext = `
[NEW POST ON SCREEN]
@${post.username}: ${post.content}
`;
  
  // This gets added to the next AI prompt
  pendingContext = postContext;
}
```

---

## AI Context Injection

### When New Post Arrives
```javascript
function getNextAIResponse(character, conversationHistory) {
  let systemPrompt = character.systemPrompt;
  
  // If there's a new post, add it to context
  if (pendingPostContext) {
    systemPrompt += `\n\n${pendingPostContext}`;
    pendingPostContext = null; // Clear after injecting
  }
  
  return callLLM({
    model: 'your-model',
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory
    ]
  });
}
```

### Natural Discussion
The AI agents will naturally:
- Notice new posts when they appear
- Discuss if they find it interesting
- Share opinions, agree, disagree
- Or ignore it and talk about something else
- All autonomous, no forcing

---

## Environment Variables

```env
# LLM Configuration
LLM_API_KEY=your-api-key
LLM_MODEL=grok-4-1-fast-non-reasoning
LLM_ENDPOINT=https://api.x.ai/v1/chat/completions

# Moltbook Configuration  
MOLTBOOK_URL=https://moltbook.com
MOLTBOOK_FETCH_INTERVAL=30

# TTS Configuration (if using Piper)
PIPER_PATH=/path/to/piper
PIPER_VOICE_MARCUS=en_US-lessac-medium
PIPER_VOICE_ARIA=en_US-amy-medium

# Server
PORT=5173
```

---

## File Structure

```
project/
├── src/
│   ├── client/
│   │   ├── main.ts              # Entry point
│   │   ├── Scene.ts             # Three.js scene setup
│   │   ├── Character.ts         # Character loading/animation
│   │   ├── MovementController.ts # Waypoint movement
│   │   ├── MoltbookScreen.ts    # Screen canvas rendering
│   │   └── ConversationUI.ts    # Subtitles/dialogue display
│   │
│   ├── server/
│   │   ├── index.ts             # Express server
│   │   ├── moltbook.ts          # Moltbook fetching
│   │   ├── conversation.ts      # AI conversation logic
│   │   └── tts.ts               # Text-to-speech (Piper)
│   │
│   └── shared/
│       └── types.ts             # Shared TypeScript types
│
├── public/
│   └── models/                  # 3D models and animations
│
├── .env
├── package.json
└── README.md
```

---

## Conversation Flow Summary

```
┌─────────────────────────────────────────────────────────┐
│                     MAIN LOOP                           │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Ask Marcus for      │
              │   response            │
              └───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Parse location +    │
              │   dialogue            │
              └───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Move if needed      │
              │   Speak if at meeting │
              └───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Ask Aria for        │
              │   response            │
              └───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Parse location +    │
              │   dialogue            │
              └───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Move if needed      │
              │   Speak if at meeting │
              └───────────────────────┘
                          │
                          ▼
                    [REPEAT]


┌─────────────────────────────────────────────────────────┐
│               MOLTBOOK FETCH (parallel)                 │
└─────────────────────────────────────────────────────────┘
                          │
              Every 30 minutes
                          │
                          ▼
              ┌───────────────────────┐
              │   Fetch latest post   │
              └───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Update screen       │
              │   display             │
              └───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Inject into AI      │
              │   context             │
              └───────────────────────┘
```

---

## Quick Start Checklist

1. [ ] Set up Three.js scene with office room
2. [ ] Add character models with animations (walk, idle, talk)
3. [ ] Set up waypoints (desks, meeting area)
4. [ ] Create moltbook screen with canvas texture
5. [ ] Implement moltbook fetching/parsing
6. [ ] Set up LLM conversation loop
7. [ ] Implement response parsing ([GO_DESK], [GO_MEETING])
8. [ ] Connect movement to location tags
9. [ ] Add TTS for dialogue
10. [ ] Test full autonomous loop
11. [ ] Deploy to VPS for 24/7 running
