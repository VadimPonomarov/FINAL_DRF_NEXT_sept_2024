# Generated manually to improve FormattedAccountAddress fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        # Add missing fields to match RawAccountAddress structure
        migrations.AddField(
            model_name='formattedaccountaddress',
            name='district',
            field=models.CharField(blank=True, max_length=255, help_text='District (standardized by Google Maps)'),
        ),
        migrations.AddField(
            model_name='formattedaccountaddress',
            name='street',
            field=models.CharField(blank=True, max_length=255, help_text='Street name (standardized by Google Maps)'),
        ),
        migrations.AddField(
            model_name='formattedaccountaddress',
            name='building',
            field=models.CharField(blank=True, max_length=50, help_text='Building number (standardized by Google Maps)'),
        ),
        migrations.AddField(
            model_name='formattedaccountaddress',
            name='apartment',
            field=models.CharField(blank=True, max_length=50, help_text='Apartment number (from raw address)'),
        ),
        migrations.AddField(
            model_name='formattedaccountaddress',
            name='region',
            field=models.CharField(blank=True, max_length=255, help_text='Region (standardized by Google Maps)'),
        ),
        
        # Add hash code field for address unification
        migrations.AddField(
            model_name='formattedaccountaddress',
            name='address_hash',
            field=models.CharField(blank=True, max_length=64, help_text='SHA-256 hash of standardized address components for grouping'),
        ),
        
        # Add index for hash-based lookups
        migrations.AddIndex(
            model_name='formattedaccountaddress',
            index=models.Index(fields=['address_hash'], name='formatted_addr_hash_idx'),
        ),
        
        # Add index for place_id lookups
        migrations.AddIndex(
            model_name='formattedaccountaddress',
            index=models.Index(fields=['place_id'], name='formatted_addr_place_id_idx'),
        ),
    ]
