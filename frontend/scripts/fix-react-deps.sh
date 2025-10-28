#!/bin/bash

# Скрипт для виправлення конфліктів залежностей React 18-19
# Використання: bash scripts/fix-react-deps.sh

echo "🔧 Виправлення конфліктів залежностей React..."
echo ""

# Перевірка наявності .npmrc
if [ ! -f ".npmrc" ]; then
    echo "⚠️  Файл .npmrc не знайдено. Створюємо..."
    echo "legacy-peer-deps=true" > .npmrc
    echo "✅ Файл .npmrc створено"
else
    echo "✅ Файл .npmrc існує"
fi

# Перевірка наявності overrides в package.json
if ! grep -q '"overrides"' package.json; then
    echo "⚠️  Розділ 'overrides' не знайдено в package.json"
    echo "   Додайте вручну розділ 'overrides' до package.json"
else
    echo "✅ Розділ 'overrides' знайдено в package.json"
fi

echo ""
echo "🗑️  Видалення старих залежностей..."
rm -rf node_modules
rm -f package-lock.json

echo ""
echo "🧹 Очищення кешу npm..."
npm cache clean --force

echo ""
echo "📦 Встановлення залежностей з правильними налаштуваннями..."
npm install --legacy-peer-deps

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Залежності успішно встановлено!"
    echo ""
    echo "🔍 Перевірка версій React:"
    npm ls react react-dom
else
    echo ""
    echo "❌ Помилка при встановленні залежностей"
    echo "   Перевірте вивід вище для деталей"
    exit 1
fi

echo ""
echo "🎉 Виправлення завершено!"
echo ""
echo "Тепер ви можете запустити проект:"
echo "  npm run dev       - режим розробки"
echo "  npm run build     - production збірка"

