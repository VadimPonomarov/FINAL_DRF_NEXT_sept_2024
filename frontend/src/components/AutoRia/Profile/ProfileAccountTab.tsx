"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Loader2, Shield } from "lucide-react";
import type { ProfileAccountTabProps } from "@/modules/autoria/profile/profilePage.types";

export const ProfileAccountTab: React.FC<ProfileAccountTabProps> = ({
  t,
  data,
  accountForm,
  setAccountForm,
  updating,
  handleAccountSubmit,
}) => {
  const isAdmin = Boolean(data?.user?.is_staff || data?.user?.is_superuser);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Building className="h-5 w-5" />
        <h3 className="text-lg font-semibold">{t("profile.accountSettings")}</h3>
      </div>

      {!isAdmin && (
        <Alert className="mb-4">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            {t("profile.account.adminOnlyFields")}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleAccountSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="account_type">{t("profile.account.type")}</Label>
            {isAdmin ? (
              <Select
                value={accountForm.account_type}
                onValueChange={(value) =>
                  setAccountForm((prev) => ({ ...prev, account_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("profile.account.selectAccountType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">{t("profile.accountTypes.basic")}</SelectItem>
                  <SelectItem value="premium">{t("profile.accountTypes.premium")}</SelectItem>
                  <SelectItem value="business">{t("profile.accountTypes.business")}</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600">
                {accountForm.account_type === "basic" && t("profile.accountTypes.basic")}
                {accountForm.account_type === "premium" && t("profile.accountTypes.premium")}
                {accountForm.account_type === "business" && t("profile.accountTypes.business")}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="role">{t("profile.account.role")}</Label>
            {isAdmin ? (
              <Select
                value={accountForm.role}
                onValueChange={(value) =>
                  setAccountForm((prev) => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("profile.account.selectRole")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seller">{t("profile.roles.seller")}</SelectItem>
                  <SelectItem value="buyer">{t("profile.roles.buyer")}</SelectItem>
                  <SelectItem value="dealer">{t("profile.roles.dealer")}</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600">
                {accountForm.role === "seller" && t("profile.roles.seller")}
                {accountForm.role === "buyer" && t("profile.roles.buyer")}
                {accountForm.role === "dealer" && t("profile.roles.dealer")}
              </div>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="organization_name">{t("profile.account.organizationName")}</Label>
          <Input
            id="organization_name"
            value={accountForm.organization_name}
            onChange={(e) =>
              setAccountForm((prev) => ({
                ...prev,
                organization_name: e.target.value,
              }))
            }
            placeholder={t("profile.account.orgPlaceholder")}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="moderation_level">{t("profile.account.moderationLevel")}</Label>
            {isAdmin ? (
              <Select
                value={accountForm.moderation_level}
                onValueChange={(value) =>
                  setAccountForm((prev) => ({ ...prev, moderation_level: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("profile.account.selectModerationLevel")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">{t("profile.moderationLevels.auto")}</SelectItem>
                  <SelectItem value="manual">{t("profile.moderationLevels.manual")}</SelectItem>
                  <SelectItem value="strict">{t("profile.moderationLevels.strict")}</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600">
                {accountForm.moderation_level === "auto" &&
                  t("profile.moderationLevels.auto")}
                {accountForm.moderation_level === "manual" &&
                  t("profile.moderationLevels.manual")}
                {accountForm.moderation_level === "strict" &&
                  t("profile.moderationLevels.strict")}
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 pt-6">
            <input
              type="checkbox"
              id="stats_enabled"
              checked={accountForm.stats_enabled}
              onChange={(e) =>
                setAccountForm((prev) => ({
                  ...prev,
                  stats_enabled: e.target.checked,
                }))
              }
              className="rounded"
            />
            <Label htmlFor="stats_enabled">{t("profile.account.enableStats")}</Label>
          </div>
        </div>

        {isAdmin && (
          <Button type="submit" disabled={updating}>
            {updating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("profile.account.saving")}
              </>
            ) : (
              t("profile.account.save")
            )}
          </Button>
        )}

        {/* Account Status */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              {t("profile.account.status")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.account ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">
                    {t("profile.account.accountId")}:
                  </span>
                  <span className="ml-2">{data.account.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    {t("profile.account.created")}:
                  </span>
                  <span className="ml-2">
                    {(() => {
                      try {
                        const date = new Date(data.account.created_at);
                        if (Number.isNaN(date.getTime())) {
                          const userDate = new Date(data.user.created_at);
                          return Number.isNaN(userDate.getTime())
                            ? "N/A"
                            : userDate.toLocaleDateString();
                        }
                        return date.toLocaleDateString();
                      } catch {
                        try {
                          const userDate = new Date(data.user.created_at);
                          return Number.isNaN(userDate.getTime())
                            ? "N/A"
                            : userDate.toLocaleDateString();
                        } catch {
                          return "N/A";
                        }
                      }
                    })()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                {t("profile.account.noAccount")}
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
};
