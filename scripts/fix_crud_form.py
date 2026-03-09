#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Append missing closing JSX to CRUDCarAdForm.tsx"""
import os

BASE = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src')
path = os.path.normpath(os.path.join(BASE, 'components/AutoRia/Forms/CRUDCarAdForm.tsx'))

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove trailing empty line and append missing content
content = content.rstrip('\n')

missing = """

              {/* Tab Content */}

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="p-6">
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="title">{t('autoria.title')} *</Label>
                    <Input
                      id="title"
                      value={formData.title || ''}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      placeholder={t('autoria.enterTitle')}
                      className={errors.title ? 'border-red-500' : ''}
                    />
                    {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                  </div>
                  <div>
                    <Label htmlFor="description">{t('autoria.description')} *</Label>
                    <Textarea
                      id="description"
                      value={formData.description || ''}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                      placeholder={t('autoria.enterDescription')}
                      rows={5}
                      className={errors.description ? 'border-red-500' : ''}
                    />
                    {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                  </div>
                </div>
              </TabsContent>

              {/* Specs Tab */}
              <TabsContent value="specs" className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>{t('autoria.vehicleType')} *</Label>
                    <VirtualSelect
                      value={formData.vehicle_type || ''}
                      onChange={(v) => handleFieldChange('vehicle_type', v)}
                      fetchOptions={fetchVehicleTypes}
                      placeholder={t('autoria.selectVehicleType')}
                      hasError={!!errors.vehicle_type}
                    />
                    {errors.vehicle_type && <p className="text-red-500 text-sm mt-1">{errors.vehicle_type}</p>}
                  </div>
                  <div>
                    <Label>{t('autoria.brand')} *</Label>
                    <VirtualSelect
                      value={formData.brand || ''}
                      onChange={(v) => handleFieldChange('brand', v)}
                      fetchOptions={fetchBrands}
                      placeholder={t('autoria.selectBrand')}
                      hasError={!!errors.brand}
                    />
                    {errors.brand && <p className="text-red-500 text-sm mt-1">{errors.brand}</p>}
                  </div>
                  <div>
                    <Label>{t('autoria.model')} *</Label>
                    <VirtualSelect
                      value={formData.model || ''}
                      onChange={(v) => handleFieldChange('model', v)}
                      fetchOptions={(s, p, ps) => fetchModels(formData.brand || '', s, p, ps)}
                      placeholder={t('autoria.selectModel')}
                      hasError={!!errors.model}
                    />
                    {errors.model && <p className="text-red-500 text-sm mt-1">{errors.model}</p>}
                  </div>
                  <div>
                    <Label htmlFor="year">{t('autoria.year')} *</Label>
                    <Input
                      id="year"
                      type="number"
                      value={formData.year || ''}
                      onChange={(e) => handleFieldChange('year', e.target.value)}
                      placeholder={t('autoria.enterYear')}
                      className={errors.year ? 'border-red-500' : ''}
                    />
                    {errors.year && <p className="text-red-500 text-sm mt-1">{errors.year}</p>}
                  </div>
                  <div>
                    <Label htmlFor="mileage">{t('autoria.mileage')}</Label>
                    <Input
                      id="mileage"
                      type="number"
                      value={formData.mileage || ''}
                      onChange={(e) => handleFieldChange('mileage', e.target.value)}
                      placeholder={t('autoria.enterMileage')}
                    />
                  </div>
                  <div>
                    <Label>{t('autoria.fuelType')}</Label>
                    <VirtualSelect
                      value={formData.fuel_type || ''}
                      onChange={(v) => handleFieldChange('fuel_type', v)}
                      fetchOptions={async () => ({ options: [
                        { value: 'petrol', label: t('fuelTypes.petrol') },
                        { value: 'diesel', label: t('fuelTypes.diesel') },
                        { value: 'gas', label: t('fuelTypes.gas') },
                        { value: 'hybrid', label: t('fuelTypes.hybrid') },
                        { value: 'electric', label: t('fuelTypes.electric') },
                      ], hasMore: false, total: 5 })}
                      placeholder={t('autoria.selectFuelType')}
                    />
                  </div>
                  <div>
                    <Label>{t('autoria.transmission')}</Label>
                    <VirtualSelect
                      value={formData.transmission || ''}
                      onChange={(v) => handleFieldChange('transmission', v)}
                      fetchOptions={async () => ({ options: [
                        { value: 'manual', label: t('transmissions.manual') },
                        { value: 'automatic', label: t('transmissions.automatic') },
                        { value: 'robot', label: t('transmissions.robot') },
                        { value: 'cvt', label: t('transmissions.cvt') },
                      ], hasMore: false, total: 4 })}
                      placeholder={t('autoria.selectTransmission')}
                    />
                  </div>
                  <div>
                    <Label>{t('autoria.color')}</Label>
                    <VirtualSelect
                      value={formData.color || ''}
                      onChange={(v) => handleFieldChange('color', v)}
                      fetchOptions={fetchColors}
                      placeholder={t('autoria.selectColor')}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Pricing Tab */}
              <TabsContent value="pricing" className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="price">{t('autoria.price')} *</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price || ''}
                      onChange={(e) => handleFieldChange('price', e.target.value)}
                      placeholder={t('autoria.enterPrice')}
                      className={errors.price ? 'border-red-500' : ''}
                    />
                    {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                  </div>
                  <div>
                    <Label>{t('autoria.currency')} *</Label>
                    <VirtualSelect
                      value={formData.currency || 'USD'}
                      onChange={(v) => handleFieldChange('currency', v)}
                      fetchOptions={async () => ({ options: [
                        { value: 'USD', label: 'USD' },
                        { value: 'EUR', label: 'EUR' },
                        { value: 'UAH', label: 'UAH' },
                      ], hasMore: false, total: 3 })}
                      placeholder={t('autoria.selectCurrency')}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Location Tab */}
              <TabsContent value="location" className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>{t('autoria.region')} *</Label>
                    <VirtualSelect
                      value={formData.region || ''}
                      onChange={(v) => handleFieldChange('region', v)}
                      fetchOptions={fetchRegions}
                      placeholder={t('autoria.selectRegion')}
                      hasError={!!errors.region}
                    />
                    {errors.region && <p className="text-red-500 text-sm mt-1">{errors.region}</p>}
                  </div>
                  <div>
                    <Label>{t('autoria.city')} *</Label>
                    <VirtualSelect
                      value={formData.city || ''}
                      onChange={(v) => handleFieldChange('city', v)}
                      fetchOptions={fetchCitiesForRegion}
                      placeholder={t('autoria.selectCity')}
                      hasError={!!errors.city}
                    />
                    {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                  </div>
                </div>
              </TabsContent>

              {/* Contact Tab */}
              <TabsContent value="contact" className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="contact_name">{t('autoria.contactTitle')} *</Label>
                    <Input
                      id="contact_name"
                      value={formData.contact_name || ''}
                      onChange={(e) => handleFieldChange('contact_name', e.target.value)}
                      className={errors.contact_name ? 'border-red-500' : ''}
                    />
                    {errors.contact_name && <p className="text-red-500 text-sm mt-1">{errors.contact_name}</p>}
                  </div>
                  <div>
                    <Label htmlFor="phone">{t('autoria.phone')} *</Label>
                    <Input
                      id="phone"
                      value={formData.phone || ''}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      className={errors.phone ? 'border-red-500' : ''}
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  </div>
                  <div>
                    <Label htmlFor="vin_code">{t('autoria.vinCode')}</Label>
                    <Input
                      id="vin_code"
                      value={formData.vin_code || ''}
                      onChange={(e) => handleFieldChange('vin_code', e.target.value)}
                      placeholder={t('autoria.enterVin')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="license_plate">{t('autoria.licensePlate')}</Label>
                    <Input
                      id="license_plate"
                      value={formData.license_plate || ''}
                      onChange={(e) => handleFieldChange('license_plate', e.target.value)}
                      placeholder={t('autoria.enterLicensePlate')}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Images Tab */}
              <TabsContent value="images" className="p-6">
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">{t('autoria.imagesDesc')}</p>
                </div>
              </TabsContent>

            </Tabs>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4 mt-6">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
          )}
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t('autoria.saving')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {mode === 'create' ? t('autoria.createAd') : t('autoria.saveChanges')}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CRUDCarAdForm;
"""

content = content + missing

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'[OK] CRUDCarAdForm.tsx: appended missing TabsContent and closing tags')

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()
print(f'[INFO] Total lines now: {len(lines)}')
