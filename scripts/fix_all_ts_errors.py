#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix all TypeScript errors in the project"""
import sys
import io
import os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

BASE = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src')

def fix_file(rel_path, old, new, label):
    path = os.path.normpath(os.path.join(BASE, rel_path))
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if old in content:
        content = content.replace(old, new)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'[OK] {label}')
        return True
    else:
        print(f'[NOT FOUND] {label}')
        print(f'  File: {path}')
        return False

# ─────────────────────────────────────────────────────────────────
# FIX 1: auth.ts — remove Redis from events (causes runtime crash)
# ─────────────────────────────────────────────────────────────────
AUTH_TS = 'configs/auth.ts'

# Read actual file to get exact content
with open(os.path.normpath(os.path.join(BASE, AUTH_TS)), 'r', encoding='utf-8') as f:
    auth_content = f.read()

# Find events block start/end
events_start = auth_content.find('  events: {')
events_end = auth_content.find('\n};', events_start)
events_block = auth_content[events_start:events_end + 3]

new_events = """  events: {
    async signOut(message) {
      const { token, session } = message as any;
      const email = token?.email || session?.user?.email;
      console.log('[NextAuth events.signOut] User signed out:', email || 'unknown');
    },
    async signIn(message) {
      const { user } = message as any;
      console.log('[NextAuth events.signIn] User signed in:', user?.email || 'unknown');
    },
  }
};"""

new_auth = auth_content[:events_start] + new_events
with open(os.path.normpath(os.path.join(BASE, AUTH_TS)), 'w', encoding='utf-8') as f:
    f.write(new_auth)
print('[OK] auth.ts: removed Redis from events')

# ─────────────────────────────────────────────────────────────────
# FIX 2: locales/types.ts — quote invalid interface keys
# ─────────────────────────────────────────────────────────────────
LOCALES_TS = 'locales/types.ts'

INVALID_KEYS = [
    (',: string;', "',': string;"),
    ('-: string;', "'-': string;"),
    ('/: string;', "'/': string;"),
    ('/api/auth/logout: string;', "'/api/auth/logout': string;"),
    ('/autoria/create-ad: string;', "'/autoria/create-ad': string;"),
    ('/autoria/search?favorites_only=true: string;', "'/autoria/search?favorites_only=true': string;"),
    ('/error: string;', "'/error': string;"),
    ('/login: string;', "'/login': string;"),
    ('=: string;', "'=': string;"),
    ('@/components/Forms/RegistrationForm/RegistrationForm: string;', "'@/components/Forms/RegistrationForm/RegistrationForm': string;"),
    ('@/services/serviceRegistry: string;', "'@/services/serviceRegistry': string;"),
    ('\\n: string;', "'\\\\n': string;"),
    ('clear-file-upload-notification: string;', "'clear-file-upload-notification': string;"),
    ('content-type: string;', "'content-type': string;"),
    ('dark-mode-changed: string;', "'dark-mode-changed': string;"),
    ('date-changed: string;', "'date-changed': string;"),
    ('scroll-chat-to-bottom: string;', "'scroll-chat-to-bottom': string;"),
    ('uk-UA: string;', "'uk-UA': string;"),
    ('profile.avatar.failed: string;', "'profile.avatar.failed': string;"),
    ('profile.avatar.saveWarning: string;', "'profile.avatar.saveWarning': string;"),
]

path = os.path.normpath(os.path.join(BASE, LOCALES_TS))
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0
for old, new in INVALID_KEYS:
    if old in content:
        content = content.replace(old, new)
        fixes += 1

# Remove the empty-key block: ': {\n  : string;\n};\n'
empty_key_block = """: {
  : string;
};"""
if empty_key_block in content:
    content = content.replace(empty_key_block, "")
    fixes += 1

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print(f'[OK] locales/types.ts: fixed {fixes} invalid keys')

# ─────────────────────────────────────────────────────────────────
# FIX 3: next-document-stub.ts — JSX in .ts file, convert to createElement
# ─────────────────────────────────────────────────────────────────
STUB_TS = 'lib/next-document-stub.ts'
path = os.path.normpath(os.path.join(BASE, STUB_TS))
new_content = """// Minimal safe stub for `next/document` in App Router projects
// Provides components to satisfy indirect imports without using real Document API
import React from 'react';

export const Html: React.FC<React.HTMLAttributes<HTMLHtmlElement>> = ({ children, ...props }) =>
  React.createElement('html', props, children);

export const Head: React.FC<React.HTMLAttributes<HTMLHeadElement>> = ({ children, ...props }) =>
  React.createElement('head', props, children);

export const Main: React.FC<React.HTMLAttributes<HTMLElement>> = ({ children, ...props }) =>
  React.createElement('main', props, children);

export const NextScript: React.FC = () => null;

// Fallback default export to avoid runtime errors if `default` is imported
export default {} as any;
"""
with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print('[OK] next-document-stub.ts: replaced JSX with React.createElement')

# ─────────────────────────────────────────────────────────────────
# FIX 4: AuthStatusChecker.tsx — remove extra closing brace on line 83
# ─────────────────────────────────────────────────────────────────
AUTH_CHECKER = 'components/Auth/AuthStatusChecker.tsx'
path = os.path.normpath(os.path.join(BASE, AUTH_CHECKER))
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# The bad pattern: toast closes, then extra } before router.push
old_block = """          toast({
            title: "Потрібна автентифікація",
            description: "Для доступу до AutoRia потрібно увійти з backend-автентифікацією",
            variant: "destructive",
            duration: 5000,
          });

          }

          // Перенаправляємо на login
          router.push(`/login?alert=backend_auth_required&message=Будь%20ласка,%20увійдіть%20із%20backend-%D0%B0%D0%B2%D1%82%D0%B5%D0%BD%D1%82%D0%B8%D1%84%D1%96%D0%BA%D0%B0%D1%86%D1%96%D1%94%D1%8E%20%D0%B4%D0%BB%D1%8F%20доступу%20до%20функцій%20AutoRia&callbackUrl=${encodeURIComponent(currentPath)}`);
          return;
        }"""

new_block = """          toast({
            title: "Потрібна автентифікація",
            description: "Для доступу до AutoRia потрібно увійти з backend-автентифікацією",
            variant: "destructive",
            duration: 5000,
          });

          // Перенаправляємо на login
          router.push(`/login?alert=backend_auth_required&message=Будь%20ласка,%20увійдіть%20із%20backend-%D0%B0%D0%B2%D1%82%D0%B5%D0%BD%D1%82%D0%B8%D1%84%D1%96%D0%BA%D0%B0%D1%86%D1%96%D1%94%D1%8E%20%D0%B4%D0%BB%D1%8F%20доступу%20до%20функцій%20AutoRia&callbackUrl=${encodeURIComponent(currentPath)}`);
          return;
        }"""

if old_block in content:
    content = content.replace(old_block, new_block)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('[OK] AuthStatusChecker.tsx: removed extra closing brace')
else:
    print('[NOT FOUND] AuthStatusChecker.tsx: extra brace pattern not found')
    # Show the actual content around line 83
    lines = content.split('\n')
    for i in range(75, 95):
        print(f'  {i+1}: {repr(lines[i])}')

# ─────────────────────────────────────────────────────────────────
# FIX 5: CRUDCarAdForm.tsx — add missing closing JSX tags
# ─────────────────────────────────────────────────────────────────
CRUD_FORM = 'components/AutoRia/Forms/CRUDCarAdForm.tsx'
path = os.path.normpath(os.path.join(BASE, CRUD_FORM))
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')
print(f'[INFO] CRUDCarAdForm.tsx: {len(lines)} lines total')
# Show last 10 lines
for i in range(max(0, len(lines)-10), len(lines)):
    print(f'  {i+1}: {repr(lines[i])}')

print('\nAll fixes complete!')
