'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Eye, Edit, Trash2, EyeOff, Archive, Check, DollarSign, Mail } from 'lucide-react';
import type { CarAd, AdStatus } from '@/modules/autoria/shared/types/autoria';

export interface MyAdsListItemProps {
  ad: CarAd;
  ownerEmail?: string;
  formatPrice: (ad: CarAd) => string;
  getStatusBadge: (status: AdStatus) => React.ReactNode;
  onStatusChange: (id: number, status: AdStatus) => Promise<void> | void;
  onDelete: (id: number) => Promise<void> | void;
  onClick: (id: number) => void;
  selected: boolean;
  onToggleSelected: (id: number, checked: boolean) => void;
  viewLabel: string;
  editLabel: string;
  activateLabel: string;
  hideLabel: string;
  archiveLabel: string;
  soldLabel: string;
  deleteLabel: string;
}

export const MyAdsListItem: React.FC<MyAdsListItemProps> = ({
  ad,
  ownerEmail,
  formatPrice,
  getStatusBadge,
  onStatusChange,
  onDelete,
  onClick,
  selected,
  onToggleSelected,
  viewLabel,
  editLabel,
  activateLabel,
  hideLabel,
  archiveLabel,
  soldLabel,
  deleteLabel,
}) => {
  return (
    <div className="flex gap-4 p-3 bg-white rounded-lg shadow-sm hover:shadow transition">
      <input
        type="checkbox"
        className="mt-1"
        checked={selected}
        onChange={(e) => onToggleSelected(ad.id, e.target.checked)}
      />
      <img
        src={ad.images?.[0]?.image_display_url || ad.images?.[0]?.image || '/api/placeholder/200/150'}
        alt={ad.title}
        className="w-40 h-28 object-cover rounded cursor-pointer"
        onClick={() => onClick(ad.id)}
      />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-4">
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 truncate">
              {ad.mark_name} {ad.model}
            </div>
            <div className="text-slate-600 text-sm truncate">{ad.description}</div>
            {ownerEmail && (
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-1" title={ownerEmail}>
                <Mail className="h-3 w-3" />
                <span className="truncate max-w-[180px]">{ownerEmail}</span>
              </div>
            )}
            <div className="flex gap-2 mt-2">
              {ad.dynamic_fields?.year && (
                <Badge variant="outline" className="text-xs">
                  {ad.dynamic_fields.year}
                </Badge>
              )}
              {ad.dynamic_fields?.mileage && (
                <Badge variant="outline" className="text-xs">
                  {ad.dynamic_fields.mileage.toLocaleString()} km
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-bold text-blue-600 tabular-nums">{formatPrice(ad)}</div>
            <div className="mt-1">{getStatusBadge(ad.status)}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => (window.location.href = `/autoria/ads/view/${ad.id}`)}
                  className="h-8 w-8"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{viewLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => (window.location.href = `/autoria/ads/edit/${ad.id}`)}
                  className="h-8 w-8"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{editLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" className="h-8 w-8" onClick={() => onStatusChange(ad.id, 'active')}>
                  <Check className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{activateLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={() => onStatusChange(ad.id, 'draft')}
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{hideLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() => onStatusChange(ad.id, 'archived')}
                >
                  <Archive className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{archiveLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() => onStatusChange(ad.id, 'sold')}
                >
                  <DollarSign className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{soldLabel}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8"
                  onClick={() => onDelete(ad.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{deleteLabel}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
};
