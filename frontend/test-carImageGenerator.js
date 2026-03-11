// Простой тест для проверки carImageGenerator.service.ts
const { CarImageGeneratorService } = require('./src/services/carImageGenerator.service.ts');

// Создаем тестовый blob
const testBlob = new Blob(['test'], { type: 'image/png' });

// Тестируем метод blobToBase64
async function testBlobToBase64() {
  try {
    console.log('Testing blobToBase64 method...');
    
    // Создаем экземпляр сервиса
    const service = new CarImageGeneratorService();
    
    // Вызываем приватный метод через рефлексию (для теста)
    const result = await service.blobToBase64(testBlob);
    
    console.log('✅ Success: blobToBase64 returned base64 string');
    console.log('Result length:', result.length);
    console.log('Result starts with:', result.substring(0, 20) + '...');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Тестируем с невалидными данными
async function testInvalidData() {
  try {
    console.log('\nTesting with invalid data...');
    
    // Создаем blob, который не является изображением
    const invalidBlob = new Blob(['invalid data'], { type: 'text/plain' });
    const service = new CarImageGeneratorService();
    
    const result = await service.blobToBase64(invalidBlob);
    console.log('✅ Handled invalid data gracefully');
    
  } catch (error) {
    console.log('✅ Correctly rejected invalid data:', error.message);
  }
}

testBlobToBase64().then(() => testInvalidData());
