"use client";

import React from 'react';
import { Send, Loader2 } from "lucide-react";
import styles from './styles.module.css';

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
    <div className={styles.wrapper}>
      <button
        onClick={onClick}
        disabled={disabled}
        className={styles.submitButton}
        type="button"
        title="Отправить сообщение"
        aria-label="Отправить сообщение"
      >
        {isLoading ? (
          <Loader2 className={styles.icon + " animate-spin"} />
        ) : (
          <Send className={styles.icon} />
        )}
      </button>
    </div>
  );
};

export default SubmitButton;
