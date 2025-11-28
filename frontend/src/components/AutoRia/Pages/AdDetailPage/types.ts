export interface AdDetailPageProps {
  adId: number;
  showModerationControls?: boolean; // For super users
  onBack?: () => void; // Callback for the "Back" button
  onEdit?: () => void; // Callback for the "Edit" button
}
