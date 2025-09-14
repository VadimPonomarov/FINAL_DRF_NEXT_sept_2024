"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Zap,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { useAutoRiaFormPrefill } from '@/hooks/useAutoRiaFormPrefill';
import { CarAdFormData } from '@/types/autoria';
import { useI18n } from '@/contexts/I18nContext';

interface AutoFillButtonProps {
  onAutoFill: (data: Partial<CarAdFormData>) => void;
  currentFormData: Partial<CarAdFormData>;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'sm' | 'default' | 'lg';
}

const AutoFillButton: React.FC<AutoFillButtonProps> = ({
  onAutoFill,
  currentFormData,
  className = '',
  variant = 'outline',
  size = 'default'
}) => {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  
  const {
    isAutoFillAvailable,
    getAutoFillSummary,
    applyAutoFill,
    loading,
    isAuthenticated
  } = useAutoRiaFormPrefill();

  // Если пользователь не аутентифицирован или нет данных
  if (!isAuthenticated || !isAutoFillAvailable()) {
    return null;
  }

  const summary = getAutoFillSummary();

  const handleAutoFill = async (options: { overwriteExisting?: boolean } = {}) => {
    setIsApplying(true);
    
    try {
      console.log('[AutoFillButton] 🔄 Applying auto-fill...');
      
      const updatedData = applyAutoFill(currentFormData, {
        overwriteExisting: options.overwriteExisting || false
      });
      
      onAutoFill(updatedData);
      setIsOpen(false);
      
      console.log('[AutoFillButton] ✅ Auto-fill applied successfully');
    } catch (error) {
      console.error('[AutoFillButton] ❌ Auto-fill failed:', error);
    } finally {
      setIsApplying(false);
    }
  };

  const getFieldIcon = (field: string) => {
    if (field.includes('name')) return <User className="h-3 w-3" />;
    if (field.includes('phone') || field.includes('telegram') || field.includes('viber') || field.includes('whatsapp')) return <Phone className="h-3 w-3" />;
    if (field.includes('email')) return <Mail className="h-3 w-3" />;
    if (field.includes('region') || field.includes('city')) return <MapPin className="h-3 w-3" />;
    return <Info className="h-3 w-3" />;
  };

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      seller_name: t('autoFill.sellerName'),
      seller_phone: t('autoFill.mainPhone'),
      seller_phone_secondary: t('autoFill.additionalPhone'),
      seller_email: t('autoFill.email'),
      seller_telegram: t('autoFill.telegram'),
      seller_viber: t('autoFill.viber'),
      seller_whatsapp: t('autoFill.whatsapp'),
      region: t('autoFill.region'),
      city: t('autoFill.city'),
    };
    return labels[field] || field;
  };

  if (loading) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled
      >
        <Zap className="h-4 w-4 mr-2 animate-spin" />
        {t('common.loading')}
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={className}
          disabled={isApplying}
        >
          <Zap className="h-4 w-4 mr-2" />
          Заповнити мої дані
          <Badge variant="secondary" className="ml-2">
            {summary.totalFields}
          </Badge>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Автозаповнення форми</h4>
            <p className="text-sm text-muted-foreground">
              Заповнити поля вашими персональними даними
            </p>
          </div>

          {/* Доступні поля */}
          <div className="space-y-2">
            <div className="text-sm font-medium">Доступні дані ({summary.totalFields}):</div>
            <div className="grid grid-cols-1 gap-1">
              {summary.fields.map((field) => (
                <div key={field} className="flex items-center gap-2 text-sm">
                  {getFieldIcon(field)}
                  <span className="text-muted-foreground">{getFieldLabel(field)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Статус данных */}
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              {summary.hasProfile ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-yellow-500" />
              )}
              <span className="text-xs">Профіль</span>
            </div>
            <div className="flex items-center gap-1">
              {summary.hasContact ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-yellow-500" />
              )}
              <span className="text-xs">Контакти</span>
            </div>
            <div className="flex items-center gap-1">
              {summary.hasAddress ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <AlertCircle className="h-3 w-3 text-yellow-500" />
              )}
              <span className="text-xs">Адреса</span>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex flex-col gap-2">
            <Button 
              size="sm" 
              onClick={() => handleAutoFill({ overwriteExisting: false })}
              disabled={isApplying}
              className="w-full"
            >
              {isApplying ? (
                <>
                  <Zap className="h-3 w-3 mr-2 animate-spin" />
                  Заповнення...
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3 mr-2" />
                  Заповнити пусті поля
                </>
              )}
            </Button>
            
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleAutoFill({ overwriteExisting: true })}
              disabled={isApplying}
              className="w-full"
            >
              <Zap className="h-3 w-3 mr-2" />
              Перезаписати всі поля
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            💡 Дані беруться з вашого профілю та налаштувань
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AutoFillButton;
