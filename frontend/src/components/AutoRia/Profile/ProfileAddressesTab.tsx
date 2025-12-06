"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Edit, Plus, Trash2 } from "lucide-react";
import { VirtualSelect } from "@/components/ui/virtual-select";
import AddressCard from "@/components/AutoRia/AddressCard/AddressCard";
import type { ProfileAddressesTabProps } from "@/modules/autoria/profile/profilePage.types";

export const ProfileAddressesTab: React.FC<ProfileAddressesTabProps> = ({
  t,
  data,
  addressForm,
  editingAddress,
  updating,
  fetchRegions,
  fetchCities,
  handleRegionChange,
  handleCityChange,
  handleAddressSubmit,
  handleCancelEdit,
  handleDeleteAddress,
  handleEditAddress,
}) => {
  return (
    <div className="space-y-6">
      {/* Address Form with Selectors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {data?.addresses && data.addresses.length > 0
              ? editingAddress
                ? t("profile.address.edit")
                : t("profile.address.yourAddress")
              : t("profile.address.add")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Показываем форму только при редактировании или если адреса нет */}
          {(editingAddress || !data?.addresses || data.addresses.length === 0) ? (
            <form onSubmit={handleAddressSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="region">{t("profile.address.region")}</Label>
                  <VirtualSelect
                    value={addressForm.region}
                    onValueChange={(value, label) => {
                      const safeValue = value ?? "";
                      handleRegionChange(safeValue, label);
                    }}
                    placeholder={t("profile.address.regionPlaceholder")}
                    fetchOptions={fetchRegions}
                    searchPlaceholder={t("profile.address.searchRegion")}
                    emptyMessage={t("profile.address.noRegionsFound")}
                  />
                </div>

                <div>
                  <Label htmlFor="city">{t("profile.address.locality")}</Label>
                  <VirtualSelect
                    key={`city-${addressForm.region}`}
                    value={addressForm.city}
                    onValueChange={(value, label) => {
                      const safeValue = value ?? "";
                      handleCityChange(safeValue, label);
                    }}
                    placeholder={
                      !addressForm.region
                        ? t("profile.address.selectRegionFirst")
                        : t("profile.address.localityPlaceholder")
                    }
                    fetchOptions={
                      addressForm.region
                        ? (search: string) => fetchCities(search, addressForm.region)
                        : async () => []
                    }
                    disabled={!addressForm.region}
                    searchPlaceholder={t("profile.address.searchCity")}
                    emptyMessage={t("profile.address.noCitiesFound")}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={updating || !addressForm.region || !addressForm.city}
                >
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("profile.saving")}
                    </>
                  ) : (
                    <>
                      {editingAddress ? (
                        <Edit className="h-4 w-4 mr-2" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      {editingAddress
                        ? t("profile.address.save")
                        : t("profile.address.add")}
                    </>
                  )}
                </Button>

                {editingAddress && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    {t("profile.address.cancel")}
                  </Button>
                )}
              </div>
            </form>
          ) : (
            /* Показываем существующий адрес с кнопками управления */
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {data.addresses[0].input_locality}, {data.addresses[0].input_region}
                    </p>
                    {data.addresses[0].is_geocoded && (
                      <p className="text-sm text-gray-600">
                        ✅ {t("profile.address.verified")}:{" "}
                        {data.addresses[0].locality}, {data.addresses[0].region}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleEditAddress}>
                      <Edit className="h-4 w-4 mr-1" />
                      {t("profile.address.edit")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteAddress}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t("profile.address.delete")}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Address Details Card (показываем только если адрес есть и не редактируется) */}
      {data?.addresses && data.addresses.length > 0 && !editingAddress && (
        <AddressCard
          address={data.addresses[0]}
          onEdit={() => handleEditAddress()}
          onDelete={() => handleDeleteAddress()}
          showMap={false} // User can toggle map visibility
        />
      )}
    </div>
  );
};
