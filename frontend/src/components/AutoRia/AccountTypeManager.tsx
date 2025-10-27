'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AccountService } from '@/services/autoria/account.service';
import NewResizableWrapper from '@/components/All/ResizableWrapper/NewResizableWrapper';

interface User {
  id: number;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface Account {
  id: number;
  user: number;
  account_type: 'BASIC' | 'PREMIUM';
  user_email?: string;
}

interface AccountTypeManagerProps {
  isVisible: boolean;
  onClose: () => void;
}

const AccountTypeManager: React.FC<AccountTypeManagerProps> = ({
  isVisible,
  onClose
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'email' | 'user_id' | 'account_id'>('email');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [foundAccount, setFoundAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSuperUser, setIsSuperUser] = useState<boolean | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  // Remove old resize logic - will be handled by NewResizableWrapper

  // Функция для очистки всех тестовых объявлений
  const handleCleanupTestAds = async () => {
    const { alertHelpers } = await import('@/components/ui/alert-dialog-helper');
    const confirmed = await alertHelpers.confirmDelete(t('autoria.testAds.allTestAds') || 'ВСІ тестові оголошення');
    if (!confirmed) {
      return;
    }

    setIsCleaningUp(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/autoria/test-ads/cleanup', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(`✅ Успешно удалено ${result.deletedCount} тестовых объявлений`);
      } else {
        throw new Error('Ошибка при удалении тестовых объявлений');
      }
    } catch (err: any) {
      console.error('Cleanup error:', err);
      setError(`❌ Ошибка при очистке: ${err.message}`);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Введите ID для поиска');
      return;
    }

    console.log('🔍 Starting search...', { searchType, searchQuery: searchQuery.trim() });
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setFoundUser(null);
    setFoundAccount(null);

    try {
      if (searchType === 'email') {
        // Поиск пользователя по email
        console.log('🔍 Searching user by email:', searchQuery.trim());
        const userData = await AccountService.getUserByEmail(searchQuery.trim());
        console.log('✅ Found user:', userData);
        setFoundUser(userData);

        // Получаем аккаунт пользователя
        console.log('🔍 Searching account for user ID:', userData.id);
        const accountData = await AccountService.getAccountByUserId(userData.id);
        console.log('✅ Found account:', accountData);
        console.log('🆔 Account ID field:', accountData.id);
        console.log('🔍 All account fields:', Object.keys(accountData));
        console.log('📋 Full account object:', JSON.stringify(accountData, null, 2));
        setFoundAccount(accountData);
      } else {
        // Поиск по ID (user_id или account_id)
        const id = parseInt(searchQuery.trim());
        if (isNaN(id)) {
          setError('ID должен быть числом');
          return;
        }

        if (searchType === 'user_id') {
          const userData = await AccountService.getUserById(id);
          setFoundUser(userData);
          
          const accountData = await AccountService.getAccountByUserId(id);
          setFoundAccount(accountData);
        } else {
          // account_id
          const accountData = await AccountService.getAccountInfo(id);
          setFoundAccount(accountData);
          
          if (accountData.user) {
            const userData = await AccountService.getUserById(accountData.user);
            setFoundUser(userData);
          }
        }
      }
    } catch (err: any) {
      console.error('Search error:', err);

      // Handle different types of errors
      if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        setError('❌ Не удается подключиться к серверу. Проверьте подключение к интернету и убедитесь, что сервер запущен.');
      } else if (err.message.includes('403') || err.message.includes('Forbidden')) {
        setError('❌ Доступ запрещен. Только суперпользователи могут управлять аккаунтами.');
      } else if (err.message.includes('404') || err.message.includes('not found')) {
        setError('❌ Пользователь не найден. Проверьте правильность введенных данных.');
      } else if (err.message.includes('Network error') || err.message.includes('fetch') || err.name === 'NetworkError') {
        setError('❌ Ошибка сети. Проверьте подключение к серверу.');
      } else if (err.message.includes('CORS')) {
        setError('❌ Ошибка CORS. Проверьте настройки сервера.');
      } else {
        setError(`❌ Ошибка при поиске: ${err.message || 'Неизвестная ошибка'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountTypeChange = async (newType: 'BASIC' | 'PREMIUM') => {
    if (!foundAccount) {
      setError('Аккаунт не найден');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await AccountService.changeAccountType(foundAccount.id, newType);
      setSuccess(`✅ Тип аккаунта успешно изменен на ${newType}`);
      
      // Обновляем данные аккаунта
      setFoundAccount(prev => prev ? { ...prev, account_type: newType } : null);
    } catch (err: any) {
      console.error('Account type change error:', err);
      setError(`❌ Ошибка при изменении типа аккаунта: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999]">
      <NewResizableWrapper
        storageKey="account-type-manager"
        centered={true}
        minWidth={400}
        minHeight={300}
        defaultWidth={900}
        defaultHeight={700}
        style={{
          maxWidth: 'calc(100vw - 40px)',
          maxHeight: 'calc(100vh - 40px)',
          zIndex: 100000
        }}
      >

        <div className="h-full flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                🔧 Управление типами аккаунтов
              </h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
                title="Закрыть"
              >
                ×
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Поиск */}
            <div className="mb-6">
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Тип поиска:
                  </label>
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value as 'email' | 'user_id' | 'account_id')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="email">По Email</option>
                    <option value="user_id">По User ID</option>
                    <option value="account_id">По Account ID</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {searchType === 'email' ? 'Email:' : searchType === 'user_id' ? 'User ID:' : 'Account ID:'}
                  </label>
                  <input
                    type={searchType === 'email' ? 'email' : 'number'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Введите ${searchType === 'email' ? 'Email' : searchType === 'user_id' ? 'User ID' : 'Account ID'}`}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
              >
                {isLoading ? 'Поиск...' : 'Найти'}
              </button>
            </div>

            {/* Сообщения */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                {success}
              </div>
            )}

            {/* Результаты поиска */}
            {foundUser && foundAccount && (
              <div className="border border-gray-200 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold mb-3">Найденный пользователь:</h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p><strong>User ID:</strong> {foundUser.id}</p>
                    <p><strong>Email:</strong> {foundUser.email}</p>
                    <p><strong>Имя:</strong> {foundUser.first_name || 'Не указано'}</p>
                    <p><strong>Фамилия:</strong> {foundUser.last_name || 'Не указано'}</p>
                  </div>
                  <div>
                    <p><strong>Account ID:</strong> {foundAccount.id}</p>
                    <p><strong>Текущий тип:</strong>
                      <span className={`ml-2 px-2 py-1 rounded text-sm ${
                        foundAccount.account_type === 'PREMIUM'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {foundAccount.account_type}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Переключатель типа аккаунта */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Изменить тип аккаунта:</h4>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAccountTypeChange('BASIC')}
                      disabled={isLoading || foundAccount.account_type === 'BASIC'}
                      className={`px-4 py-2 rounded ${
                        foundAccount.account_type === 'BASIC'
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-500 text-white hover:bg-gray-600'
                      }`}
                    >
                      Сделать BASIC
                    </button>
                    <button
                      onClick={() => handleAccountTypeChange('PREMIUM')}
                      disabled={isLoading || foundAccount.account_type === 'PREMIUM'}
                      className={`px-4 py-2 rounded ${
                        foundAccount.account_type === 'PREMIUM'
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-yellow-500 text-white hover:bg-yellow-600'
                      }`}
                    >
                      Сделать PREMIUM
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Кнопка очистки тестовых данных */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-red-800 mb-2">🗑️ Очистка тестовых данных</h3>
                <p className="text-sm text-red-600 mb-4">
                  Удалить все тестовые объявления из базы данных. Используйте после завершения тестирования.
                </p>
                <button
                  onClick={handleCleanupTestAds}
                  disabled={isCleaningUp}
                  className={`px-6 py-2 rounded font-medium ${
                    isCleaningUp
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  {isCleaningUp ? '🔄 Удаление...' : '🗑️ Очистить все тестовые объявления'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </NewResizableWrapper>
    </div>
  );
};

export default AccountTypeManager;
export { AccountTypeManager };
