/**
 * Comprehensive Translation Dictionary
 * Contains pre-defined translations for common terms to minimize Google Translate API usage
 */

export interface TranslationDictionary {
  [key: string]: {
    en: string;
    ru: string;
    uk: string;
  };
}

export const TRANSLATION_DICTIONARY: TranslationDictionary = {
  // Common UI Elements
  'home': { en: 'Home', ru: 'Главная', uk: 'Головна' },
  'search': { en: 'Search', ru: 'Поиск', uk: 'Пошук' },
  'login': { en: 'Login', ru: 'Вход', uk: 'Вхід' },
  'logout': { en: 'Logout', ru: 'Выход', uk: 'Вихід' },
  'register': { en: 'Register', ru: 'Регистрация', uk: 'Реєстрація' },
  'profile': { en: 'Profile', ru: 'Профиль', uk: 'Профіль' },
  'settings': { en: 'Settings', ru: 'Настройки', uk: 'Налаштування' },
  'save': { en: 'Save', ru: 'Сохранить', uk: 'Зберегти' },
  'cancel': { en: 'Cancel', ru: 'Отменить', uk: 'Скасувати' },
  'delete': { en: 'Delete', ru: 'Удалить', uk: 'Видалити' },
  'edit': { en: 'Edit', ru: 'Редактировать', uk: 'Редагувати' },
  'create': { en: 'Create', ru: 'Создать', uk: 'Створити' },
  'update': { en: 'Update', ru: 'Обновить', uk: 'Оновити' },
  'submit': { en: 'Submit', ru: 'Отправить', uk: 'Надіслати' },
  'close': { en: 'Close', ru: 'Закрыть', uk: 'Закрити' },
  'open': { en: 'Open', ru: 'Открыть', uk: 'Відкрити' },
  'back': { en: 'Back', ru: 'Назад', uk: 'Назад' },
  'next': { en: 'Next', ru: 'Далее', uk: 'Далі' },
  'previous': { en: 'Previous', ru: 'Предыдущий', uk: 'Попередній' },
  'loading': { en: 'Loading...', ru: 'Загрузка...', uk: 'Завантаження...' },
  'error': { en: 'Error', ru: 'Ошибка', uk: 'Помилка' },
  'success': { en: 'Success', ru: 'Успех', uk: 'Успіх' },
  'warning': { en: 'Warning', ru: 'Предупреждение', uk: 'Попередження' },
  'info': { en: 'Information', ru: 'Информация', uk: 'Інформація' },
  'yes': { en: 'Yes', ru: 'Да', uk: 'Так' },
  'no': { en: 'No', ru: 'Нет', uk: 'Ні' },
  'ok': { en: 'OK', ru: 'ОК', uk: 'Гаразд' },
  'confirm': { en: 'Confirm', ru: 'Подтвердить', uk: 'Підтвердити' },
  'apply': { en: 'Apply', ru: 'Применить', uk: 'Застосувати' },
  'reset': { en: 'Reset', ru: 'Сбросить', uk: 'Скинути' },
  'clear': { en: 'Clear', ru: 'Очистить', uk: 'Очистити' },
  'filter': { en: 'Filter', ru: 'Фильтр', uk: 'Фільтр' },
  'sort': { en: 'Sort', ru: 'Сортировать', uk: 'Сортувати' },
  'view': { en: 'View', ru: 'Просмотреть', uk: 'Переглянути' },
  'show': { en: 'Show', ru: 'Показать', uk: 'Показати' },
  'hide': { en: 'Hide', ru: 'Скрыть', uk: 'Приховати' },
  'expand': { en: 'Expand', ru: 'Развернуть', uk: 'Розгорнути' },
  'collapse': { en: 'Collapse', ru: 'Свернуть', uk: 'Згорнути' },
  'select': { en: 'Select', ru: 'Выбрать', uk: 'Вибрати' },
  'choose': { en: 'Choose', ru: 'Выбрать', uk: 'Обрати' },
  'upload': { en: 'Upload', ru: 'Загрузить', uk: 'Завантажити' },
  'download': { en: 'Download', ru: 'Скачать', uk: 'Скачати' },
  'copy': { en: 'Copy', ru: 'Копировать', uk: 'Копіювати' },
  'paste': { en: 'Paste', ru: 'Вставить', uk: 'Вставити' },
  'cut': { en: 'Cut', ru: 'Вырезать', uk: 'Вирізати' },
  'print': { en: 'Print', ru: 'Печать', uk: 'Друкувати' },
  'share': { en: 'Share', ru: 'Поделиться', uk: 'Поділитися' },
  'export': { en: 'Export', ru: 'Экспорт', uk: 'Експорт' },
  'import': { en: 'Import', ru: 'Импорт', uk: 'Імпорт' },

  // AutoRia Specific Terms
  'car': { en: 'Car', ru: 'Автомобиль', uk: 'Автомобіль' },
  'cars': { en: 'Cars', ru: 'Автомобили', uk: 'Автомобілі' },
  'vehicle': { en: 'Vehicle', ru: 'Транспортное средство', uk: 'Транспортний засіб' },
  'ad': { en: 'Advertisement', ru: 'Объявление', uk: 'Оголошення' },
  'ads': { en: 'Advertisements', ru: 'Объявления', uk: 'Оголошення' },
  'price': { en: 'Price', ru: 'Цена', uk: 'Ціна' },
  'year': { en: 'Year', ru: 'Год', uk: 'Рік' },
  'brand': { en: 'Brand', ru: 'Марка', uk: 'Марка' },
  'model': { en: 'Model', ru: 'Модель', uk: 'Модель' },
  'color': { en: 'Color', ru: 'Цвет', uk: 'Колір' },
  'mileage': { en: 'Mileage', ru: 'Пробег', uk: 'Пробіг' },
  'engine': { en: 'Engine', ru: 'Двигатель', uk: 'Двигун' },
  'fuel': { en: 'Fuel', ru: 'Топливо', uk: 'Паливо' },
  'transmission': { en: 'Transmission', ru: 'Коробка передач', uk: 'Коробка передач' },
  'condition': { en: 'Condition', ru: 'Состояние', uk: 'Стан' },
  'location': { en: 'Location', ru: 'Местоположение', uk: 'Місцезнаходження' },
  'contact': { en: 'Contact', ru: 'Контакт', uk: 'Контакт' },
  'phone': { en: 'Phone', ru: 'Телефон', uk: 'Телефон' },
  'email': { en: 'Email', ru: 'Электронная почта', uk: 'Електронна пошта' },
  'description': { en: 'Description', ru: 'Описание', uk: 'Опис' },
  'photos': { en: 'Photos', ru: 'Фотографии', uk: 'Фотографії' },
  'favorites': { en: 'Favorites', ru: 'Избранное', uk: 'Обране' },
  'analytics': { en: 'Analytics', ru: 'Аналитика', uk: 'Аналітика' },
  'statistics': { en: 'Statistics', ru: 'Статистика', uk: 'Статистика' },
  'moderation': { en: 'Moderation', ru: 'Модерация', uk: 'Модерація' },
  'validation': { en: 'Validation', ru: 'Валидация', uk: 'Валідація' },
  'owner': { en: 'Owner', ru: 'Владелец', uk: 'Власник' },
  'seller': { en: 'Seller', ru: 'Продавец', uk: 'Продавець' },
  'buyer': { en: 'Buyer', ru: 'Покупатель', uk: 'Покупець' },
  'dealer': { en: 'Dealer', ru: 'Дилер', uk: 'Дилер' },
  'private': { en: 'Private', ru: 'Частный', uk: 'Приватний' },
  'new': { en: 'New', ru: 'Новый', uk: 'Новий' },
  'used': { en: 'Used', ru: 'Подержанный', uk: 'Вживаний' },
  'damaged': { en: 'Damaged', ru: 'Поврежденный', uk: 'Пошкоджений' },
  'excellent': { en: 'Excellent', ru: 'Отличное', uk: 'Відмінний' },
  'good': { en: 'Good', ru: 'Хорошее', uk: 'Хороший' },
  'fair': { en: 'Fair', ru: 'Удовлетворительное', uk: 'Задовільний' },
  'poor': { en: 'Poor', ru: 'Плохое', uk: 'Поганий' },
  'automatic': { en: 'Automatic', ru: 'Автоматическая', uk: 'Автоматична' },
  'manual': { en: 'Manual', ru: 'Механическая', uk: 'Механічна' },
  'petrol': { en: 'Petrol', ru: 'Бензин', uk: 'Бензин' },
  'diesel': { en: 'Diesel', ru: 'Дизель', uk: 'Дизель' },
  'electric': { en: 'Electric', ru: 'Электрический', uk: 'Електричний' },
  'hybrid': { en: 'Hybrid', ru: 'Гибрид', uk: 'Гібрид' },
  'gas': { en: 'Gas', ru: 'Газ', uk: 'Газ' },

  // Form Fields
  'name': { en: 'Name', ru: 'Имя', uk: 'Ім\'я' },
  'firstname': { en: 'First Name', ru: 'Имя', uk: 'Ім\'я' },
  'lastname': { en: 'Last Name', ru: 'Фамилия', uk: 'Прізвище' },
  'username': { en: 'Username', ru: 'Имя пользователя', uk: 'Ім\'я користувача' },
  'password': { en: 'Password', ru: 'Пароль', uk: 'Пароль' },
  'confirmpassword': { en: 'Confirm Password', ru: 'Подтвердить пароль', uk: 'Підтвердити пароль' },
  'address': { en: 'Address', ru: 'Адрес', uk: 'Адреса' },
  'city': { en: 'City', ru: 'Город', uk: 'Місто' },
  'country': { en: 'Country', ru: 'Страна', uk: 'Країна' },
  'region': { en: 'Region', ru: 'Регион', uk: 'Регіон' },
  'zipcode': { en: 'Zip Code', ru: 'Почтовый индекс', uk: 'Поштовий індекс' },
  'date': { en: 'Date', ru: 'Дата', uk: 'Дата' },
  'time': { en: 'Time', ru: 'Время', uk: 'Час' },
  'message': { en: 'Message', ru: 'Сообщение', uk: 'Повідомлення' },
  'comment': { en: 'Comment', ru: 'Комментарий', uk: 'Коментар' },
  'title': { en: 'Title', ru: 'Заголовок', uk: 'Заголовок' },
  'subject': { en: 'Subject', ru: 'Тема', uk: 'Тема' },

  // Status and States
  'active': { en: 'Active', ru: 'Активный', uk: 'Активний' },
  'inactive': { en: 'Inactive', ru: 'Неактивный', uk: 'Неактивний' },
  'pending': { en: 'Pending', ru: 'В ожидании', uk: 'Очікує' },
  'approved': { en: 'Approved', ru: 'Одобрено', uk: 'Схвалено' },
  'rejected': { en: 'Rejected', ru: 'Отклонено', uk: 'Відхилено' },
  'published': { en: 'Published', ru: 'Опубликовано', uk: 'Опубліковано' },
  'draft': { en: 'Draft', ru: 'Черновик', uk: 'Чернетка' },
  'archived': { en: 'Archived', ru: 'Архивировано', uk: 'Архівовано' },
  'deleted': { en: 'Deleted', ru: 'Удалено', uk: 'Видалено' },

  // Time and Dates
  'today': { en: 'Today', ru: 'Сегодня', uk: 'Сьогодні' },
  'yesterday': { en: 'Yesterday', ru: 'Вчера', uk: 'Вчора' },
  'tomorrow': { en: 'Tomorrow', ru: 'Завтра', uk: 'Завтра' },
  'week': { en: 'Week', ru: 'Неделя', uk: 'Тиждень' },
  'month': { en: 'Month', ru: 'Месяц', uk: 'Місяць' },
  'year': { en: 'Year', ru: 'Год', uk: 'Рік' },
  'hour': { en: 'Hour', ru: 'Час', uk: 'Година' },
  'minute': { en: 'Minute', ru: 'Минута', uk: 'Хвилина' },
  'second': { en: 'Second', ru: 'Секунда', uk: 'Секунда' },

  // Numbers and Quantities
  'all': { en: 'All', ru: 'Все', uk: 'Всі' },
  'none': { en: 'None', ru: 'Нет', uk: 'Немає' },
  'total': { en: 'Total', ru: 'Всего', uk: 'Всього' },
  'count': { en: 'Count', ru: 'Количество', uk: 'Кількість' },
  'amount': { en: 'Amount', ru: 'Сумма', uk: 'Сума' },
  'quantity': { en: 'Quantity', ru: 'Количество', uk: 'Кількість' },
  'limit': { en: 'Limit', ru: 'Лимит', uk: 'Ліміт' },
  'maximum': { en: 'Maximum', ru: 'Максимум', uk: 'Максимум' },
  'minimum': { en: 'Minimum', ru: 'Минимум', uk: 'Мінімум' },

  // Actions and Operations
  'add': { en: 'Add', ru: 'Добавить', uk: 'Додати' },
  'remove': { en: 'Remove', ru: 'Удалить', uk: 'Видалити' },
  'move': { en: 'Move', ru: 'Переместить', uk: 'Перемістити' },
  'duplicate': { en: 'Duplicate', ru: 'Дублировать', uk: 'Дублювати' },
  'rename': { en: 'Rename', ru: 'Переименовать', uk: 'Перейменувати' },
  'refresh': { en: 'Refresh', ru: 'Обновить', uk: 'Оновити' },
  'reload': { en: 'Reload', ru: 'Перезагрузить', uk: 'Перезавантажити' },
  'restart': { en: 'Restart', ru: 'Перезапустить', uk: 'Перезапустити' },
  'start': { en: 'Start', ru: 'Запустить', uk: 'Запустити' },
  'stop': { en: 'Stop', ru: 'Остановить', uk: 'Зупинити' },
  'pause': { en: 'Pause', ru: 'Пауза', uk: 'Пауза' },
  'resume': { en: 'Resume', ru: 'Продолжить', uk: 'Продовжити' },
  'finish': { en: 'Finish', ru: 'Завершить', uk: 'Завершити' },
  'complete': { en: 'Complete', ru: 'Завершить', uk: 'Завершити' },

  // Navigation and Layout
  'menu': { en: 'Menu', ru: 'Меню', uk: 'Меню' },
  'navigation': { en: 'Navigation', ru: 'Навигация', uk: 'Навігація' },
  'sidebar': { en: 'Sidebar', ru: 'Боковая панель', uk: 'Бічна панель' },
  'header': { en: 'Header', ru: 'Заголовок', uk: 'Заголовок' },
  'footer': { en: 'Footer', ru: 'Подвал', uk: 'Підвал' },
  'content': { en: 'Content', ru: 'Содержимое', uk: 'Вміст' },
  'main': { en: 'Main', ru: 'Главный', uk: 'Головний' },
  'page': { en: 'Page', ru: 'Страница', uk: 'Сторінка' },
  'section': { en: 'Section', ru: 'Раздел', uk: 'Розділ' },
  'tab': { en: 'Tab', ru: 'Вкладка', uk: 'Вкладка' },
  'tabs': { en: 'Tabs', ru: 'Вкладки', uk: 'Вкладки' },
  'panel': { en: 'Panel', ru: 'Панель', uk: 'Панель' },
  'widget': { en: 'Widget', ru: 'Виджет', uk: 'Віджет' },
  'component': { en: 'Component', ru: 'Компонент', uk: 'Компонент' },

  // File and Media
  'file': { en: 'File', ru: 'Файл', uk: 'Файл' },
  'files': { en: 'Files', ru: 'Файлы', uk: 'Файли' },
  'image': { en: 'Image', ru: 'Изображение', uk: 'Зображення' },
  'images': { en: 'Images', ru: 'Изображения', uk: 'Зображення' },
  'video': { en: 'Video', ru: 'Видео', uk: 'Відео' },
  'audio': { en: 'Audio', ru: 'Аудио', uk: 'Аудіо' },
  'document': { en: 'Document', ru: 'Документ', uk: 'Документ' },
  'documents': { en: 'Documents', ru: 'Документы', uk: 'Документи' },
  'folder': { en: 'Folder', ru: 'Папка', uk: 'Папка' },
  'size': { en: 'Size', ru: 'Размер', uk: 'Розмір' },
  'format': { en: 'Format', ru: 'Формат', uk: 'Формат' },
  'type': { en: 'Type', ru: 'Тип', uk: 'Тип' },

  // System and Technical
  'system': { en: 'System', ru: 'Система', uk: 'Система' },
  'version': { en: 'Version', ru: 'Версия', uk: 'Версія' },
  'status': { en: 'Status', ru: 'Статус', uk: 'Статус' },
  'configuration': { en: 'Configuration', ru: 'Конфигурация', uk: 'Конфігурація' },
  'options': { en: 'Options', ru: 'Опции', uk: 'Опції' },
  'preferences': { en: 'Preferences', ru: 'Настройки', uk: 'Налаштування' },
  'properties': { en: 'Properties', ru: 'Свойства', uk: 'Властивості' },
  'attributes': { en: 'Attributes', ru: 'Атрибуты', uk: 'Атрибути' },
  'parameters': { en: 'Parameters', ru: 'Параметры', uk: 'Параметри' },
  'values': { en: 'Values', ru: 'Значения', uk: 'Значення' },
  'data': { en: 'Data', ru: 'Данные', uk: 'Дані' },
  'database': { en: 'Database', ru: 'База данных', uk: 'База даних' },
  'server': { en: 'Server', ru: 'Сервер', uk: 'Сервер' },
  'client': { en: 'Client', ru: 'Клиент', uk: 'Клієнт' },
  'connection': { en: 'Connection', ru: 'Соединение', uk: 'З\'єднання' },
  'network': { en: 'Network', ru: 'Сеть', uk: 'Мережа' },
  'internet': { en: 'Internet', ru: 'Интернет', uk: 'Інтернет' },
  'online': { en: 'Online', ru: 'Онлайн', uk: 'Онлайн' },
  'offline': { en: 'Offline', ru: 'Офлайн', uk: 'Офлайн' },
  'connected': { en: 'Connected', ru: 'Подключено', uk: 'Підключено' },
  'disconnected': { en: 'Disconnected', ru: 'Отключено', uk: 'Відключено' },

  // User Interface
  'button': { en: 'Button', ru: 'Кнопка', uk: 'Кнопка' },
  'link': { en: 'Link', ru: 'Ссылка', uk: 'Посилання' },
  'input': { en: 'Input', ru: 'Ввод', uk: 'Введення' },
  'output': { en: 'Output', ru: 'Вывод', uk: 'Виведення' },
  'form': { en: 'Form', ru: 'Форма', uk: 'Форма' },
  'field': { en: 'Field', ru: 'Поле', uk: 'Поле' },
  'label': { en: 'Label', ru: 'Метка', uk: 'Мітка' },
  'placeholder': { en: 'Placeholder', ru: 'Заполнитель', uk: 'Заповнювач' },
  'tooltip': { en: 'Tooltip', ru: 'Подсказка', uk: 'Підказка' },
  'modal': { en: 'Modal', ru: 'Модальное окно', uk: 'Модальне вікно' },
  'dialog': { en: 'Dialog', ru: 'Диалог', uk: 'Діалог' },
  'popup': { en: 'Popup', ru: 'Всплывающее окно', uk: 'Спливаюче вікно' },
  'dropdown': { en: 'Dropdown', ru: 'Выпадающий список', uk: 'Випадаючий список' },
  'checkbox': { en: 'Checkbox', ru: 'Флажок', uk: 'Прапорець' },
  'radio': { en: 'Radio', ru: 'Переключатель', uk: 'Перемикач' },
  'slider': { en: 'Slider', ru: 'Ползунок', uk: 'Повзунок' },
  'progress': { en: 'Progress', ru: 'Прогресс', uk: 'Прогрес' },
  'loading': { en: 'Loading', ru: 'Загрузка', uk: 'Завантаження' },
  'spinner': { en: 'Spinner', ru: 'Спиннер', uk: 'Спіннер' },

  // Permissions and Security
  'permission': { en: 'Permission', ru: 'Разрешение', uk: 'Дозвіл' },
  'permissions': { en: 'Permissions', ru: 'Разрешения', uk: 'Дозволи' },
  'access': { en: 'Access', ru: 'Доступ', uk: 'Доступ' },
  'security': { en: 'Security', ru: 'Безопасность', uk: 'Безпека' },
  'authentication': { en: 'Authentication', ru: 'Аутентификация', uk: 'Автентифікація' },
  'authorization': { en: 'Authorization', ru: 'Авторизация', uk: 'Авторизація' },
  'role': { en: 'Role', ru: 'Роль', uk: 'Роль' },
  'roles': { en: 'Roles', ru: 'Роли', uk: 'Ролі' },
  'user': { en: 'User', ru: 'Пользователь', uk: 'Користувач' },
  'users': { en: 'Users', ru: 'Пользователи', uk: 'Користувачі' },
  'admin': { en: 'Admin', ru: 'Администратор', uk: 'Адміністратор' },
  'administrator': { en: 'Administrator', ru: 'Администратор', uk: 'Адміністратор' },
  'guest': { en: 'Guest', ru: 'Гость', uk: 'Гість' },
  'member': { en: 'Member', ru: 'Участник', uk: 'Учасник' },
  'moderator': { en: 'Moderator', ru: 'Модератор', uk: 'Модератор' },

  // Business and Commerce
  'business': { en: 'Business', ru: 'Бизнес', uk: 'Бізнес' },
  'company': { en: 'Company', ru: 'Компания', uk: 'Компанія' },
  'organization': { en: 'Organization', ru: 'Организация', uk: 'Організація' },
  'customer': { en: 'Customer', ru: 'Клиент', uk: 'Клієнт' },
  'client': { en: 'Client', ru: 'Клиент', uk: 'Клієнт' },
  'service': { en: 'Service', ru: 'Сервис', uk: 'Сервіс' },
  'services': { en: 'Services', ru: 'Сервисы', uk: 'Сервіси' },
  'product': { en: 'Product', ru: 'Продукт', uk: 'Продукт' },
  'products': { en: 'Products', ru: 'Продукты', uk: 'Продукти' },
  'order': { en: 'Order', ru: 'Заказ', uk: 'Замовлення' },
  'orders': { en: 'Orders', ru: 'Заказы', uk: 'Замовлення' },
  'payment': { en: 'Payment', ru: 'Платеж', uk: 'Платіж' },
  'invoice': { en: 'Invoice', ru: 'Счет', uk: 'Рахунок' },
  'receipt': { en: 'Receipt', ru: 'Квитанция', uk: 'Квитанція' },
  'transaction': { en: 'Transaction', ru: 'Транзакция', uk: 'Транзакція' },
  'purchase': { en: 'Purchase', ru: 'Покупка', uk: 'Покупка' },
  'sale': { en: 'Sale', ru: 'Продажа', uk: 'Продаж' },
  'discount': { en: 'Discount', ru: 'Скидка', uk: 'Знижка' },
  'promotion': { en: 'Promotion', ru: 'Акция', uk: 'Акція' },
  'offer': { en: 'Offer', ru: 'Предложение', uk: 'Пропозиція' },
  'deal': { en: 'Deal', ru: 'Сделка', uk: 'Угода' },
  'contract': { en: 'Contract', ru: 'Контракт', uk: 'Контракт' },
  'agreement': { en: 'Agreement', ru: 'Соглашение', uk: 'Угода' }
};

/**
 * Get translation from dictionary by key and language
 */
export function getDictionaryTranslation(key: string, language: 'en' | 'ru' | 'uk'): string | null {
  // Try exact match first
  if (TRANSLATION_DICTIONARY[key]) {
    return TRANSLATION_DICTIONARY[key][language];
  }

  // Try to find by the last part of the key (for nested keys like 'form.submit')
  const keyParts = key.split('.');
  const lastPart = keyParts[keyParts.length - 1].toLowerCase();
  
  if (TRANSLATION_DICTIONARY[lastPart]) {
    return TRANSLATION_DICTIONARY[lastPart][language];
  }

  // Try to find partial matches
  for (const dictKey in TRANSLATION_DICTIONARY) {
    if (lastPart.includes(dictKey) || dictKey.includes(lastPart)) {
      return TRANSLATION_DICTIONARY[dictKey][language];
    }
  }

  return null;
}

/**
 * Check if a key exists in the dictionary
 */
export function isInDictionary(key: string): boolean {
  return getDictionaryTranslation(key, 'en') !== null;
}
