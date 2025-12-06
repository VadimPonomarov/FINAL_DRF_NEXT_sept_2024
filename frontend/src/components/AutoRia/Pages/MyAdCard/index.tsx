'use client';

import React, { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Eye, Edit, Trash2, EyeOff, Archive, Check, DollarSign, Calendar, MapPin, Gauge, Fuel, Mail } from 'lucide-react';
import type { CarAd, AdStatus } from '@/modules/autoria/shared/types/autoria';

export interface MyAdCardProps {
  ad: CarAd;
  onClick: (id: number) => void;
  onDelete: (id: number) => Promise<void> | void;
  onStatusChange: (id: number, status: AdStatus) => Promise<void> | void;
  formatPrice: (ad: CarAd) => string;
  selected: boolean;
  onToggleSelected: (id: number, checked: boolean) => void;
  viewLabel: string;
  editLabel: string;
  activateLabel: string;
  hideLabel: string;
  archiveLabel: string;
  soldLabel: string;
  deleteLabel: string;
  getStatusBadge: (status: AdStatus) => React.ReactNode;
  ownerEmail?: string;
}

export const MyAdCard: React.FC<MyAdCardProps> = memo(
  ({
    ad,
    onClick,
    onDelete,
    onStatusChange,
    formatPrice,
    selected,
    onToggleSelected,
    viewLabel,
    editLabel,
    activateLabel,
    hideLabel,
    archiveLabel,
    soldLabel,
    deleteLabel,
    getStatusBadge,
    ownerEmail,
  }) => {
    return (
      <Card className="hover:shadow-lg transition-shadow duration-300 group">
        <CardContent className="p-0">
          <div className="block">
            <div className="w-full h-48 relative">
              <img
                src={ad.images?.[0]?.image_display_url || ad.images?.[0]?.image || '/api/placeholder/400/300'}
                alt={ad.title}
                className="w-full h-full object-cover rounded-t-lg cursor-pointer"
                onClick={() => onClick(ad.id)}
              />
              <div className="absolute top-2 left-2 bg-white/90 rounded px-1.5 py-1 shadow">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) => onToggleSelected(ad.id, e.target.checked)}
                />
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-slate-900 line-clamp-1">
                    {ad.mark_name} {ad.model}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                    <MapPin className="h-3 w-3" />
                    <span>{ad.city_name}</span>
                  </div>
                  {ownerEmail && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-2" title={ownerEmail}>
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{ownerEmail}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-blue-600 tabular-nums">{formatPrice(ad)}</div>
                  <div className="mt-1">{getStatusBadge(ad.status)}</div>
                </div>
              </div>

              <p className="text-slate-600 text-sm mb-3 line-clamp-2">{ad.description}</p>

              <div className="flex flex-wrap gap-2 mb-3">
                {ad.dynamic_fields?.year && (
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    {ad.dynamic_fields.year}
                  </Badge>
                )}
                {ad.dynamic_fields?.mileage && (
                  <Badge variant="outline" className="text-xs">
                    <Gauge className="h-3 w-3 mr-1" />
                    {ad.dynamic_fields.mileage.toLocaleString()} km
                  </Badge>
                )}
                {ad.dynamic_fields?.fuel_type && (
                  <Badge variant="outline" className="text-xs">
                    <Fuel className="h-3 w-3 mr-1" />
                    {ad.dynamic_fields.fuel_type}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
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
                        variant="outline"
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
                      <Button
                        size="icon"
                        onClick={() => onStatusChange(ad.id, 'active')}
                        className="h-8 w-8"
                        variant="default"
                      >
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
                        onClick={() => onStatusChange(ad.id, 'draft')}
                        className="h-8 w-8"
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
                        onClick={() => onStatusChange(ad.id, 'archived')}
                        className="h-8 w-8"
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
                        onClick={() => onStatusChange(ad.id, 'sold')}
                        className="h-8 w-8"
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
                        onClick={() => onDelete(ad.id)}
                        className="h-8 w-8"
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
        </CardContent>
      </Card>
    );
  },
);
