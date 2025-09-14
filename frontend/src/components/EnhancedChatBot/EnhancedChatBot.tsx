/**
 * Enhanced ChatBot component with improved architecture
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useEnhancedChat } from '@/hooks/useEnhancedChat';
import { EnhancedMessage } from '@/types/enhanced-chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  Loader2, 
  Wifi, 
  WifiOff, 
  Trash2, 
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EnhancedChatBotProps {
  className?: string;
  onAuthError?: () => void;
}

export const EnhancedChatBot: React.FC<EnhancedChatBotProps> = ({
  className = '',
  onAuthError
}) => {
  const [inputValue, setInputValue] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Enhanced chat hook
  const {
    messages,
    isConnected,
    isLoading,
    isTyping,
    error,
    sessionId,
    connectionStatus,
    sendMessage,
    clearHistory,
    connect,
    disconnect,
    retry
  } = useEnhancedChat({
    autoConnect: true,
    onAuthError,
    onConnectionChange: (connected) => {
      toast({
        title: connected ? 'Connected' : 'Disconnected',
        description: connected ? 'Chat is ready' : 'Connection lost',
        variant: connected ? 'default' : 'destructive'
      });
    },
    onError: (error) => {
      toast({
        title: 'Chat Error',
        description: error,
        variant: 'destructive'
      });
    }
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle send message
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !isConnected) return;

    const message = inputValue.trim();
    setInputValue('');

    try {
      await sendMessage(message);
    } catch (err) {
      toast({
        title: 'Failed to send message',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle clear history
  const handleClearHistory = async () => {
    try {
      await clearHistory();
      toast({
        title: 'History cleared',
        description: 'Chat history has been cleared'
      });
    } catch (err) {
      toast({
        title: 'Failed to clear history',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  // Handle copy message
  const handleCopyMessage = async (message: EnhancedMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      setTimeout(() => setCopiedMessageId(null), 2000);
      
      toast({
        title: 'Copied',
        description: 'Message copied to clipboard'
      });
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy message to clipboard',
        variant: 'destructive'
      });
    }
  };

  // Get connection status color
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Format message timestamp
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render message
  const renderMessage = (message: EnhancedMessage) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    
    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`max-w-[80%] rounded-lg px-4 py-2 ${
            isUser
              ? 'bg-blue-500 text-white'
              : isSystem
              ? 'bg-gray-100 text-gray-700 border'
              : 'bg-white border shadow-sm'
          }`}
        >
          {/* Message content */}
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>
          
          {/* Message metadata */}
          <div className="flex items-center justify-between mt-2 text-xs opacity-70">
            <div className="flex items-center gap-2">
              <span>{formatTimestamp(message.timestamp)}</span>
              
              {/* Status indicator */}
              {message.status === 'sending' && <Loader2 className="w-3 h-3 animate-spin" />}
              {message.status === 'error' && <span className="text-red-500">Failed</span>}
              
              {/* Intent badge */}
              {message.metadata?.intent && (
                <Badge variant="outline" className="text-xs">
                  {message.metadata.intent}
                </Badge>
              )}
              
              {/* Processing time */}
              {message.metadata?.processing_time && (
                <span className="text-xs">
                  {message.metadata.processing_time}ms
                </span>
              )}
            </div>
            
            {/* Copy button */}
            {!isSystem && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => handleCopyMessage(message)}
              >
                {copiedMessageId === message.id ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            )}
          </div>
          
          {/* Images */}
          {message.images && message.images.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.images.map((imageUrl, index) => (
                <img
                  key={index}
                  src={imageUrl}
                  alt={`Generated image ${index + 1}`}
                  className="max-w-full rounded border"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className={`flex flex-col h-[600px] ${className}`}>
      {/* Header */}
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Enhanced ChatBot
            <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`} />
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {/* Session info */}
            {sessionId && (
              <Badge variant="outline" className="text-xs">
                {sessionId.slice(-8)}
              </Badge>
            )}
            
            {/* Connection controls */}
            <Button
              variant="outline"
              size="sm"
              onClick={isConnected ? disconnect : connect}
              disabled={connectionStatus === 'connecting'}
            >
              {connectionStatus === 'connecting' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isConnected ? (
                <WifiOff className="w-4 h-4" />
              ) : (
                <Wifi className="w-4 h-4" />
              )}
            </Button>
            
            {/* Retry button */}
            {error && (
              <Button variant="outline" size="sm" onClick={retry}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
            
            {/* Clear history */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearHistory}
              disabled={!isConnected || messages.length === 0}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Error display */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded border">
            {error}
          </div>
        )}
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4">
          <div className="py-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No messages yet. Start a conversation!</p>
                <p className="text-sm mt-2">
                  Try: "Hello", "Create an image of a cat", "What time is it?"
                </p>
              </div>
            ) : (
              messages.map(renderMessage)
            )}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-100 rounded-lg px-4 py-2 border">
                  <div className="flex items-center gap-1">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                    </div>
                    <span className="text-sm text-gray-600 ml-2">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              isConnected 
                ? "Type your message..." 
                : "Connecting..."
            }
            disabled={!isConnected || isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || !isConnected || isLoading}
            size="sm"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {/* Status info */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>
            Status: {connectionStatus} | Messages: {messages.length}
          </span>
          {isConnected && (
            <span>Press Enter to send, Shift+Enter for new line</span>
          )}
        </div>
      </div>
    </Card>
  );
};
