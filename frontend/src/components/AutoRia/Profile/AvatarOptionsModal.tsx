"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import type { AvatarOptionsModalProps } from "@/modules/autoria/profile/profilePage.types";

export const AvatarOptionsModal: React.FC<AvatarOptionsModalProps> = ({
  t,
  isOpen,
  avatarOptions,
  setAvatarOptions,
  isGeneratingAvatar,
  onClose,
  onGenerate,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl border"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">{t("profile.avatar.title")}</h3>

        <div className="space-y-4">
          {/* Style Selection */}
          <div>
            <Label htmlFor="avatar-style">{t("profile.avatar.style")}</Label>
            <Select
              value={avatarOptions.style}
              onValueChange={(value) =>
                setAvatarOptions((prev) => ({ ...prev, style: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("profile.avatar.selectStyle")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realistic">
                  {t("profile.avatar.styles.realistic")}
                </SelectItem>
                <SelectItem value="professional">
                  {t("profile.avatar.styles.professional")}
                </SelectItem>
                <SelectItem value="cartoon">
                  {t("profile.avatar.styles.cartoon")}
                </SelectItem>
                <SelectItem value="caricature">
                  {t("profile.avatar.styles.caricature")}
                </SelectItem>
                <SelectItem value="artistic">
                  {t("profile.avatar.styles.artistic")}
                </SelectItem>
                <SelectItem value="anime">
                  {t("profile.avatar.styles.anime")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Gender Selection */}
          <div>
            <Label htmlFor="avatar-gender">{t("profile.avatar.gender")}</Label>
            <Select
              value={avatarOptions.gender}
              onValueChange={(value) =>
                setAvatarOptions((prev) => ({ ...prev, gender: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("profile.avatar.selectGender")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">
                  {t("profile.avatar.genders.male")}
                </SelectItem>
                <SelectItem value="female">
                  {t("profile.avatar.genders.female")}
                </SelectItem>
                <SelectItem value="neutral">
                  {t("profile.avatar.genders.neutral")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Requirements */}
          <div>
            <Label htmlFor="custom-requirements">
              {t("profile.avatar.customRequirements")}
            </Label>
            <textarea
              id="custom-requirements"
              className="w-full p-2 border rounded-md resize-none placeholder:text-gray-500"
              rows={3}
              placeholder={t("profile.avatar.customPlaceholder")}
              value={avatarOptions.customRequirements}
              onChange={(e) =>
                setAvatarOptions((prev) => ({
                  ...prev,
                  customRequirements: e.target.value,
                }))
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              Example: "wearing glasses", "smiling", "formal suit", "outdoor background"
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            {t("profile.avatar.cancel")}
          </Button>
          <Button
            onClick={onGenerate}
            disabled={isGeneratingAvatar}
            className="flex-1"
          >
            {isGeneratingAvatar ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {t("profile.avatar.generate_button")}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
