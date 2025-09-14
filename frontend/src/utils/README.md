# 🛠️ Utils Directory - Modular Architecture

This directory contains utility functions and tools organized by functionality modules.

## 🏗️ Modular Structure

### 📁 Module Overview

| Module | Purpose | Location |
|--------|---------|----------|
| **chat/** | Chat system utilities | `src/utils/chat/` |
| **auth/** | Authentication utilities | `src/utils/auth/` |
| **api/** | API and network utilities | `src/utils/api/` |
| **ui/** | UI and notification utilities | `src/utils/ui/` |
| **dev-tools/** | Development tools | `src/utils/dev-tools/` |

## 📦 Module Details

### 💬 Chat Module (`src/utils/chat/`)

| File | Purpose | Used By |
|------|---------|---------|
| `chatTypes.ts` | TypeScript types for chat system | All chat components |
| `chatStorage.ts` | Chat data storage and management | Chat components |
| `logger.ts` | Logging utilities for chat/WebSocket | Chat, WebSocket |
| `fileUpload.ts` | File upload utilities | Chat file uploads |
| `imageStorage.ts` | Image storage and management | Chat messages |
| `markdownParser.ts` | Markdown parsing utilities | Chat messages |
| `linkParser.ts` | Link parsing for Markdown | Markdown components |
| `sanitizeUrl.ts` | URL sanitization | Chat messages |

### 🔐 Auth Module (`src/utils/auth/`)

| File | Purpose | Used By |
|------|---------|---------|
| `serverAuth.ts` | Server-side authentication management | API routes |

### 🌐 API Module (`src/utils/api/`)

| File | Purpose | Used By |
|------|---------|---------|
| `env.ts` | Environment variable handling | Redis services, API |
| `getBaseUrl.ts` | Base URL resolution | API helpers |
| `serviceUrlResolver.ts` | Service URL resolution | API helpers |
| `simpleUrlResolver.ts` | Simple URL resolution | API, WebSocket |

### 🎨 UI Module (`src/utils/ui/`)

| File | Purpose | Used By |
|------|---------|---------|
| `notificationUtils.ts` | Error handling and notifications | Chat, forms |

### 🛠️ Dev Tools Module (`src/utils/dev-tools/`)

| File | Purpose | Usage |
|------|---------|-------|
| `check-translations.js` | Translation validation script | `npm run check-translations` |

## 🚀 Usage Examples

### Modular Imports (Recommended)
```typescript
// ✅ Import from module index
import { Message, ChatChunk } from '@/utils/chat';
import { ServerAuthManager } from '@/utils/auth';
import { getRuntimeEnv } from '@/utils/api';
import { useErrorHandler } from '@/utils/ui';
```

### Direct File Imports (Still supported)
```typescript
// ✅ Direct file imports
import { Message } from '@/utils/chat/chatTypes';
import { ServerAuthManager } from '@/utils/auth/serverAuth';
import { getRuntimeEnv } from '@/utils/api/env';
```

### Server Authentication
```typescript
import { ServerAuthManager } from '@/utils/auth';

const authManager = new ServerAuthManager();
const tokens = await authManager.getValidTokens();
```

### Chat System
```typescript
import { Message, ChatChunk, generateId } from '@/utils/chat';

const message: Message = {
  id: generateId(),
  content: 'Hello',
  role: 'user',
  timestamp: new Date()
};
```

### Environment & API
```typescript
import { getRuntimeEnv, getBaseUrl } from '@/utils/api';

const redisHost = getRuntimeEnv('REDIS_HOST', 'localhost');
const apiUrl = getBaseUrl();
```

### UI & Notifications
```typescript
import { useErrorHandler } from '@/utils/ui';

const { showError, showSuccess } = useErrorHandler();
showSuccess('Operation completed successfully');
```

### Translation Validation
```bash
# Check translation consistency
npm run check-translations

# Direct execution
node src/utils/dev-tools/check-translations.js
```

## 🧹 Maintenance

This directory has been cleaned up to contain only actively used utilities. Removed files include:

- `apiClient.ts` - Unused API client
- `apiInterceptor.ts` - Unused interceptor
- `authUtils.ts` - Unused auth utilities
- `avatarUtils.ts` - Unused avatar utilities
- `debugLogger.ts` - Unused debug logger
- `errorHandler.ts` - Unused error handler
- `tokenManager.ts` - Unused token management
- And other unused files...

## 📝 Adding New Utilities

When adding new utilities:

1. **Follow naming conventions**: Use camelCase for files
2. **Add TypeScript types**: Ensure type safety
3. **Document usage**: Update this README
4. **Test thoroughly**: Ensure utilities work as expected
5. **Check dependencies**: Avoid circular imports

## 🔍 Translation Validation

The `check-translations.js` script helps maintain translation consistency:

- **Validates** all language files (en, ru, uk)
- **Detects** missing and extra keys
- **Reports** inconsistencies
- **Integrates** with development workflow

See the [i18n System Guide](../../../docs/i18n-system-guide.md#translation-validation) for detailed usage instructions.
