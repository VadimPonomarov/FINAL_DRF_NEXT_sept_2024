/**
 * Message context types for ChatBot module
 */

export interface MessageContext {
  messageId: string;
  threadId?: string;
  parentId?: string;
  metadata?: Record<string, any>;
  relatedIds?: string[];
  conversationThread?: string;
  references: string[];
  referencedBy: string[];
  timestamp?: string;
  imageContext?: {
    originalPrompt?: string;
    sanitizedUrl?: string;
    generationParams?: Record<string, any>;
  };
  semanticContext?: {
    topics: string[];
    entities: string[];
    intent?: string;
  };
  memoryContext?: {
    relatedFacts: any[];
    previousInteractions: any[];
    userPreferences: Record<string, any>;
  };
}

export interface ThreadInfo {
  threadId: string;
  messageIds?: string[];
  createdAt?: string;
  title?: string;
  startTime?: string;
  lastUpdateTime?: string;
  messageCount?: number;
  participantCount?: number;
}

export interface MessageRelationship {
  sourceId: string;
  targetId: string;
  type: 'reply' | 'reference' | 'continuation';
}
