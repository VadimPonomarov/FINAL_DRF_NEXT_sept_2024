import type React from "react";
import type { CarAd, AdStatus } from "@/modules/autoria/shared/types/autoria";
import type { MyAdsViewMode } from "./useMyAdsPageState";

export interface UseMyAdsPageStateResult {
  authLoading: boolean;
  isAuthenticated: boolean;
  authError: string | null;
  ads: CarAd[];
  loading: boolean;
  searchTerm: string;
  debouncedSearchTerm: string;
  statusFilter: string;
  sortBy: string;
  viewMode: MyAdsViewMode;
  selectedIds: Set<number>;
  selectAll: boolean;
  ownerEmail: string;
  formatPrice: (ad: CarAd) => string;
  setSearchTerm: (value: string) => void;
  setStatusFilter: (value: string) => void;
  setSortBy: (value: string) => void;
  setViewMode: (value: MyAdsViewMode) => void;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  setSelectAll: (value: boolean) => void;
  getStatusBadge: (status: AdStatus) => React.ReactNode;
  handleCardClick: (id: number) => void;
  handleOwnerStatusChange: (id: number, newStatus: AdStatus) => Promise<void>;
  bulkUpdateStatus: (ids: number[], newStatus: AdStatus) => Promise<void>;
  bulkDelete: (ids: number[]) => Promise<void>;
  deleteAd: (id: number) => Promise<void>;
}
