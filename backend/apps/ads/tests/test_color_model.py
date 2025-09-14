"""
Tests for CarColorModel with new metallic and pearlescent fields
"""
from django.test import TestCase
from apps.ads.models import CarColorModel


class CarColorModelTest(TestCase):
    """Test CarColorModel functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.basic_color = CarColorModel.objects.create(
            name="White",
            hex_code="#FFFFFF",
            is_popular=True,
            is_metallic=False,
            is_pearlescent=False
        )
        
        self.metallic_color = CarColorModel.objects.create(
            name="Metallic Black",
            hex_code="#1C1C1C",
            is_popular=True,
            is_metallic=True,
            is_pearlescent=False
        )
        
        self.pearlescent_color = CarColorModel.objects.create(
            name="Pearl White",
            hex_code="#F8F8FF",
            is_popular=True,
            is_metallic=False,
            is_pearlescent=True
        )
    
    def test_basic_color_creation(self):
        """Test basic color creation"""
        self.assertEqual(self.basic_color.name, "White")
        self.assertEqual(self.basic_color.hex_code, "#FFFFFF")
        self.assertTrue(self.basic_color.is_popular)
        self.assertFalse(self.basic_color.is_metallic)
        self.assertFalse(self.basic_color.is_pearlescent)
    
    def test_metallic_color_creation(self):
        """Test metallic color creation"""
        self.assertEqual(self.metallic_color.name, "Metallic Black")
        self.assertEqual(self.metallic_color.hex_code, "#1C1C1C")
        self.assertTrue(self.metallic_color.is_popular)
        self.assertTrue(self.metallic_color.is_metallic)
        self.assertFalse(self.metallic_color.is_pearlescent)
    
    def test_pearlescent_color_creation(self):
        """Test pearlescent color creation"""
        self.assertEqual(self.pearlescent_color.name, "Pearl White")
        self.assertEqual(self.pearlescent_color.hex_code, "#F8F8FF")
        self.assertTrue(self.pearlescent_color.is_popular)
        self.assertFalse(self.pearlescent_color.is_metallic)
        self.assertTrue(self.pearlescent_color.is_pearlescent)
    
    def test_color_string_representation(self):
        """Test string representation of colors"""
        self.assertEqual(str(self.basic_color), "White")
        self.assertEqual(str(self.metallic_color), "Metallic Black")
        self.assertEqual(str(self.pearlescent_color), "Pearl White")
    
    def test_color_uniqueness(self):
        """Test that color names are unique"""
        with self.assertRaises(Exception):
            CarColorModel.objects.create(
                name="White",  # Duplicate name
                hex_code="#FFFFFE",
                is_popular=False,
                is_metallic=False,
                is_pearlescent=False
            )
    
    def test_color_filtering(self):
        """Test filtering colors by properties"""
        # Test metallic colors
        metallic_colors = CarColorModel.objects.filter(is_metallic=True)
        self.assertEqual(metallic_colors.count(), 1)
        self.assertEqual(metallic_colors.first().name, "Metallic Black")
        
        # Test pearlescent colors
        pearlescent_colors = CarColorModel.objects.filter(is_pearlescent=True)
        self.assertEqual(pearlescent_colors.count(), 1)
        self.assertEqual(pearlescent_colors.first().name, "Pearl White")
        
        # Test popular colors
        popular_colors = CarColorModel.objects.filter(is_popular=True)
        self.assertEqual(popular_colors.count(), 3)
    
    def test_color_defaults(self):
        """Test default values for color fields"""
        color = CarColorModel.objects.create(
            name="Test Color",
            hex_code="#123456"
        )
        
        self.assertFalse(color.is_popular)
        self.assertFalse(color.is_metallic)
        self.assertFalse(color.is_pearlescent)
    
    def test_hex_code_optional(self):
        """Test that hex_code is optional"""
        color = CarColorModel.objects.create(
            name="No Hex Color"
        )

        self.assertEqual(color.name, "No Hex Color")
        self.assertIsNone(color.hex_code)
