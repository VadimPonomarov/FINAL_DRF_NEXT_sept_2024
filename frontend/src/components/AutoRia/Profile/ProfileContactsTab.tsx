"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Edit, Loader2, Plus, Trash2 } from "lucide-react";
import { ContactTypeEnum } from "@/shared/types/backend-user";
import type { ProfileContactsTabProps } from "@/modules/autoria/profile/profilePage.types";

export const ProfileContactsTab: React.FC<ProfileContactsTabProps> = ({
  t,
  updating,
  editingContact,
  contactForm,
  setContactForm,
  memoizedContacts,
  handleContactSubmit,
  handleCancelContactEdit,
  handleEditContact,
  handleDeleteContact,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Building className="h-5 w-5" />
        <h3 className="text-lg font-semibold">{t("profile.contacts")}</h3>
      </div>

      {/* Contact Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {editingContact ? t("profile.contact.edit") : t("profile.contact.add")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleContactSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact-type">{t("profile.contact.type")}</Label>
                <Select
                  value={contactForm.contact_type}
                  onValueChange={(value) =>
                    setContactForm((prev) => ({
                      ...prev,
                      contact_type: value as ContactTypeEnum,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("profile.contact.selectType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ContactTypeEnum.PHONE}>
                      📞 {t("profile.contact.phone")}
                    </SelectItem>
                    <SelectItem value={ContactTypeEnum.EMAIL}>
                      📧 {t("profile.contact.email")}
                    </SelectItem>
                    <SelectItem value={ContactTypeEnum.TELEGRAM}>
                      📱 {t("profile.contact.telegram")}
                    </SelectItem>
                    <SelectItem value={ContactTypeEnum.VIBER}>
                      💜 {t("profile.contact.viber")}
                    </SelectItem>
                    <SelectItem value={ContactTypeEnum.WHATSAPP}>
                      💚 {t("profile.contact.whatsapp")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="contact-value">{t("profile.contact.value")}</Label>
                <Input
                  id="contact-value"
                  value={contactForm.contact_value}
                  onChange={(e) =>
                    setContactForm((prev) => ({
                      ...prev,
                      contact_value: e.target.value,
                    }))
                  }
                  placeholder={
                    contactForm.contact_type === ContactTypeEnum.PHONE
                      ? "+380501234567"
                      : contactForm.contact_type === ContactTypeEnum.EMAIL
                      ? "example@email.com"
                      : contactForm.contact_type === ContactTypeEnum.TELEGRAM
                      ? "@username"
                      : contactForm.contact_type === ContactTypeEnum.VIBER
                      ? "+380501234567"
                      : contactForm.contact_type === ContactTypeEnum.WHATSAPP
                      ? "+380501234567"
                      : t("profile.contact.valuePlaceholder")
                  }
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="contact-primary"
                checked={contactForm.is_primary}
                onChange={(e) =>
                  setContactForm((prev) => ({
                    ...prev,
                    is_primary: e.target.checked,
                  }))
                }
                className="rounded"
              />
              <Label htmlFor="contact-primary">
                {t("profile.contact.isPrimary", "Основной контакт")}
              </Label>
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={
                  !contactForm.contact_type ||
                  !contactForm.contact_value.trim() ||
                  updating
                }
              >
                {updating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : editingContact ? (
                  <Edit className="h-4 w-4 mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {editingContact
                  ? t("profile.contact.update")
                  : t("profile.contact.add")}
              </Button>

              {editingContact && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelContactEdit}
                >
                  {t("common.cancel")}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Contacts List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("profile.contact.list")}</CardTitle>
        </CardHeader>
        <CardContent>
          {memoizedContacts.length > 0 ? (
            <div className="space-y-3">
              {memoizedContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{contact.contact_type}</Badge>
                    <span>{contact.contact_value}</span>
                    {contact.is_primary && (
                      <Badge variant="default" className="text-xs">
                        {t("profile.contact.primary")}
                      </Badge>
                    )}
                    {contact.is_verified && (
                      <Badge
                        variant="outline"
                        className="text-green-600 border-green-600 text-xs"
                      >
                        ✅ {t("profile.contact.verified")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditContact(contact)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      {t("common.edit")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteContact(contact)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t("common.delete")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Building className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>{t("profile.contact.noContacts")}</p>
              <p className="text-sm">{t("profile.contact.addFirst")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
