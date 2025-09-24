export interface Prompt {
  id: string;
  text: string;
  tags: string[];
}

export interface PromptHistory {
  id: string;
  servedAt: string;
}

// Sample prompts for the 90-day rotation
const PROMPTS: Prompt[] = [
  {
    id: 'gratitude-1',
    text: 'What are three things you\'re grateful for today?',
    tags: ['gratitude', 'reflection']
  },
  {
    id: 'energy-1',
    text: 'How is your energy level right now, and what might be affecting it?',
    tags: ['energy', 'wellness']
  },
  {
    id: 'growth-1',
    text: 'What\'s one thing you learned about yourself this week?',
    tags: ['growth', 'self-awareness']
  },
  {
    id: 'challenge-1',
    text: 'What challenge are you facing, and what\'s your first step to address it?',
    tags: ['challenge', 'problem-solving']
  },
  {
    id: 'joy-1',
    text: 'Describe a moment today that brought you joy or made you smile.',
    tags: ['joy', 'positive']
  },
  {
    id: 'future-1',
    text: 'What are you looking forward to in the next few days?',
    tags: ['future', 'anticipation']
  },
  {
    id: 'connection-1',
    text: 'How did you connect with others today, or how would you like to?',
    tags: ['connection', 'relationships']
  },
  {
    id: 'creativity-1',
    text: 'What creative outlet or hobby are you enjoying lately?',
    tags: ['creativity', 'hobbies']
  },
  {
    id: 'mindfulness-1',
    text: 'What\'s one thing you noticed about your surroundings today?',
    tags: ['mindfulness', 'awareness']
  },
  {
    id: 'accomplishment-1',
    text: 'What did you accomplish today that you\'re proud of?',
    tags: ['accomplishment', 'achievement']
  }
];

// In-memory storage for prompt history (replace with DB later)
const promptHistory: Record<string, PromptHistory[]> = {};

export function getPrompt(userId: string, todayISO: string): { id: string; text: string } {
  const userHistory = promptHistory[userId] || [];
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  // Filter out prompts served within the last 90 days
  const recentPromptIds = userHistory
    .filter(entry => new Date(entry.servedAt) > ninetyDaysAgo)
    .map(entry => entry.id);
  
  const availablePrompts = PROMPTS.filter(prompt => !recentPromptIds.includes(prompt.id));
  
  // If no prompts available, reset and use the least recently served
  if (availablePrompts.length === 0) {
    const allPromptIds = PROMPTS.map(p => p.id);
    const leastRecent = userHistory
      .filter(entry => allPromptIds.includes(entry.id))
      .sort((a, b) => new Date(a.servedAt).getTime() - new Date(b.servedAt).getTime())[0];
    
    const selectedPrompt = leastRecent 
      ? PROMPTS.find(p => p.id === leastRecent.id)!
      : PROMPTS[0];
    
    return {
      id: selectedPrompt.id,
      text: selectedPrompt.text
    };
  }
  
  // Pick a random available prompt
  const selectedPrompt = availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
  
  return {
    id: selectedPrompt.id,
    text: selectedPrompt.text
  };
}

export function logPromptHistory(userId: string, promptId: string): void {
  if (!promptHistory[userId]) {
    promptHistory[userId] = [];
  }
  
  promptHistory[userId].push({
    id: promptId,
    servedAt: new Date().toISOString()
  });
}



