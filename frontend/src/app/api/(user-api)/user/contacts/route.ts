import { NextRequest, NextResponse } from 'next/server';
import { fetchData } from '@/app/api/(helpers)/common';

export async function GET(request: NextRequest) {
  try {
    console.log('[User Contacts API] 📤 Fetching user contacts...');

    // Получаем контакты через аккаунт пользователя
    const contactsData = await fetchData('api/accounts/contacts/', {
      redirectOnError: false
    });

    // Если контакты не найдены, возвращаем пустой массив
    if (!contactsData) {
      console.log('[User Contacts API] ℹ️ No contacts found, returning empty array');
      return NextResponse.json([]);
    }

    console.log(`[User Contacts API] ✅ Success: ${Array.isArray(contactsData) ? contactsData.length : 0} contacts found`);
    return NextResponse.json(contactsData);

  } catch (error) {
    console.error('[User Contacts API] ❌ Error:', error);
    // При ошибке возвращаем пустой массив вместо ошибки
    return NextResponse.json([]);
  }
}
