"use client";

import React, { useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Car, Zap, Images } from "lucide-react";

export interface TestAdsGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (count: number, imageTypes: string[]) => Promise<void> | void;
  isLoading?: boolean;
}

type ImageTypeId =
  | "front"
  | "rear"
  | "side"
  | "top"
  | "interior";

interface ImageTypeOption {
  id: ImageTypeId;
  label: string;
}

const AVAILABLE_IMAGE_TYPES: ImageTypeOption[] = [
  { id: "front", label: "Front" },
  { id: "rear", label: "Rear" },
  { id: "side", label: "Side" },
  { id: "top", label: "Top" },
  { id: "interior", label: "Interior" },
];

const TestAdsGenerationModal: React.FC<TestAdsGenerationModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
  isLoading = false,
}) => {
  const { t } = useI18n();
  const [count, setCount] = useState<number>(10);
  const [selectedTypes, setSelectedTypes] = useState<ImageTypeId[]>(
    AVAILABLE_IMAGE_TYPES.map((t) => t.id)
  );

  const handleToggleType = (id: ImageTypeId) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedTypes((prev) =>
      prev.length === AVAILABLE_IMAGE_TYPES.length
        ? []
        : AVAILABLE_IMAGE_TYPES.map((t) => t.id)
    );
  };

  const handleGenerate = async () => {
    if (!count || count <= 0) return;

    const imageTypes =
      selectedTypes.length > 0
        ? selectedTypes
        : AVAILABLE_IMAGE_TYPES.map((t) => t.id);

    await onGenerate(count, imageTypes);
  };

  const handleClose = () => {
    if (isLoading) return;
    onClose();
  };

  const title =
    t("autoria.testAds.modalTitle") || "Створення тестових оголошень";
  const description =
    t("autoria.testAds.modalDescription") ||
    "Виберіть кількість та типи зображень для генерації демо-оголошень.";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Count input */}
          <div className="space-y-2">
            <Label htmlFor="test-ads-count" className="flex items-center gap-2">
              <Car className="h-4 w-4 text-blue-600" />
              {t("autoria.testAds.countLabel") || "Кількість оголошень"}
              <Badge variant="outline" className="ml-1 text-xs">
                1 - 50
              </Badge>
            </Label>
            <Input
              id="test-ads-count"
              type="number"
              min={1}
              max={50}
              value={Number.isNaN(count) ? "" : count}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (Number.isNaN(value)) {
                  setCount(0);
                } else {
                  setCount(Math.min(Math.max(value, 1), 50));
                }
              }}
            />
          </div>

          {/* Image types */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Images className="h-4 w-4 text-green-600" />
                {t("autoria.testAds.imageTypes.title") || "Типи зображень"}
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-blue-600"
                onClick={handleSelectAll}
              >
                {selectedTypes.length === AVAILABLE_IMAGE_TYPES.length
                  ? t("common.clear") || "Зняти всі"
                  : t("autoria.testAds.imageTypes.selectAll") || "Обрати всі"}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {AVAILABLE_IMAGE_TYPES.map((type) => {
                const active = selectedTypes.includes(type.id);
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleToggleType(type.id)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                      active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    <Images className="h-3 w-3" />
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            {t("common.cancel") || "Скасувати"}
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading || !count || count <= 0}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
                {t("autoria.testAds.creating") || "Створюємо..."}
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                {(t("autoria.testAds.generateButton") || "Згенерувати демо") +
                  " (" + count + ")"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TestAdsGenerationModal;
