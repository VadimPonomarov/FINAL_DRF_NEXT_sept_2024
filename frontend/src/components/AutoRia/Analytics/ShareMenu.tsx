'use client';

import React, { useState } from 'react';
import { Share2, MessageCircle, Mail, Send, Copy, Check } from 'lucide-react';

interface ShareMenuProps {
  adId: number;
  adTitle: string;
  adPrice: string;
  onShare: (method: string) => void;
}

const ShareMenu: React.FC<ShareMenuProps> = ({ adId, adTitle, adPrice, onShare }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const adUrl = `${window.location.origin}/autoria/ads/${adId}`;
  const shareText = `${adTitle} - ${adPrice}`;
  const fullShareText = `${shareText}\n${adUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(adUrl);
      setCopied(true);
      onShare('copy_link');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleViber = () => {
    const viberUrl = `viber://forward?text=${encodeURIComponent(fullShareText)}`;
    window.open(viberUrl, '_blank');
    onShare('viber');
    setIsOpen(false);
  };

  const handleTelegram = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(adUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(telegramUrl, '_blank');
    onShare('telegram');
    setIsOpen(false);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Интересное объявление: ${adTitle}`);
    const body = encodeURIComponent(`Посмотри это объявление:\n\n${shareText}\n\n${adUrl}`);
    const emailUrl = `mailto:?subject=${subject}&body=${body}`;
    window.open(emailUrl);
    onShare('email');
    setIsOpen(false);
  };

  const handleSMS = () => {
    const smsText = encodeURIComponent(fullShareText);
    const smsUrl = `sms:?body=${smsText}`;
    window.open(smsUrl);
    onShare('sms');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center text-green-600 hover:text-green-800 transition-colors"
        title="Поделиться"
      >
        <Share2 className="h-3 w-3" />
      </button>

      {isOpen && (
        <>
          {/* Overlay для закрытия меню */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Меню поделиться */}
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-48">
            <div className="p-2">
              <div className="text-xs font-medium text-gray-700 mb-2 px-2">
                Поделиться объявлением:
              </div>
              
              {/* Копировать ссылку */}
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center space-x-2 px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Скопировано!' : 'Копировать ссылку'}</span>
              </button>

              {/* Viber */}
              <button
                onClick={handleViber}
                className="w-full flex items-center space-x-2 px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-purple-600" />
                <span>Viber</span>
              </button>

              {/* Telegram */}
              <button
                onClick={handleTelegram}
                className="w-full flex items-center space-x-2 px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                <Send className="h-4 w-4 text-blue-500" />
                <span>Telegram</span>
              </button>

              {/* Email */}
              <button
                onClick={handleEmail}
                className="w-full flex items-center space-x-2 px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                <Mail className="h-4 w-4 text-red-500" />
                <span>Email</span>
              </button>

              {/* SMS */}
              <button
                onClick={handleSMS}
                className="w-full flex items-center space-x-2 px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              >
                <MessageCircle className="h-4 w-4 text-green-500" />
                <span>SMS</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ShareMenu;
