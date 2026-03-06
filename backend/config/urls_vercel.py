"""
Vercel-safe URL configuration. All app imports wrapped in try/except
to prevent crashes from missing packages (celery, redis, channels, etc.)
"""
from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView
from django.conf import settings
from django.conf.urls.static import static

from core.views import health_check

_safe_includes = []
_include_errors = {}


def _try_include(url_prefix, module_path):
    try:
        _safe_includes.append(path(url_prefix, include(module_path)))
    except Exception as e:
        import traceback
        _include_errors[module_path] = traceback.format_exc()
        print(f"URL import error for {module_path}: {e}")


_try_include("api/accounts/", "apps.accounts.urls")
_try_include("api/users/", "apps.users.urls")
_try_include("api/auth/", "apps.auth.urls")
_try_include("api/ads/", "apps.ads.urls")
_try_include("api/currency/", "apps.currency.urls")
_try_include("api/public/reference/", "apps.ads.urls.reference_urls")

try:
    from .docs.urls import urlpatterns as docs_urls
except Exception:
    docs_urls = []

from django.http import JsonResponse

def _debug_urls_view(request):
    return JsonResponse({
        "registered": [str(p) for p in _safe_includes],
        "errors": _include_errors
    })

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", health_check, name="health_check"),
    path("debug-urls/", _debug_urls_view),
    path("", RedirectView.as_view(url="/api/doc/", permanent=False)),
    *_safe_includes,
    *docs_urls,
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
