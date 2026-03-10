#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix remaining TypeScript type errors across the project"""
import os, re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src')

def read(rel): 
    p = os.path.normpath(os.path.join(BASE, rel))
    with open(p, 'r', encoding='utf-8') as f: return f.read()

def write(rel, content):
    p = os.path.normpath(os.path.join(BASE, rel))
    with open(p, 'w', encoding='utf-8') as f: f.write(content)
    print(f'[OK] {rel}')

# ── 1. user.interface.ts: add is_superuser, account_type, phone ─────────────
write('shared/types/user.interface.ts', '''export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar?: string;
  is_superuser?: boolean;
  account_type?: string;
  phone?: string;
}
''')

# ── 2. auth.interfaces.ts: expand IBackendAuthResponse.user ─────────────────
auth = read('shared/types/auth.interfaces.ts')
old_user_type = '''    user?: {
        id: number;
        email: string;
    };'''
new_user_type = '''    user?: {
        id: number;
        email: string;
        first_name?: string;
        last_name?: string;
        role?: string;
        is_superuser?: boolean;
        account_type?: string;
        phone?: string;
        [key: string]: unknown;
    };'''
if old_user_type in auth:
    write('shared/types/auth.interfaces.ts', auth.replace(old_user_type, new_user_type))
else:
    print('[SKIP] auth.interfaces.ts: user type pattern not found')

# ── 3. useLoginForm.ts: fix watch() unsubscribe + use type narrowing ─────────
login = read('components/Forms/LoginForm/useLoginForm.ts')

# Fix watch() unsubscribe: watch() returns { unsubscribe: () => void }
login = login.replace(
    'const backendUnsubscribe = backendForm.watch(() => {',
    'const backendSub = backendForm.watch(() => {'
)
login = login.replace(
    'const dummyUnsubscribe = dummyForm.watch(() => {',
    'const dummySub = dummyForm.watch(() => {'
)
login = login.replace(
    '      backendUnsubscribe();\n      dummyUnsubscribe();',
    '      backendSub.unsubscribe();\n      dummySub.unsubscribe();'
)

# Fix authResponse.error.message — error could be string or IAuthError
login = login.replace(
    "throw new Error(authResponse.error.message || 'Authentication failed');",
    "throw new Error(typeof authResponse.error === 'string' ? authResponse.error : ((authResponse.error as any)?.message || 'Authentication failed'));"
)

# Add isSuccessAuthResponse import if not present
if 'isSuccessAuthResponse' not in login:
    login = login.replace(
        'import { IBackendAuthCredentials } from "@/shared/types/auth.interfaces";',
        'import { IBackendAuthCredentials, isSuccessAuthResponse } from "@/shared/types/auth.interfaces";'
    )

# Fix type narrowing: replace direct access after error check with type guard
# The pattern: after checking authResponse.error and the access/user checks,
# cast to the success type for all subsequent property access
old_narrowing = '''      // Проверяем что получили необходимые данные
      if (!authResponse.access || !authResponse.user) {
        console.error('[LoginForm] Invalid response structure:', authResponse);
        throw new Error('Invalid response from server - missing tokens or user data');
      }'''
new_narrowing = '''      // Проверяем что получили необходимые данные
      if (!isSuccessAuthResponse(authResponse) || !authResponse.access || !authResponse.user) {
        console.error('[LoginForm] Invalid response structure:', authResponse);
        throw new Error('Invalid response from server - missing tokens or user data');
      }
      const successResponse = authResponse;'''

if old_narrowing in login:
    login = login.replace(old_narrowing, new_narrowing)
    # Replace all authResponse.xxx with successResponse.xxx after the narrowing
    # Only in the section after the narrowing check
    parts = login.split('const successResponse = authResponse;')
    if len(parts) == 2:
        parts[1] = parts[1].replace('authResponse.access', 'successResponse.access')
        parts[1] = parts[1].replace('authResponse.refresh', 'successResponse.refresh')
        parts[1] = parts[1].replace('authResponse.user', 'successResponse.user')
        login = 'const successResponse = authResponse;'.join(parts)
    print('[OK] useLoginForm.ts: type narrowing applied')
else:
    print('[SKIP] useLoginForm.ts: narrowing pattern not found')

write('components/Forms/LoginForm/useLoginForm.ts', login)

# ── 4. Check locales errors ──────────────────────────────────────────────────
# ru.ts errors - read first 5 lines
for loc in ['locales/ru.ts', 'locales/en.ts']:
    try:
        content = read(loc)
        lines = content.split('\n')
        print(f'\n[INFO] {loc}: {len(lines)} lines, first 3:')
        for i in range(min(3, len(lines))):
            print(f'  {i+1}: {repr(lines[i][:80])}')
    except Exception as e:
        print(f'[ERR] {loc}: {e}')

print('\nDone!')
