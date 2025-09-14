"use client";

import { Button } from "@/components/ui/button";
import { FaFilter } from 'react-icons/fa';
import { ResizableFilterWrapper } from "../ResizableFilterWrapper";
import styles from './styles.module.css';

interface FilterIconViewProps {
  isOpen: boolean;
  onOpenFilter: () => void;
  onCloseFilter: () => void;
  onBackdropClick: (e: React.MouseEvent) => void;
  onSaveSize: () => void;
  children: React.ReactNode;
}

export const FilterIconView: React.FC<FilterIconViewProps> = ({
  isOpen,
  onOpenFilter,
  onCloseFilter,
  onBackdropClick,
  onSaveSize,
  children
}) => {
  return (
    <>
      <Button
        variant="link"
        className={`${styles.filterButton} ${isOpen ? styles.filterButtonHidden : styles.filterButtonVisible}`}
        onClick={onOpenFilter}
      >
        <FaFilter className="h-5 w-5" />
      </Button>

      {isOpen && (
        <div
          className={styles.filterOverlay}
          onClick={onBackdropClick}
        >
          <ResizableFilterWrapper>
            <div className={styles.closeButton}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20"
                onClick={onSaveSize}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </Button>
            </div>
            {children}
          </ResizableFilterWrapper>
        </div>
      )}
    </>
  );
};
