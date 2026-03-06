"""
Railway-safe URL configuration.
health_check is defined inline to avoid any import chain failures.
All app imports are wrapped in try/except.
"""
from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView
from django.http import JsonResponse


def health_check(request):
    """Inline health check - no external imports, always works."""
    return JsonResponse({"status": "ok", "service": "autoria-backend"})


_safe_includes = []


def _try_include(url_prefix, module_path):
    try:
        _safe_includes.append(path(url_prefix, include(module_path)))
    except Exception as e:
        print(f"[urls_railway] URL import skipped for {module_path}: {e}")


_try_include("api/accounts/", "apps.accounts.urls")
_try_include("api/users/", "apps.users.urls")
_try_include("api/auth/", "apps.auth.urls")
_try_include("api/ads/", "apps.ads.urls")
_try_include("api/currency/", "apps.currency.urls")
_try_include("api/public/reference/", "apps.ads.urls.reference_urls")

try:
    from .docs.urls import urlpatterns as docs_urls
except Exception as e:
    print(f"[urls_railway] docs urls skipped: {e}")
    docs_urls = []

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health_check, name="health_check"),
    path("", RedirectView.as_view(url="/api/doc/", permanent=False)),
    *_safe_includes,
    *docs_urls,
]
