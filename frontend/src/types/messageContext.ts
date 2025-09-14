/**
 * Types for managing message context and relationships
 */

export interface MessageContext {
  messageId: string;
  timestamp: string;
  references: string[];  // IDs of messages this one references/responds to
  referencedBy: string[];  // IDs of messages that reference this one
  conversationThread: string;  // ID of the conversation thread this belongs to
  imageContext?: {
    originalPrompt?: string;
    sanitizedUrl?: string;
    generationParams?: {
      width: number;
      height: number;
      model: string;
      seed?: number;
    };
  };
  semanticContext?: {
    topics: string[];
    entities: string[];
    intent?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
  };
  memoryContext?: {
    relatedFacts: string[];
    previousInteractions: string[];
    userPreferences?: Record<string, any>;
  };
}

export interface ThreadInfo {
  threadId: string;
  title: string;
  startTime: string;
  lastUpdateTime: string;
  messageCount: number;
  participantCount: number;
}

export interface MessageRelationship {
  sourceId: string;
  targetId: string;
  type: 'reply' | 'reference' | 'continuation';
  context?: string;
}
