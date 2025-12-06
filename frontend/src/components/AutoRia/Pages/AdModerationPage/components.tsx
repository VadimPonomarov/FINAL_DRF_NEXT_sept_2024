"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Eye,
  Save
} from 'lucide-react';
import Link from 'next/link';
import { AdStatus } from '@/modules/autoria/shared/types/autoria';

export const LoadingState: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    </div>
  );
};

interface ErrorStateProps {
  loadError?: string;
  onReload: () => void;
  onBack: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ loadError, onReload, onBack }) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Error loading ad</h1>
        <p className="text-slate-600 mb-6 text-center max-w-md">{loadError}</p>
        <div className="flex gap-4">
          <Button onClick={onReload}>
            Try again
          </Button>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    </div>
  );
};

interface ModerationContentProps {
  adId: number;
  adData: any;
  isSaving: boolean;
  newStatus: AdStatus;
  moderationReason: string;
  setNewStatus: (status: AdStatus) => void;
  setModerationReason: (reason: string) => void;
  handleSaveModeration: () => Promise<void>;
  formatDate: (date: string) => string;
  t: (key: string, defaultValue?: string) => string;
  router: any;
}

const getStatusBadge = (status: string) => {
  const statusConfig = {
    active: { label: 'Active', variant: 'default' as const, icon: CheckCircle },
    pending: { label: 'Under moderation', variant: 'secondary' as const, icon: Clock },
    rejected: { label: 'Rejected', variant: 'destructive' as const, icon: XCircle },
    draft: { label: 'Draft', variant: 'outline' as const, icon: Clock }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

export const ModerationContent: React.FC<ModerationContentProps> = ({
  adId,
  adData,
  isSaving,
  newStatus,
  moderationReason,
  setNewStatus,
  setModerationReason,
  handleSaveModeration,
  formatDate,
  t,
  router,
}) => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/autoria/search')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <Link href={`/autoria/ads/view/${adId}`}>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-blue-600">Ad moderation</span>
        </div>
      </div>

      {/* Ad Summary */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl mb-2">{adData.title}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>ID: {adData.id}</span>
                <span>Created at: {formatDate(adData.created_at)}</span>
                {getStatusBadge(adData.status)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                ${adData.price} {adData.currency}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-600">Owner:</span>
              <div className="font-medium">{adData.user.email}</div>
            </div>
            <div>
              <span className="text-slate-600">Account type:</span>
              <div className="font-medium capitalize">{adData.user.account_type}</div>
            </div>
            <div>
              <span className="text-slate-600">Car:</span>
              <div className="font-medium">{adData.brand} {adData.model} {adData.year}</div>
            </div>
            <div>
              <span className="text-slate-600">Location:</span>
              <div className="font-medium">{adData.city}, {adData.region}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Moderation Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Moderation controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Current status
            </label>
            <div className="flex items-center gap-2">
              {getStatusBadge(adData.status)}
              {adData.moderated_at && (
                <span className="text-sm text-slate-600">
                  Moderated at: {formatDate(adData.moderated_at)}
                </span>
              )}
            </div>
          </div>

          {/* New Status */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              New status
            </label>
            <Select value={newStatus} onValueChange={(value) => setNewStatus(value as AdStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Active
                  </div>
                </SelectItem>
                <SelectItem value="pending">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    Under moderation
                  </div>
                </SelectItem>
                <SelectItem value="rejected">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    Rejected
                  </div>
                </SelectItem>
                <SelectItem value="draft">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-600" />
                    Draft
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Moderation Reason */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Moderation reason
            </label>
            <Textarea
              value={moderationReason}
              onChange={(e) => setModerationReason(e.target.value)}
              placeholder="Specify the reason for changing status..."
              rows={4}
            />
          </div>

          {/* Previous Moderation History */}
          {adData.moderation_reason && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Previous moderation reason:</strong><br />
                {adData.moderation_reason}
              </AlertDescription>
            </Alert>
          )}

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Link href={`/autoria/ads/view/${adId}`}>
              <Button variant="outline">
                Cancel
              </Button>
            </Link>
            
            <Button 
              onClick={handleSaveModeration}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save moderation
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
