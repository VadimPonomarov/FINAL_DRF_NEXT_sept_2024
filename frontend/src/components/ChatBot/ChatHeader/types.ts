/**
 * Types for ChatHeader component
 */
export interface ChatHeaderProps {
  isConnected: boolean;
  isConnecting?: boolean;
  onConnect: () => void;
  onRefreshToken: () => Promise<boolean>;
  title?: string;
  onNewChat?: () => void;
  onDeleteHistory?: () => void;
}
