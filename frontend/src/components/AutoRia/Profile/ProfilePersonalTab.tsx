"use client";

import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, User, Upload } from "lucide-react";
import type { ProfilePersonalTabProps } from "@/modules/autoria/profile/profilePage.types";

export const ProfilePersonalTab: React.FC<ProfilePersonalTabProps> = ({
  t,
  data,
  loading,
  updating,
  cascadingProfile,
  profileForm,
  setProfileForm,
  fileInputRef,
  isGeneratingAvatar,
  setShowAvatarOptions,
  handleProfileSubmit,
  handleAvatarUpload,
}) => {
  const personalInfo = cascadingProfile.getPersonalInfo();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <User className="h-5 w-5" />
        <h3 className="text-lg font-semibold">{t("profile.personalInfo")}</h3>
        {personalInfo.loading && (
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        )}
      </div>

      {/* Cascading Data Display */}
      {personalInfo.data && (
        <Alert className="border-blue-200 bg-blue-50 mb-4">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Profile Completion:</span>
                <div className="text-lg font-bold">
                  {personalInfo.data.stats.profile_completion}%
                </div>
              </div>
              <div>
                <span className="font-medium">Addresses:</span>
                <div className="text-lg font-bold">
                  {personalInfo.data.stats.addresses_count}
                </div>
              </div>
              <div>
                <span className="font-medium">Account Age:</span>
                <div className="text-lg font-bold">
                  {personalInfo.data.stats.account_age_days} days
                </div>
              </div>
              <div>
                <span className="font-medium">Language:</span>
                <div className="text-lg font-bold">
                  {personalInfo.data.settings.language.toUpperCase()}
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Avatar Section */}
      <div className="flex items-center gap-4">
        <div className="relative">
          {loading ? (
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (() => {
            const avatarUrl = data?.user.profile?.avatar;

            return avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
            );
          })()}
        </div>

        <div>
          <div className="flex gap-2 mb-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={updating}
            >
              <Upload className="h-4 w-4 mr-2" />
              {t("profile.avatar.upload")}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAvatarOptions(true)}
              disabled={updating || isGeneratingAvatar}
            >
              {isGeneratingAvatar ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {isGeneratingAvatar
                ? t("profile.avatar.generating")
                : t("profile.avatar.generate")}
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
          <p className="text-sm text-muted-foreground">
            {t("profile.avatar.fileInfo")}
          </p>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleProfileSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">{t("profile.form.firstName")}</Label>
            <Input
              id="name"
              value={profileForm.name}
              onChange={(e) =>
                setProfileForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder={t("profile.form.firstNamePlaceholder")}
            />
          </div>

          <div>
            <Label htmlFor="surname">{t("profile.form.lastName")}</Label>
            <Input
              id="surname"
              value={profileForm.surname}
              onChange={(e) =>
                setProfileForm((prev) => ({ ...prev, surname: e.target.value }))
              }
              placeholder={t("profile.form.lastNamePlaceholder")}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="age">{t("profile.form.age")}</Label>
          <Input
            id="age"
            type="number"
            min="18"
            max="100"
            value={profileForm.age || ""}
            onChange={(e) =>
              setProfileForm((prev) => ({
                ...prev,
                age: e.target.value ? parseInt(e.target.value, 10) : null,
              }))
            }
            placeholder={t("profile.form.agePlaceholder")}
          />
        </div>

        <div>
          <Label>{t("profile.form.email")}</Label>
          <Input
            value={data?.user.email || (loading ? "Загрузка..." : "Email не найден")}
            disabled
            className="bg-muted"
          />
          <p className="text-sm text-muted-foreground mt-1">
            {t("profile.form.emailNote")}
          </p>
        </div>

        <Button type="submit" disabled={updating}>
          {updating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t("profile.form.saving")}
            </>
          ) : (
            t("profile.form.save")
          )}
        </Button>
      </form>
    </div>
  );
};
