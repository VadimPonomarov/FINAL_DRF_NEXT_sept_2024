"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthProviderContext";
import { useToast } from "@/modules/autoria/shared/hooks/use-toast";

export interface UserModerationData {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_banned: boolean;
  banned_at?: string;
  banned_by?: number;
  banned_reason?: string;
  total_ads: number;
  active_ads: number;
  rejected_ads: number;
  last_login?: string;
  created_at: string;
}

export interface UseUserModerationPageStateResult {
  canModerate: boolean;
  users: UserModerationData[];
  loading: boolean;
  searchQuery: string;
  filterStatus: string;
  selectedUser: UserModerationData | null;
  setSearchQuery: (value: string) => void;
  setFilterStatus: (value: string) => void;
  setSelectedUser: (user: UserModerationData | null) => void;
  loadUsers: () => Promise<void>;
  banUser: (userId: number, reason: string) => Promise<void>;
  unbanUser: (userId: number) => Promise<void>;
}

export function useUserModerationPageState(): UseUserModerationPageStateResult {
  const { t } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserModerationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserModerationData | null>(null);

  const canModerate = useMemo(
    () => Boolean(user?.is_staff || user?.is_superuser),
    [user]
  );

  const loadUsers = useCallback(async () => {
    if (!canModerate) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: searchQuery,
        status: filterStatus,
        page_size: "50",
      });

      // TODO: Replace mock data with real API call when backend endpoint is ready
      // const response = await fetch(`/api/users/moderation?${params.toString()}`);
      // const result = await response.json();

      const mockUsers: UserModerationData[] = [
        {
          id: 1,
          email: "suspicious@example.com",
          first_name: "Suspicious",
          last_name: "User",
          is_active: true,
          is_banned: false,
          total_ads: 5,
          active_ads: 2,
          rejected_ads: 3,
          last_login: "2024-01-15T10:30:00Z",
          created_at: "2024-01-01T00:00:00Z",
        },
        {
          id: 2,
          email: "banned@example.com",
          first_name: "Banned",
          last_name: "User",
          is_active: false,
          is_banned: true,
          banned_at: "2024-01-10T15:45:00Z",
          banned_by: 1,
          banned_reason: "Multiple platform rules violations",
          total_ads: 8,
          active_ads: 0,
          rejected_ads: 8,
          last_login: "2024-01-10T14:20:00Z",
          created_at: "2023-12-01T00:00:00Z",
        },
      ];

      void params; // temporary to avoid unused variable warning until real API is wired

      setUsers(mockUsers);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[UserModeration] Failed to load users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [canModerate, searchQuery, filterStatus]);

  useEffect(() => {
    if (!canModerate) return;
    void loadUsers();
  }, [canModerate, loadUsers]);

  const banUser = useCallback(
    async (userId: number, reason: string) => {
      try {
        // TODO: Replace with real API call
        // eslint-disable-next-line no-console
        console.log(`[UserModeration] Banning user ${userId} with reason: ${reason}`);

        toast({
          title: `✅ ${t("common.success")}`,
          description: `${t("moderation.userBlocked")}: ${reason}`,
        });

        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, is_banned: true, is_active: false, banned_reason: reason }
              : u
          )
        );

        setSelectedUser(null);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[UserModeration] Error banning user:", error);
        toast({
          title: `❌ ${t("common.error")}`,
          description: t("moderation.errorBlocking"),
          variant: "destructive",
        });
      }
    },
    [t, toast]
  );

  const unbanUser = useCallback(
    async (userId: number) => {
      try {
        // TODO: Replace with real API call
        // eslint-disable-next-line no-console
        console.log(`[UserModeration] Unbanning user ${userId}`);

        toast({
          title: `✅ ${t("common.success")}`,
          description: t("moderation.userUnblocked"),
        });

        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, is_banned: false, is_active: true, banned_reason: undefined }
              : u
          )
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[UserModeration] Error unbanning user:", error);
        toast({
          title: `❌ ${t("common.error")}`,
          description: t("moderation.errorUnblocking"),
          variant: "destructive",
        });
      }
    },
    [t, toast]
  );

  return {
    canModerate,
    users,
    loading,
    searchQuery,
    filterStatus,
    selectedUser,
    setSearchQuery,
    setFilterStatus,
    setSelectedUser,
    loadUsers,
    banUser,
    unbanUser,
  };
}
