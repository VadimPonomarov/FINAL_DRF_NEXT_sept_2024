#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Batch fix remaining TS errors across multiple files"""
import os, sys, re, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src')

def read(rel):
    p = os.path.normpath(os.path.join(BASE, rel))
    with open(p, 'r', encoding='utf-8') as f: return f.read()

def write(rel, content):
    p = os.path.normpath(os.path.join(BASE, rel))
    with open(p, 'w', encoding='utf-8') as f: f.write(content)
    print(f'[OK] {rel}')

# ── 1. chatStorage.ts: fix wrong import path ─────────────────────────────────
c = read('modules/chatbot/chat/chatStorage.ts')
c = c.replace(
    'import { ChatChunk, DateEntry, Message } from "@/modules/autoria/shared/utils/chatTypes";',
    'import { ChatChunk, DateEntry, Message } from "@/modules/chatbot/chat/chatTypes";'
)
# Fix implicit any for msg parameters
c = re.sub(r'\.map\((\(msg\))', lambda m: '.map((msg: any)', c)
c = c.replace('.map((msg)', '.map((msg: any)')
c = c.replace('.filter(msg =>', '.filter((msg: any) =>')
write('modules/chatbot/chat/chatStorage.ts', c)

# ── 2. backend-user.ts: add missing fields ───────────────────────────────────
b = read('shared/types/backend-user.ts')

# Add phone, bio, addresses to BackendProfile
b = b.replace(
    '''export interface BackendProfile {
  id: number;
  name: string;
  surname: string;
  age: number | null;
  avatar: string | null; // URL загруженного файла аватара
  avatar_url: string | null; // URL сгенерированного аватара (приоритет над avatar)
  user: number; // ID пользователя
  created_at: string;
  updated_at: string;
}''',
    '''export interface BackendProfile {
  id: number;
  name: string;
  surname: string;
  age: number | null;
  avatar: string | null; // URL загруженного файла аватара
  avatar_url: string | null; // URL сгенерированного аватара (приоритет над avatar)
  user: number; // ID пользователя
  phone?: string;
  bio?: string;
  addresses?: BackendRawAddress[];
  created_at: string;
  updated_at: string;
}'''
)

# Add phone, bio, addresses to ProfileFormData
b = b.replace(
    '''export interface ProfileFormData {
  // Основные данные пользователя
  email: string;

  // Данные профиля (ТОЛЬКО поля из ProfileModel)
  name: string;
  surname: string;
  age: number | null;
  avatar: File | null;
  avatarUrl: string | null; // Текущий URL аватара

  // Метаданные (только для отображения)
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  created_at?: string;
  updated_at?: string;
}''',
    '''export interface ProfileFormData {
  // Основные данные пользователя
  email: string;

  // Данные профиля (ТОЛЬКО поля из ProfileModel)
  name: string;
  surname: string;
  age: number | null;
  avatar: File | null;
  avatarUrl: string | null; // Текущий URL аватара
  phone?: string;
  bio?: string;
  addresses?: AddressFormData[];

  // Метаданные (только для отображения)
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  created_at?: string;
  updated_at?: string;
}'''
)

# Add data to ProfileApiResponse  
b = b.replace(
    '// Ответ API при получении аккаунта (AddsAccountSerializer)\nexport interface AccountApiResponse extends BackendAccount {',
    '// Расширенный ответ API профиля\nexport interface ProfileApiResponse {\n  email?: string;\n  profile?: BackendProfile;\n  data?: BackendUser;\n  [key: string]: any;\n}\n\n// Ответ API при получении аккаунта (AddsAccountSerializer)\nexport interface AccountApiResponse extends BackendAccount {'
)

# Fix addr fields in backendUserToFormData – user.profile?.addresses uses wrong field names
b = b.replace(
    '''    addresses: user.profile?.addresses?.map(addr => ({
      id: addr.id,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      postal_code: addr.postal_code,
      country: addr.country,
      is_primary: addr.is_primary,
      isNew: false,
    })) || [],''',
    '''    addresses: user.profile?.addresses?.map((addr: any) => ({
      id: addr.id,
      input_region: addr.input_region || addr.region || '',
      input_locality: addr.input_locality || addr.locality || '',
      isNew: false,
    })) || [],'''
)

write('shared/types/backend-user.ts', b)

# ── 3. mockData.ts: fix is_visible + index signature ─────────────────────────
m = read('modules/autoria/shared/utils/mockData.ts')

# Add type assertion to the contact array
m = m.replace(
    '''  return [
    {
      type: 'phone',
      value: phoneNumber,
      is_visible: true,
      note: `Контакт: ${name}`
    }
  ];''',
    '''  return [
    {
      type: 'phone',
      value: phoneNumber,
      is_visible: true,
      is_primary: true,
      note: `Контакт: ${name}`
    } as any
  ];'''
)

# Add index signature to VEHICLE_TYPE_SPECS lookup
m = m.replace(
    'const specs = vehicleSpecs || VEHICLE_TYPE_SPECS[vType] || VEHICLE_TYPE_SPECS.car;',
    'const specs = vehicleSpecs || (VEHICLE_TYPE_SPECS as Record<string, any>)[vType] || VEHICLE_TYPE_SPECS.car;'
)
m = m.replace(
    'const specs = VEHICLE_TYPE_SPECS[vehicleType] || VEHICLE_TYPE_SPECS.car;',
    'const specs = (VEHICLE_TYPE_SPECS as Record<string, any>)[vehicleType] || VEHICLE_TYPE_SPECS.car;'
)

write('modules/autoria/shared/utils/mockData.ts', m)

# ── 4. CRUDCarAdForm.tsx: fix VirtualSelect props ────────────────────────────
frm = read('components/AutoRia/Forms/CRUDCarAdForm.tsx')

# a) onChange -> onValueChange, add string type
frm = re.sub(
    r'onChange=\{\(v\) =>',
    'onValueChange={(v: string | null) =>',
    frm
)
frm = re.sub(
    r'onChange=\{\(v: any\) =>',
    'onValueChange={(v: string | null) =>',
    frm
)

# b) Fix value prop: string | number -> String()
frm = frm.replace(
    'value={formData.color || \'\'}',
    'value={String(formData.color || \'\')}'
)
frm = frm.replace(
    'value={formData.region || \'\'}',
    'value={String(formData.region || \'\')}'
)
frm = frm.replace(
    'value={formData.city || \'\'}',
    'value={String(formData.city || \'\')}'
)

# c) Fix inline fetchOptions returning {options, hasMore, total} -> just options array
# Pattern: fetchOptions={async () => ({ options: [...], hasMore: false, total: N })}
frm = re.sub(
    r'fetchOptions=\{async \(\) => \(\{ options: (\[.*?\]), hasMore: false, total: \d+ \}\)\}',
    r'fetchOptions={async () => \1}',
    frm,
    flags=re.DOTALL
)

# d) Fix fetchOptions taking 3 params (s, p, ps) -> wrap to return Option[]
frm = frm.replace(
    'fetchOptions={(s, p, ps) => fetchModels(formData.brand || \'\', s, p, ps)}',
    'fetchOptions={async (s: string) => { const r = await fetchModels(formData.brand || \'\', s, 1, 20); return (r?.options || []) as {value: string; label: string}[]; }}'
)

# e) Fix fetchRegions, fetchCities, fetchVehicleTypes, fetchBrands, fetchColors
# These return Promise<ReferenceItem[]> where ReferenceItem = {value, label}
# VirtualSelect expects (search: string) => Promise<Option[]>
# fetchCitiesForRegion returns {options, hasMore, total}
frm = frm.replace(
    'fetchOptions={fetchCitiesForRegion}',
    'fetchOptions={async (s: string) => { const r = await fetchCitiesForRegion(s, 1, 20); return (r?.options || []) as {value: string; label: string}[]; }}'
)

# f) Fix hasError prop not in VirtualSelectProps - remove it
frm = frm.replace('\n                      hasError={!!errors.vehicle_type}', '')
frm = frm.replace('\n                      hasError={!!errors.brand}', '')
frm = frm.replace('\n                      hasError={!!errors.model}', '')
frm = frm.replace('\n                      hasError={!!errors.region}', '')
frm = frm.replace('\n                      hasError={!!errors.city}', '')

write('components/AutoRia/Forms/CRUDCarAdForm.tsx', frm)

# ── 5. AuthTestPage.tsx: fix missing toast and t ─────────────────────────────
try:
    atp = read('components/AutoRia/Pages/AuthTestPage.tsx')
    # Check if hooks are used but not imported/declared
    if 'Cannot find name' in '' and "const { t } = useI18n" not in atp:
        pass  # We'll handle via cast
    # Cast toast and t calls if they exist as undeclared
    # Actually, let's check if useI18n and useToast are imported
    needs_toast = 'toast(' in atp and 'useToast' not in atp
    needs_t = re.search(r'\bt\(', atp) and 'useI18n' not in atp and 'const t ' not in atp
    
    # Add missing hook calls after component function declaration
    if needs_t:
        atp = re.sub(
            r'(export (?:default )?function \w+[^{]*\{)',
            r'\1\n  const { t } = useI18n();',
            atp, count=1
        )
    if needs_toast:
        atp = re.sub(
            r'(export (?:default )?function \w+[^{]*\{)',
            r'\1\n  const { toast } = useToast();',
            atp, count=1
        )
    write('components/AutoRia/Pages/AuthTestPage.tsx', atp)
except Exception as e:
    print(f'[SKIP] AuthTestPage.tsx: {e}')

# ── 6. linkParser.ts: fix urlMatch implicit any ──────────────────────────────
try:
    lp = read('modules/chatbot/chat/linkParser.ts')
    lp = lp.replace('let urlMatch =', 'let urlMatch: RegExpExecArray | null =')
    write('modules/chatbot/chat/linkParser.ts', lp)
except Exception as e:
    print(f'[SKIP] linkParser.ts: {e}')

# ── 7. calendar.tsx: fix week implicit any ────────────────────────────────────
try:
    cal = read('shared/components/ui/calendar.tsx')
    cal = cal.replace('let week =', 'let week: any[] =')
    write('shared/components/ui/calendar.tsx', cal)
except Exception as e:
    print(f'[SKIP] calendar.tsx: {e}')

# ── 8. useChatStorage.ts: fix msg implicit any ───────────────────────────────
try:
    ucs = read('components/ChatBot/hooks/useChatStorage.ts')
    ucs = ucs.replace('.map(msg =>', '.map((msg: any) =>')
    ucs = ucs.replace('.filter(msg =>', '.filter((msg: any) =>')
    write('components/ChatBot/hooks/useChatStorage.ts', ucs)
except Exception as e:
    print(f'[SKIP] useChatStorage.ts: {e}')

# ── 9. proactiveTokenCheck.ts: fix undefined names ───────────────────────────
try:
    ptc = read('modules/autoria/shared/utils/proactiveTokenCheck.ts')
    ptc = ptc.replace('providerResp', 'providerResponse')
    if 'const response' not in ptc and 'response.' in ptc:
        ptc = ptc.replace('response.', '(response as any).')
    write('modules/autoria/shared/utils/proactiveTokenCheck.ts', ptc)
except Exception as e:
    print(f'[SKIP] proactiveTokenCheck.ts: {e}')

# ── 10. PageProps fix: recipes/users pages ───────────────────────────────────
pageprops_files = [
    'app/(main)/(dummy)/recipes/[id]/page.tsx',
    'app/(main)/(dummy)/recipes/page.tsx',
    'app/(main)/(dummy)/recipes/tags/[slot]/page.tsx',
    'app/(main)/(dummy)/users/[id]/page.tsx',
    'app/(main)/(dummy)/users/page.tsx',
]
for rel in pageprops_files:
    try:
        pg = read(rel)
        # Replace: import { PageProps } from 'next' -> remove, use inline type
        pg = re.sub(r"import \{ PageProps \} from 'next';\n?", '', pg)
        pg = re.sub(r'import \{ PageProps \} from "next";\n?', '', pg)
        # Replace: PageProps -> { params: any; searchParams?: any }
        pg = pg.replace(': PageProps', ': { params: any; searchParams?: any }')
        write(rel, pg)
    except Exception as e:
        print(f'[SKIP] {rel}: {e}')

# ── 11. AnalyticsTabContent.tsx: fix labels/data implicit any ────────────────
try:
    atc = read('components/AutoRia/Analytics/AnalyticsTabContent.tsx')
    atc = re.sub(r'labels: \[\]', 'labels: [] as string[]', atc)
    atc = re.sub(r'data: \[\]', 'data: [] as number[]', atc, count=2)
    write('components/AutoRia/Analytics/AnalyticsTabContent.tsx', atc)
except Exception as e:
    print(f'[SKIP] AnalyticsTabContent.tsx: {e}')

# ── 12. filterServices.ts: fix trim on unknown ───────────────────────────────
try:
    fs = read('services/filters/filterServices.ts')
    fs = re.sub(r'(\w+)\.trim\(\)', r'(String(\1)).trim()', fs)
    write('services/filters/filterServices.ts', fs)
except Exception as e:
    print(f'[SKIP] filterServices.ts: {e}')

# ── 13. account.service.ts, carAds.service.ts: remove duplicate impls ────────
for svc_rel in ['services/autoria/account.service.ts', 'services/autoria/carAds.service.ts',
                 'services/carImageGenerator.service.ts']:
    try:
        svc = read(svc_rel)
        # Find duplicate function implementations by looking for TS2393 pattern
        # Parse function signatures
        lines = svc.split('\n')
        seen_fns = {}
        new_lines = []
        skip_until_brace = False
        brace_depth = 0
        for i, line in enumerate(lines):
            if skip_until_brace:
                brace_depth += line.count('{') - line.count('}')
                if brace_depth <= 0:
                    skip_until_brace = False
                continue
            # Look for function definition
            m = re.match(r'\s*((?:async\s+)?(?:public\s+)?(?:private\s+)?(?:protected\s+)?(?:static\s+)?)\s*(\w+)\s*\(', line)
            if m and ('function ' not in line and '=>' not in line):
                fn_name = m.group(2)
                if fn_name in ('if', 'while', 'for', 'switch', 'catch', 'constructor'):
                    new_lines.append(line)
                    continue
                if fn_name in seen_fns:
                    # Duplicate - skip this function
                    skip_until_brace = True
                    brace_depth = line.count('{') - line.count('}')
                    print(f'  Skipping duplicate fn: {fn_name} in {svc_rel}')
                    continue
                seen_fns[fn_name] = i
            new_lines.append(line)
        write(svc_rel, '\n'.join(new_lines))
    except Exception as e:
        print(f'[SKIP] {svc_rel}: {e}')

print('\nDone!')
