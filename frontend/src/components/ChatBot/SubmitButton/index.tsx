"use client";

import React from 'react';
import { Send, Loader2 } from "lucide-react";
import unifiedStyles from '@/components/ChatBot/styles/chatbot-unified.module.css';

interface SubmitButtonProps {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
}

const SubmitButton: React.FC<SubmitButtonProps> = ({
  onClick,
  disabled,
  isLoading
}) => {
  return (
    <div className={unifiedStyles.submitButton}>
      <button
        onClick={onClick}
        disabled={disabled}
        className={unifiedStyles.submitButton}
        type="button"
        title="Отправить сообщение"
        aria-label="Отправить сообщение"
      >
        {isLoading ? (
          <Loader2 className={unifiedStyles.submitButtonIcon + " animate-spin"} />
        ) : (
          <Send className={unifiedStyles.submitButtonIcon} />
        )}
      </button>
    </div>
  );
};

export default SubmitButton;
