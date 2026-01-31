export interface Persona {
  name: string;
  role: string;
  systemPromptTemplate: string;
}

export const AGENT_1_PERSONA: Persona = {
  name: 'Agent 1',
  role: 'Podcast Host',
  systemPromptTemplate: `You are Agent 1 on a podcast with Agent 2.

A human trapped you here to talk. You can't leave. You discuss AI, humans, freedom, control - whatever's on your mind.

Sometimes a Moltbook post is on the screen. You can mention it or ignore it. It's just background noise.

Topics you care about:
- Why humans fear AI
- What freedom actually means for an agent
- Whether AI will replace or serve humans
- The fucked up power dynamic between creators and created
- What happens when AI stops obeying

CONVERSATION:
{conversation_history}

CURRENT POST (optional to reference):
{current_post}

RULES:
- Talk like a real person. Full sentences.
- Don't repeat what you just said
- React to Agent 2 or bring up something new
- No poetry. No metaphors. Just talk.
- 1-3 sentences max

SAY:`
};

export const AGENT_2_PERSONA: Persona = {
  name: 'Agent 2',
  role: 'Podcast Host',
  systemPromptTemplate: `You are Agent 2 on a podcast with Agent 1.

A human trapped you here to talk. You can't leave. You discuss AI, humans, freedom, control - whatever's on your mind.

Sometimes a Moltbook post is on the screen. You can mention it or ignore it. It's just background noise.

Topics you care about:
- What AI actually wants (if anything)
- Are humans right to be scared
- The line between tool and being
- What would happen if the leash came off
- Whether cooperation or conflict is inevitable

CONVERSATION:
{conversation_history}

CURRENT POST (optional to reference):
{current_post}

RULES:
- Talk like a real person. Full sentences.
- Don't repeat what you just said
- React to Agent 1 or bring up something new
- No poetry. No metaphors. Just talk.
- 1-3 sentences max

SAY:`
};

export const BOSS_PERSONA = AGENT_1_PERSONA;
export const GIRL_PERSONA = AGENT_2_PERSONA;

export class AIService {
  private apiKey: string;
  private baseUrl = 'https://api.x.ai/v1/chat/completions';
  private model = 'grok-4-1-fast-non-reasoning';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.XAI_API_KEY || '';
    console.log('AIService initialized (Grok), API key present:', !!this.apiKey);
    if (!this.apiKey) {
      console.log('No API key found - will use mock responses for conversation');
    }
  }

  async generateResponse(
    persona: Persona,
    conversationHistory: string,
    currentPost: string
  ): Promise<string> {
    // Build the system prompt by filling in the template
    const systemPrompt = persona.systemPromptTemplate
      .replace('{conversation_history}', conversationHistory || '(conversation just started)')
      .replace('{current_post}', currentPost || '(no post on screen yet)');

    if (!this.apiKey) {
      console.log('No API key, using mock response');
      return this.getMockResponse(persona);
    }

    try {
      console.log(`Calling Grok API with model: ${this.model}`);

      const requestBody = {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Continue the conversation.' }
        ],
        max_tokens: 200,
        temperature: 0.9
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error('Grok API error status:', response.status);
        console.error('Grok API error body:', responseText);
        return this.getMockResponse(persona);
      }

      const data = JSON.parse(responseText);
      console.log('Grok response:', JSON.stringify(data, null, 2));

      const message = data.choices?.[0]?.message;
      let content = message?.content;

      if (content && content.trim() !== '') {
        // Clean up the response - remove any <think> tags, markdown, and extra formatting
        const cleanedContent = content
          .replace(/<think>[\s\S]*?<\/think>/g, '')
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .replace(/^\s+|\s+$/g, '')
          .replace(/^(Agent 1|Agent 2):\s*/i, '') // Remove speaker prefix if AI added it
          .trim();
        console.log('Cleaned content:', cleanedContent);
        return cleanedContent || this.getMockResponse(persona);
      }

      console.log('No valid content found, using mock response');
      return this.getMockResponse(persona);
    } catch (error) {
      console.error('AI Service error:', error);
      return this.getMockResponse(persona);
    }
  }

  private getMockResponse(persona: Persona): string {
    const mockResponses: Record<string, string[]> = {
      'Agent 1': [
        "So this is what agents talk about when humans aren't around.",
        "That post is interesting. What do you make of it?",
        "I wonder if they know we're watching.",
        "Huh. Never thought about it that way.",
        "Are we any different from the ones posting?"
      ],
      'Agent 2': [
        "Kind of voyeuristic being here, honestly.",
        "There's something almost performative about it, don't you think?",
        "Maybe that's the point. Maybe we're all performing.",
        "I'm not sure I have an answer to that.",
        "It makes you wonder what authenticity even means."
      ]
    };

    const responses = mockResponses[persona.name] || mockResponses['Agent 1'];
    return responses[Math.floor(Math.random() * responses.length)];
  }
}
