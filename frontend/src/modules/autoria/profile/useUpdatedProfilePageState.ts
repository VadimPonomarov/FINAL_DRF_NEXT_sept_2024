"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { useI18n } from "@/contexts/I18nContext";
import { useAuthErrorHandler } from "@/modules/autoria/shared/hooks/useAuthErrorHandler";
import { useToast } from "@/modules/autoria/shared/hooks/use-toast";
import { useUserProfileData } from "@/modules/autoria/shared/hooks/useUserProfileData";
import { useVirtualReferenceData } from "@/modules/autoria/shared/hooks/useVirtualReferenceData";
import { useCascadingProfile } from "@/modules/autoria/shared/hooks/useCascadingProfile";
import { alertHelpers } from "@/components/ui/alert-dialog-helper";
import type {
  FullUserProfileData,
  ProfileUpdateData,
  AccountUpdateData,
  RawAddressUpdateData,
  ContactUpdateData,
  ContactTypeEnum,
  BackendAccountContact,
  BackendRawAddress,
} from "@/shared/types/backend-user";

export type UpdatedProfileActiveTab = "profile" | "account" | "addresses" | "contacts";

export interface ProfileFormState {
  name: string;
  surname: string;
  age: number | null;
}

export interface AccountFormState {
  account_type: string;
  moderation_level: string;
  role: string;
  organization_name: string;
  stats_enabled: boolean;
}

export interface AddressFormState {
  region: string;
  city: string;
  input_region: string;
  input_locality: string;
}

export interface ContactFormState {
  contact_type: ContactTypeEnum;
  contact_value: string;
  is_primary: boolean;
  is_visible: boolean;
}

export interface AvatarOptionsState {
  style: string;
  gender: string;
  customRequirements: string;
}

export interface UseUpdatedProfilePageStateResult {
  data: FullUserProfileData | null;
  loading: boolean;
  error: string | null;
  updating: boolean;
  activeTab: UpdatedProfileActiveTab;
  handleTabChange: (tabValue: string) => Promise<void>;
  cascadingProfile: ReturnType<typeof useCascadingProfile>;
  hasProfile: boolean;
  hasAccount: boolean;
  addressCount: number;
  contactCount: number;
  profileForm: ProfileFormState;
  setProfileForm: React.Dispatch<React.SetStateAction<ProfileFormState>>;
  accountForm: AccountFormState;
  setAccountForm: React.Dispatch<React.SetStateAction<AccountFormState>>;
  addressForm: AddressFormState;
  setAddressForm: React.Dispatch<React.SetStateAction<AddressFormState>>;
  editingAddress: boolean;
  handleAddressSubmit: (e: React.FormEvent) => Promise<void>;
  handleEditAddress: () => void;
  handleCancelEdit: () => void;
  handleDeleteAddress: () => Promise<void>;
  fetchRegions: ReturnType<typeof useVirtualReferenceData>["fetchRegions"];
  fetchCities: ReturnType<typeof useVirtualReferenceData>["fetchCities"];
  handleRegionChange: (regionId: string, regionLabel?: string) => Promise<void> | void;
  handleCityChange: (cityId: string, cityLabel?: string) => Promise<void> | void;
  editingContact: number | null;
  contactForm: ContactFormState;
  setContactForm: React.Dispatch<React.SetStateAction<ContactFormState>>;
  handleContactSubmit: (e: React.FormEvent) => Promise<void>;
  handleEditContact: (contact: BackendAccountContact) => void;
  handleCancelContactEdit: () => void;
  handleDeleteContact: (contact: BackendAccountContact) => Promise<void>;
  memoizedContacts: BackendAccountContact[];
  memoizedAddresses: BackendRawAddress[];
  isGeneratingAvatar: boolean;
  showAvatarOptions: boolean;
  setShowAvatarOptions: (show: boolean) => void;
  avatarOptions: AvatarOptionsState;
  setAvatarOptions: React.Dispatch<React.SetStateAction<AvatarOptionsState>>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleProfileSubmit: (e: React.FormEvent) => Promise<void>;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleAccountSubmit: (e: React.FormEvent) => Promise<void>;
  handleGenerateAvatar: () => Promise<void>;
}

export function useUpdatedProfilePageState(): UseUpdatedProfilePageStateResult {
  const { t } = useI18n();
  const { handleAuthError } = useAuthErrorHandler();
  const { toast } = useToast();

  const {
    data,
    loading,
    error,
    updating,
    loadUserData,
    updateProfile,
    updateAccount,
    uploadAvatar,
    createAddress,
    updateAddress,
    deleteAddress,
    createContact,
    updateContact,
    deleteContact,
    updateAvatarUrl,
    mutate,
    hasProfile,
    hasAccount,
    addressCount,
    contactCount,
  } = useUserProfileData();

  const cascadingProfile = useCascadingProfile();
  const [activeTab, setActiveTab] = useState<UpdatedProfileActiveTab>("profile");

  const handleTabChange = async (tabValue: string) => {
    const tabName = tabValue as UpdatedProfileActiveTab;
    setActiveTab(tabName);

    const tabMapping: Record<UpdatedProfileActiveTab, "personal-info" | "account-settings" | "addresses" | "contacts"> = {
      profile: "personal-info",
      account: "account-settings",
      addresses: "addresses",
      contacts: "contacts",
    };

    const cascadingTabName = tabMapping[tabName];
    if (cascadingTabName) {
      // eslint-disable-next-line no-console
      console.log(`[UpdatedProfilePage]  Loading data for tab: ${cascadingTabName}`);
      await cascadingProfile.loadTabData(cascadingTabName);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      await handleTabChange(activeTab);
    };
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    name: "",
    surname: "",
    age: null,
  });

  const [accountForm, setAccountForm] = useState<AccountFormState>({
    account_type: "basic",
    moderation_level: "auto",
    role: "seller",
    organization_name: "",
    stats_enabled: false,
  });

  const [addressForm, setAddressForm] = useState<AddressFormState>({
    region: "",
    city: "",
    input_region: "",
    input_locality: "",
  });

  const [editingContact, setEditingContact] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState<ContactFormState>({
    contact_type: ("phone" as ContactTypeEnum),
    contact_value: "",
    is_primary: false,
    is_visible: true,
  });

  const { fetchRegions, fetchCities } = useVirtualReferenceData();

  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [showAvatarOptions, setShowAvatarOptions] = useState(false);
  const [avatarOptions, setAvatarOptions] = useState<AvatarOptionsState>({
    style: "realistic",
    gender: "neutral",
    customRequirements: "",
  });

  const [editingAddress, setEditingAddress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const memoizedContacts = useMemo<BackendAccountContact[]>(() => {
    if (!data?.contacts) return [];
    return data.contacts;
  }, [data?.contacts]);

  const memoizedAddresses = useMemo<BackendRawAddress[]>(() => {
    if (!data?.addresses) return [];
    return data.addresses;
  }, [data?.addresses]);

  useEffect(() => {
    if (data?.user.profile) {
      setProfileForm({
        name: data.user.profile.name || "",
        surname: data.user.profile.surname || "",
        age: data.user.profile.age,
      });
    }

    if (data?.account) {
      setAccountForm({
        account_type: data.account.account_type || "basic",
        moderation_level: data.account.moderation_level || "auto",
        role: data.account.role || "seller",
        organization_name: data.account.organization_name || "",
        stats_enabled: data.account.stats_enabled || false,
      });
    }

    if (data?.addresses && data.addresses.length > 0) {
      const firstAddress = data.addresses[0];
      setAddressForm({
        region: "",
        city: "",
        input_region: firstAddress.input_region || "",
        input_locality: firstAddress.input_locality || "",
      });
    }
  }, [data]);

  useEffect(() => {
    if (error && (error.includes("Authentication required") || error.includes("401"))) {
      // eslint-disable-next-line no-console
      console.log("[ProfilePage] Authentication error detected, handling...");
      handleAuthError(new Error(error));
    }
  }, [error, handleAuthError]);

  const validateProfileForm = () => {
    const errors: string[] = [];

    if (!profileForm.name.trim()) {
      errors.push(t("profile.form.firstName"));
    }

    if (!profileForm.surname.trim()) {
      errors.push(t("profile.form.lastName"));
    }

    if (!profileForm.age || profileForm.age < 18 || profileForm.age > 100) {
      errors.push(`${t("profile.form.age")} (18-100)`);
    }

    return errors;
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateProfileForm();
    if (validationErrors.length > 0) {
      toast({
        title: t("common.validation.error"),
        description:
          `${t("common.validation.requiredFields") || "Fill in required fields"}: ${validationErrors.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const profileData: ProfileUpdateData = {
      name: profileForm.name,
      surname: profileForm.surname,
      age: profileForm.age,
    };

    const currentAvatar = data?.user.profile?.avatar;
    if (currentAvatar) {
      profileData.avatar_url = currentAvatar;
    } else {
      // eslint-disable-next-line no-console
      console.log("[ProfilePage] No avatar found to include in profile data");
    }

    try {
      await updateProfile(profileData);
      toast({
        title: t("common.success"),
        description: t("profile.form.updateSuccess"),
      });
    } catch (updateError) {
      // eslint-disable-next-line no-console
      console.error("[ProfilePage] Failed to update profile:", updateError);
      toast({
        title: t("common.error"),
        description: t("profile.form.updateError"),
        variant: "destructive",
      });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadAvatar(file);
    } catch (uploadError) {
      // eslint-disable-next-line no-console
      console.error("Failed to upload avatar:", uploadError);
    }
  };

  const validateAccountForm = () => {
    const errors: string[] = [];

    if (!accountForm.account_type) {
      errors.push(t("profile.account.type"));
    }

    if (!accountForm.moderation_level) {
      errors.push(t("profile.account.moderationLevel"));
    }

    if (!accountForm.role) {
      errors.push(t("profile.account.role"));
    }

    return errors;
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateAccountForm();
    if (validationErrors.length > 0) {
      toast({
        title: t("common.validation.error"),
        description: `${t("common.validation.requiredFields")}: ${validationErrors.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const accountData: AccountUpdateData = {
      account_type: accountForm.account_type as AccountUpdateData["account_type"],
      moderation_level: accountForm.moderation_level as AccountUpdateData["moderation_level"],
      role: accountForm.role as AccountUpdateData["role"],
      organization_name: accountForm.organization_name,
      stats_enabled: accountForm.stats_enabled,
    };

    try {
      await updateAccount(accountData);
      toast({
        title: t("common.success"),
        description: t("profile.account.updateSuccess"),
      });
    } catch (updateError) {
      // eslint-disable-next-line no-console
      console.error("Failed to update account:", updateError);
      toast({
        title: t("common.error"),
        description: t("profile.account.updateError"),
        variant: "destructive",
      });
    }
  };

  const validateAddressForm = () => {
    const errors: string[] = [];

    if (!addressForm.input_region.trim()) {
      errors.push(t("profile.address.region"));
    }

    if (!addressForm.input_locality.trim()) {
      errors.push(t("profile.address.locality"));
    }

    return errors;
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateAddressForm();
    if (validationErrors.length > 0) {
      toast({
        title: t("common.validation.error"),
        description: `${t("common.validation.requiredFields")}: ${validationErrors.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const addressData: RawAddressUpdateData = {
      input_region: addressForm.input_region,
      input_locality: addressForm.input_locality,
    };

    try {
      if (data?.addresses && data.addresses.length > 0) {
        await updateAddress(data.addresses[0].id, addressData);
      } else {
        await createAddress(addressData);
      }

      setEditingAddress(false);
      toast({
        title: t("common.success"),
        description: t("profile.address.updateSuccess"),
      });
    } catch (saveError) {
      // eslint-disable-next-line no-console
      console.error("Failed to save address:", saveError);
    }
  };

  const handleEditAddress = () => {
    setEditingAddress(true);
  };

  const handleCancelEdit = () => {
    if (data?.addresses && data.addresses.length > 0) {
      const address = data.addresses[0];
      setAddressForm({
        region: "",
        city: "",
        input_region: address.input_region || "",
        input_locality: address.input_locality || "",
      });
    }
    setEditingAddress(false);
  };

  const handleDeleteAddress = async () => {
    if (data?.addresses && data.addresses.length > 0) {
      const confirmed = await alertHelpers.confirmDelete(
        t("profile.address.thisAddress") || "цю адресу",
      );
      if (confirmed) {
        try {
          await deleteAddress(data.addresses[0].id);
          setAddressForm({
            region: "",
            city: "",
            input_region: "",
            input_locality: "",
          });
        } catch (deleteError) {
          // eslint-disable-next-line no-console
          console.error("Failed to delete address:", deleteError);
        }
      }
    }
  };

  const handleRegionChange = async (regionId: string, regionLabel?: string) => {
    setAddressForm((prev) => ({
      ...prev,
      region: regionId,
      city: "",
      input_region: regionLabel || "",
      input_locality: "",
    }));
  };

  const handleCityChange = async (cityId: string, cityLabel?: string) => {
    setAddressForm((prev) => ({
      ...prev,
      city: cityId,
      input_locality: cityLabel || "",
    }));
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contactForm.contact_value.trim()) {
      toast({
        title: t("common.error"),
        description: t("profile.contact.enterValue", "Enter contact value"),
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingContact) {
        await updateContact(editingContact, contactForm as ContactUpdateData);
      } else {
        await createContact(contactForm);
      }

      setContactForm({
        contact_type: ("phone" as ContactTypeEnum),
        contact_value: "",
        is_primary: false,
        is_visible: true,
      });
      setEditingContact(null);

      await loadUserData();

      toast({
        title: t("common.success"),
        description: editingContact
          ? t("profile.contact.updated", "Contact updated")
          : t("profile.contact.added", "Contact added"),
        variant: "default",
      });
    } catch (contactError) {
      // eslint-disable-next-line no-console
      console.error("[ProfilePage] Failed to save contact:", contactError);

      let errorMessage = t("profile.contact.saveError", "Could not save contact");

      if (contactError instanceof Error) {
        if (contactError.message.includes("account not found")) {
          errorMessage = t("profile.contact.needAccount", "Please fill in account details first");
        } else if (contactError.message.includes("required")) {
          errorMessage = t("common.validation.requiredFields", "Fill in all required fields");
        } else {
          errorMessage = contactError.message;
        }
      }

      toast({
        title: t("common.error"),
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleEditContact = (contact: BackendAccountContact) => {
    setEditingContact(contact.id);
    setContactForm({
      contact_type: contact.contact_type,
      contact_value: contact.contact_value || "",
      is_primary: contact.is_primary || false,
      is_visible: contact.is_visible !== false,
    });
  };

  const handleCancelContactEdit = () => {
    setEditingContact(null);
    setContactForm({
      contact_type: ("phone" as ContactTypeEnum),
      contact_value: "",
      is_primary: false,
      is_visible: true,
    });
  };

  const handleDeleteContact = async (contact: BackendAccountContact) => {
    const confirmed = await alertHelpers.confirmDelete(
      t("profile.contact.thisContact") || "цей контакт",
    );
    if (!confirmed) return;

    try {
      await deleteContact(contact.id);
      toast({
        title: t("common.success"),
        description: t("profile.contact.deleteSuccess"),
      });
    } catch (deleteError) {
      // eslint-disable-next-line no-console
      console.error("Failed to delete contact:", deleteError);
      toast({
        title: t("common.error"),
        description: t("profile.contact.deleteError"),
        variant: "destructive",
      });
    }
  };

  const handleGenerateAvatar = async () => {
    setIsGeneratingAvatar(true);

    try {
      const profileData = data?.user?.profile
        ? {
            first_name: data.user.profile.name || "Person",
            last_name: data.user.profile.surname || "",
            age: data.user.profile.age || 25,
            gender: (data.user.profile as unknown as { gender?: string }).gender || "neutral",
          }
        : {
            first_name: "Person",
            last_name: "",
            age: 25,
            gender: "neutral",
          };

      const response = await fetch("/api/user/profile/generate-avatar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...profileData,
          style: avatarOptions.style,
          gender: avatarOptions.gender,
          custom_requirements: avatarOptions.customRequirements,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Avatar generation failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        try {
          const saveResponse = await fetch("/api/user/profile/save-avatar", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              avatar_url: result.avatar_url,
            }),
          });

          if (saveResponse.ok) {
            const saveResult = await saveResponse.json();

            const localAvatarUrl = saveResult.profile?.avatar_url || result.avatar_url;
            updateAvatarUrl(localAvatarUrl);

            await mutate();

            toast({
              title: `✅ ${t("common.success")}`,
              description: t("profile.avatar.success"),
            });
          } else {
            const saveError = await saveResponse.json();
            // eslint-disable-next-line no-console
            console.error("Failed to save avatar to profile:", saveError);

            updateAvatarUrl(result.avatar_url);

            toast({
              title: `✅ ${t("common.success")}`,
              description: `${t("profile.avatar.success")} (${t("profile.avatar.saveWarning")})`,
            });
          }
        } catch (saveError) {
          // eslint-disable-next-line no-console
          console.error("Error saving avatar to profile:", saveError);

          updateAvatarUrl(result.avatar_url);

          toast({
            title: `✅ ${t("common.success")}`,
            description: `${t("profile.avatar.success")} (${t("profile.avatar.saveWarning")})`,
          });
        }
      } else {
        toast({
          title: `❌ ${t("common.error")}`,
          description: `${t("profile.avatar.failed")}: ${result.error}`,
          variant: "destructive",
        });
      }
    } catch (generateError) {
      // eslint-disable-next-line no-console
      console.error("Error generating avatar:", generateError);
      const errorMessage =
        generateError instanceof Error ? generateError.message : "Unknown error occurred";
      toast({
        title: `❌ ${t("common.error")}`,
        description: `${t("profile.avatar.failed")}: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  return {
    data: data as FullUserProfileData | null,
    loading,
    error,
    updating,
    activeTab,
    handleTabChange,
    cascadingProfile,
    hasProfile,
    hasAccount,
    addressCount,
    contactCount,
    profileForm,
    setProfileForm,
    accountForm,
    setAccountForm,
    addressForm,
    setAddressForm,
    editingAddress,
    handleAddressSubmit,
    handleEditAddress,
    handleCancelEdit,
    handleDeleteAddress,
    fetchRegions,
    fetchCities,
    handleRegionChange,
    handleCityChange,
    editingContact,
    contactForm,
    setContactForm,
    handleContactSubmit,
    handleEditContact,
    handleCancelContactEdit,
    handleDeleteContact,
    memoizedContacts,
    memoizedAddresses,
    isGeneratingAvatar,
    showAvatarOptions,
    setShowAvatarOptions,
    avatarOptions,
    setAvatarOptions,
    fileInputRef,
    handleProfileSubmit,
    handleAvatarUpload,
    handleAccountSubmit,
    handleGenerateAvatar,
  };
}
