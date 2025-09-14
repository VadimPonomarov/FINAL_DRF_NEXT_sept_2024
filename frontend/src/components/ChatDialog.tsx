'use client';

import React from 'react';
import { useChatContext } from '@/contexts/ChatContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export function ChatDialog() {
  const { messages, addMessage } = useChatContext();
  const [inputValue, setInputValue] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      addMessage(inputValue, 'user');
      setInputValue('');
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto p-4">
      <div className="flex flex-col h-[400px]">
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button type="submit">Send</Button>
        </form>
      </div>
    </Card>
  );
}