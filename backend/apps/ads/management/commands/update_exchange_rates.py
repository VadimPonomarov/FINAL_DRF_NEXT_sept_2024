from django.core.management.base import BaseCommand
from django.utils import timezone
from ...services.exchange_rates import ExchangeRateService
from ...models import ExchangeRate

class Command(BaseCommand):
    help = 'Update exchange rates from PrivatBank API'
    
    def handle(self, *args, **options):
        self.stdout.write('Updating exchange rates...')
        
        try:
            # Get the latest rates
            exchange_rate = ExchangeRateService.update_exchange_rates()
            
            if exchange_rate:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully updated exchange rates for {exchange_rate.date}:\n'
                        f'1 USD = {exchange_rate.usd_rate} UAH\n'
                        f'1 EUR = {exchange_rate.eur_rate} UAH'
                    )
                )
                
                # Log the update
                self._log_exchange_rate_update(exchange_rate)
            else:
                self.stdout.write(
                    self.style.WARNING('No new exchange rates were available.')
                )
                
        except Exception as e:
            self.stderr.write(
                self.style.ERROR(f'Error updating exchange rates: {str(e)}')
            )
    
    def _log_exchange_rate_update(self, exchange_rate):
        """Log the exchange rate update"""
        from django.conf import settings
        
        if hasattr(settings, 'LOGGER'):
            settings.LOGGER.info(
                f'Exchange rates updated: {exchange_rate.usd_rate} UAH/USD, '
                f'{exchange_rate.eur_rate} UAH/EUR on {exchange_rate.date}'
            )
