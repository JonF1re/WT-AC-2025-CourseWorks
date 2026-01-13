import { FullConfig } from '@playwright/test';

/**
 * Global setup для E2E тестов
 * 
 * Выполняется один раз перед всеми тестами
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 E2E тесты: Глобальная инициализация');
  console.log(`   Базовый URL: ${config.projects[0]?.use?.baseURL || 'http://localhost:5173'}`);
  
  // Здесь можно добавить:
  // - Проверку доступности сервера
  // - Сброс тестовой БД
  // - Создание тестовых данных
  
  // Пример проверки сервера:
  // const serverUrl = process.env.E2E_API_URL || 'http://localhost:3000';
  // try {
  //   const response = await fetch(`${serverUrl}/health`);
  //   if (!response.ok) {
  //     throw new Error(`Server health check failed: ${response.status}`);
  //   }
  //   console.log('   ✓ Backend сервер доступен');
  // } catch (error) {
  //   console.error('   ✗ Backend сервер недоступен:', error);
  //   throw error;
  // }
  
  console.log('   ✓ Готово к запуску тестов');
}

export default globalSetup;
