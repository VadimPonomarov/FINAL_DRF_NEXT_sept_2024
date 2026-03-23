# Production Image Generation Configuration
# This file defines the fallback hierarchy for image generation in production

# G4F Providers (Layer 1 - Free AI services)
G4F_PROVIDERS = [
    {"provider": "HuggingSpace", "model": "flux", "priority": 1},
    {"provider": "PollinationsAI", "model": None, "priority": 2},  # Let provider choose
    {"provider": "OpenaiChat", "model": "dall-e-3", "priority": 3},
]

# Direct AI Services (Layer 2 - Backup direct URLs)
DIRECT_AI_URLS = [
    "https://image.pollinations.ai/prompt/{prompt}?width=512&height=512&model=flux&enhance=true&seed={seed}&nologo=true",
    "https://image.pollinations.ai/prompt/{prompt}?width=512&height=512&seed={seed}&nologo=true",
    "https://image.pollinations.ai/prompt/{simple_prompt}?width=512&height=512&seed={seed}",
]

# Placeholder Services (Layer 3 - High-quality placeholders)
PLACEHOLDER_SERVICES = [
    "https://picsum.photos/512/512?random={seed}",
    "https://source.unsplash.com/512x512/?portrait,professional,face&sig={seed}",
    "https://api.dicebear.com/7.x/avataaars/svg?seed={user_seed}&backgroundColor=b6e3f4,c0aede,d1d4f9",
]

# SVG Fallback (Layer 4 - Ultimate fallback)
SVG_FALLBACK_ENABLED = True
SVG_COLORS = [
    '#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981', 
    '#3B82F6', '#8B5CF6', '#EF4444', '#14B8A6', '#F97316'
]

# Timeout Settings
REQUEST_TIMEOUT = 10  # seconds
URL_TEST_TIMEOUT = 5   # seconds

# Retry Logic
MAX_RETRIES_PER_PROVIDER = 1
ENABLE_URL_VALIDATION = True

# Logging
LOG_FALLBACK_PROCESS = True
LOG_PROVIDER_ATTEMPTS = True
