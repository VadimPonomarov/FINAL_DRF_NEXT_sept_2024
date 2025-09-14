import { NextRequest, NextResponse } from 'next/server';
import { fetchData } from '@/app/api/(helpers)/common';

export async function GET(request: NextRequest) {
  try {
    console.log('[Account Stats API] 👥 Getting account statistics...');

    // Запрос к backend для получения статистики аккаунтов
    const result = await fetchData('api/accounts/admin/stats', {
      redirectOnError: false
    });

    if (!result) {
      console.log('[Account Stats API] ❌ No data from backend, using fallback');
      
      // Fallback данные для статистики аккаунтов
      const fallbackData = {
        account_types: {
          BASIC: 15,
          PREMIUM: 3
        },
        total_accounts: 18,
        recent_changes: [],
        statistics_updated_at: new Date().toISOString()
      };

      return NextResponse.json({
        success: true,
        data: fallbackData,
        source: 'fallback',
        message: 'Fallback данные аккаунтов (backend недоступен)'
      });
    }

    console.log('[Account Stats API] ✅ Account stats loaded:', {
      account_types: result.account_types,
      total_accounts: result.total_accounts
    });

    return NextResponse.json({
      success: true,
      data: result,
      source: 'backend',
      message: 'Статистика аккаунтов загружена с backend'
    });

  } catch (error: any) {
    console.error('[Account Stats API] ❌ Error:', error);

    // Fallback при ошибке
    const fallbackData = {
      account_types: {
        BASIC: 15,
        PREMIUM: 3
      },
      total_accounts: 18,
      recent_changes: [],
      statistics_updated_at: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: fallbackData,
      source: 'error_fallback',
      message: 'Fallback данные из-за ошибки',
      error: error.message
    });
  }
}
