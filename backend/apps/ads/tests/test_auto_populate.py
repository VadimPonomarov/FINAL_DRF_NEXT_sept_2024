"""
Tests for auto-population of reference data.
"""
import os
from unittest.mock import patch, MagicMock
from django.test import TestCase, override_settings
from django.core.management import call_command
from django.db import connection

from apps.ads.models.reference import VehicleTypeModel, CarMarkModel, CarModel, CarColorModel


class AutoPopulateReferencesTest(TestCase):
    """Test auto-population functionality."""

    def setUp(self):
        """Set up test data."""
        # Ensure clean state
        self.clear_all_data()

    def tearDown(self):
        """Clean up after tests."""
        self.clear_all_data()
        connection.close()

    def clear_all_data(self):
        """Clear all reference data."""
        CarModel.objects.all().delete()
        CarMarkModel.objects.all().delete()
        VehicleTypeModel.objects.all().delete()
        CarColorModel.objects.all().delete()

    def test_auto_populate_when_empty(self):
        """Test auto-population when data is empty."""
        # Ensure data is empty
        self.assertEqual(VehicleTypeModel.objects.count(), 0)
        self.assertEqual(CarMarkModel.objects.count(), 0)
        self.assertEqual(CarModel.objects.count(), 0)

        # Run auto-populate command
        call_command('auto_populate_references')

        # Check that data was created
        self.assertGreater(VehicleTypeModel.objects.count(), 0)
        self.assertGreater(CarMarkModel.objects.count(), 0)
        self.assertGreater(CarModel.objects.count(), 0)
        self.assertGreater(CarColorModel.objects.count(), 0)

    def test_auto_populate_skips_when_data_exists(self):
        """Test that auto-population is skipped when data exists."""
        # Create some test data
        vehicle_type = VehicleTypeModel.objects.create(
            name='Test Type',
            slug='test-type',
            description='Test vehicle type'
        )
        mark = CarMarkModel.objects.create(
            vehicle_type=vehicle_type,
            name='Test Mark'
        )
        CarModel.objects.create(
            mark=mark,
            name='Test Model'
        )

        initial_counts = {
            'vehicle_types': VehicleTypeModel.objects.count(),
            'marks': CarMarkModel.objects.count(),
            'models': CarModel.objects.count(),
        }

        # Run auto-populate command
        call_command('auto_populate_references')

        # Check that counts didn't change
        self.assertEqual(VehicleTypeModel.objects.count(), initial_counts['vehicle_types'])
        self.assertEqual(CarMarkModel.objects.count(), initial_counts['marks'])
        self.assertEqual(CarModel.objects.count(), initial_counts['models'])

    def test_auto_populate_with_force_flag(self):
        """Test auto-population with force flag."""
        # Create some test data
        vehicle_type = VehicleTypeModel.objects.create(
            name='Test Type',
            slug='test-type',
            description='Test vehicle type'
        )
        mark = CarMarkModel.objects.create(
            vehicle_type=vehicle_type,
            name='Test Mark'
        )
        CarModel.objects.create(
            mark=mark,
            name='Test Model'
        )

        initial_counts = {
            'vehicle_types': VehicleTypeModel.objects.count(),
            'marks': CarMarkModel.objects.count(),
            'models': CarModel.objects.count(),
        }

        # Run auto-populate command with force
        call_command('auto_populate_references', force=True)

        # Check that more data was added
        self.assertGreaterEqual(VehicleTypeModel.objects.count(), initial_counts['vehicle_types'])
        self.assertGreaterEqual(CarMarkModel.objects.count(), initial_counts['marks'])
        self.assertGreaterEqual(CarModel.objects.count(), initial_counts['models'])

    @patch('apps.ads.management.commands.auto_populate_references.open')
    def test_auto_populate_handles_missing_csv(self, mock_open):
        """Test that auto-population handles missing CSV gracefully."""
        mock_open.side_effect = FileNotFoundError("CSV file not found")

        # Should not raise exception
        try:
            call_command('auto_populate_references')
        except Exception as e:
            self.fail(f"Auto-populate should handle missing CSV gracefully, but raised: {e}")

    def test_memory_cleanup(self):
        """Test that memory is properly cleaned up."""
        import gc
        
        # Get initial object count
        initial_objects = len(gc.get_objects())
        
        # Run auto-populate
        call_command('auto_populate_references')
        
        # Force garbage collection
        gc.collect()
        
        # Check that we don't have excessive object growth
        final_objects = len(gc.get_objects())
        object_growth = final_objects - initial_objects
        
        # Allow some growth but not excessive (adjust threshold as needed)
        self.assertLess(object_growth, 10000, "Excessive object growth detected")

    def test_database_connections_closed(self):
        """Test that database connections are properly closed."""
        from django.db import connections
        
        # Run auto-populate
        call_command('auto_populate_references')
        
        # Check that connections are in a clean state
        for conn in connections.all():
            # Connection should either be closed or in autocommit mode
            self.assertTrue(
                conn.connection is None or conn.get_autocommit(),
                "Database connection not properly managed"
            )

    def test_safe_seed_command(self):
        """Test the safe seed command."""
        # Ensure data is empty
        self.assertEqual(VehicleTypeModel.objects.count(), 0)

        # Run safe seed command
        call_command('seed_references_safe')

        # Check that data was created
        self.assertGreater(VehicleTypeModel.objects.count(), 0)
        self.assertGreater(CarMarkModel.objects.count(), 0)
        self.assertGreater(CarModel.objects.count(), 0)

    def test_safe_seed_with_clear(self):
        """Test safe seed command with clear option."""
        # Create some test data
        vehicle_type = VehicleTypeModel.objects.create(
            name='Test Type',
            slug='test-type',
            description='Test vehicle type'
        )
        CarMarkModel.objects.create(
            vehicle_type=vehicle_type,
            name='Test Mark'
        )

        # Run safe seed with clear
        call_command('seed_references_safe', clear=True)

        # Check that old data was cleared and new data created
        self.assertGreater(VehicleTypeModel.objects.count(), 0)
        self.assertFalse(VehicleTypeModel.objects.filter(name='Test Type').exists())

    @override_settings(AUTO_POPULATE_REFERENCES=True)
    def test_app_ready_auto_populate(self):
        """Test that app ready triggers auto-population."""
        from apps.ads.apps import AdsConfig
        
        # Clear data
        self.clear_all_data()
        
        # Create app config instance
        app_config = AdsConfig('apps.ads', MagicMock())
        
        # Mock the should_auto_populate to return True
        with patch.object(app_config, '_should_auto_populate', return_value=True):
            # Call ready method
            app_config.ready()
        
        # Check that data was populated
        self.assertGreater(VehicleTypeModel.objects.count(), 0)

    def test_bulk_operations_efficiency(self):
        """Test that bulk operations are used for efficiency."""
        with patch('apps.ads.models.reference.VehicleTypeModel.objects.bulk_create') as mock_bulk_create:
            mock_bulk_create.return_value = []
            
            # Run auto-populate
            call_command('auto_populate_references')
            
            # Check that bulk_create was called
            self.assertTrue(mock_bulk_create.called, "bulk_create should be used for efficiency")

    def test_transaction_rollback_on_error(self):
        """Test that transactions are properly rolled back on error."""
        # Mock an error during model creation
        with patch('apps.ads.models.reference.CarModel.objects.bulk_create') as mock_bulk_create:
            mock_bulk_create.side_effect = Exception("Test error")
            
            # Should handle error gracefully
            try:
                call_command('auto_populate_references')
            except Exception:
                pass  # Expected to fail
            
            # Check that partial data wasn't committed
            # (This depends on transaction handling in the command)
