"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import unifiedStyles from '@/components/ChatBot/styles/chatbot-unified.module.css';

interface SubmitButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({
  onClick,
  disabled = false,
  isLoading = false
}) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      variant="default"
      className={`${unifiedStyles.submitButton} rounded-full p-2 h-10 w-10`}
      title="Send message"
      type="button"
    >
      {isLoading ? (
        <span className="animate-spin">⌛</span>
      ) : (
        <Send className="h-5 w-5" />
      )}
    </Button>
  );
};

export default SubmitButton;
