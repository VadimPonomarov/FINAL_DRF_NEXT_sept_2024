import type { TranslationFunction } from "@/lib/i18n";
import type {
  UseUpdatedProfilePageStateResult,
  AvatarOptionsState,
} from "@/modules/autoria/profile/useUpdatedProfilePageState";

export type ProfilePersonalTabProps = {
  t: TranslationFunction;
} & Pick<
  UseUpdatedProfilePageStateResult,
  | "data"
  | "loading"
  | "updating"
  | "cascadingProfile"
  | "profileForm"
  | "setProfileForm"
  | "fileInputRef"
  | "isGeneratingAvatar"
  | "setShowAvatarOptions"
  | "handleProfileSubmit"
  | "handleAvatarUpload"
>;

export type ProfileAccountTabProps = {
  t: TranslationFunction;
} & Pick<
  UseUpdatedProfilePageStateResult,
  | "data"
  | "accountForm"
  | "setAccountForm"
  | "updating"
  | "handleAccountSubmit"
>;

export type ProfileAddressesTabProps = {
  t: TranslationFunction;
} & Pick<
  UseUpdatedProfilePageStateResult,
  | "data"
  | "addressForm"
  | "editingAddress"
  | "updating"
  | "fetchRegions"
  | "fetchCities"
  | "handleRegionChange"
  | "handleCityChange"
  | "handleAddressSubmit"
  | "handleCancelEdit"
  | "handleDeleteAddress"
  | "handleEditAddress"
>;

export type ProfileContactsTabProps = {
  t: TranslationFunction;
} & Pick<
  UseUpdatedProfilePageStateResult,
  | "updating"
  | "editingContact"
  | "contactForm"
  | "setContactForm"
  | "memoizedContacts"
  | "handleContactSubmit"
  | "handleCancelContactEdit"
  | "handleEditContact"
  | "handleDeleteContact"
>;

export interface AvatarOptionsModalProps {
  t: TranslationFunction;
  isOpen: boolean;
  avatarOptions: AvatarOptionsState;
  setAvatarOptions: UseUpdatedProfilePageStateResult["setAvatarOptions"];
  isGeneratingAvatar: boolean;
  onClose: () => void;
  onGenerate: () => void;
}
