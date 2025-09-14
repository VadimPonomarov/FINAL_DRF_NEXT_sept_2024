"use client";

import { Button } from "@/components/ui/button.tsx";
import { FC, useState } from "react";
import { FaFilter } from 'react-icons/fa'; // Fixed import


import styles from "./index.module.css";

interface IProps {
  children?: React.ReactNode;
  label?: React.ReactNode; // Changed type to React.ReactNode to accept JSX elements
}

const DialogModal: FC<IProps> = ({ children, label = <FaFilter /> }) => { // Use FaFilter as the default icon
  const [isOpen, setIsOpen] = useState(false);

  // Обработчик открытия фильтра
  const handleOpenFilter = () => {
    setIsOpen(true);
  };

  // Обработчик закрытия фильтра
  const handleCloseFilter = () => {
    setIsOpen(false);
  };

  // Обработчик клика по фону
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Не закрываем если происходит ресайз
    if (document.documentElement.classList.contains('resizing-active')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Закрываем модальное окно только если клик был по самому фону
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <Button className={styles.button} variant="link" onClick={handleOpenFilter}>
        {label}
      </Button>

      {isOpen && (
        <div className={`${styles.filterOverlay} filterOverlay`} onClick={handleBackdropClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="bg-white rounded-xl shadow-lg">
            <div className={styles.filterContent} style={{ backgroundColor: '#ffffff', opacity: 1, maxHeight: '80vh' }}>
              <div className={styles.filterHeader} style={{ backgroundColor: '#ffffff', opacity: 1 }}>
                <h2 className={styles.filterTitle}>Filter</h2>

              </div>
              <div className={styles.filterBody} style={{ backgroundColor: '#ffffff', opacity: 1 }}>
                {children}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DialogModal;


