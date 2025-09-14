from django.utils.deprecation import MiddlewareMixin


class AddBearerPrefixMiddleware(MiddlewareMixin):
    def process_request(self, request):
        auth = request.META.get('HTTP_AUTHORIZATION')
        if auth and not auth.lower().startswith('bearer '):
            request.META['HTTP_AUTHORIZATION'] = f'Bearer {auth}'
