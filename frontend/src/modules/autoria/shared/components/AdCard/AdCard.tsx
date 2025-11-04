/**
 * Reusable Ad Card component (DRY)
 * Used across: SearchPage, MyAdsPage, ModerationPage
 */

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CarAd } from '../../types';
import styles from './AdCard.module.scss';

export interface AdCardProps {
  ad: CarAd;
  onView?: (ad: CarAd) => void;
  onEdit?: (ad: CarAd) => void;
  onDelete?: (ad: CarAd) => void;
  showActions?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

export const AdCard: React.FC<AdCardProps> = ({
  ad,
  onView,
  onEdit,
  onDelete,
  showActions = true,
  variant = 'default'
}) => {
  const primaryImage = ad.images?.find(img => img.is_primary) || ad.images?.[0];

  return (
    <Card className={styles.adCard} data-variant={variant}>
      <CardHeader className={styles.header}>
        {primaryImage && (
          <img 
            src={primaryImage.thumbnail_url || primaryImage.url} 
            alt={ad.title}
            className={styles.image}
          />
        )}
        <Badge variant={ad.status === 'active' ? 'default' : 'secondary'}>
          {ad.status}
        </Badge>
      </CardHeader>
      
      <CardContent className={styles.content}>
        <h3 className={styles.title}>{ad.title}</h3>
        <p className={styles.price}>
          {ad.price.toLocaleString()} {ad.currency}
        </p>
        <div className={styles.specs}>
          <span>{ad.year}</span>
          <span>{ad.mileage.toLocaleString()} км</span>
          <span>{ad.fuel_type}</span>
        </div>
        {variant === 'detailed' && (
          <p className={styles.description}>{ad.description}</p>
        )}
      </CardContent>

      {showActions && (
        <CardFooter className={styles.footer}>
          {onView && (
            <Button variant="outline" size="sm" onClick={() => onView(ad)}>
              View
            </Button>
          )}
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(ad)}>
              Edit
            </Button>
          )}
          {onDelete && (
            <Button variant="destructive" size="sm" onClick={() => onDelete(ad)}>
              Delete
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
};
