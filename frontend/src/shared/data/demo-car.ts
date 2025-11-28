// Demo car data for showcasing the redesigned showroom page
export const demoCarAd = {
  id: 46,
  title: "BMW 5 Series 2015 - идеальный стан",
  description: `Продается BMW 5 Series 2015 року випуску в відмінному стані. 
Автомобіль має повну історію обслуговування та знаходиться в місті Київ.

Особливості:
• Повна сервісна історія
• Один власник
• Не битий, не крашений
• Всі ТО пройдені вчасно
• Зимові та літні шини в комплекті
• Сигналізація з автозапуском
• Парктроніки передні та задні
• Камера заднього виду
• Шкіряний салон
• Клімат-контроль
• Навігаційна система
• Bluetooth
• USB/AUX входи

Автомобіль в ідеальному технічному стані, готовий до експлуатації.
Всі системи працюють бездоганно.

Причина продажу - переїзд за кордон.`,
  brand: "BMW",
  model: "5 Series",
  year: 2015,
  mileage: 135000,
  price: 35000,
  currency: "USD",
  status: "active",
  is_validated: true,
  view_count: 245,
  created_at: "2024-08-21T10:30:00Z",
  updated_at: "2024-08-21T10:30:00Z",
  
  // Location
  region: {
    id: 1,
    name: "Київська область"
  },
  city: {
    id: 1,
    name: "Київ"
  },
  
  // Car specifications
  car_specs: {
    year: 2015,
    mileage: 135000,
    engine_volume: 2.0,
    fuel_type: "Бензин",
    transmission: "Автомат",
    body_type: "Седан",
    color: "Чорний",
    condition: "Відмінний",
    owners_count: 1,
    vin: "WBAFR1C50ED123456"
  },
  
  // User/Seller
  user: {
    id: 1,
    email: "pvs.versia@gmail.com",
    account_type: "premium"
  },
  
  // Images
  images: [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1555215695-3004980ad54e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      is_main: true,
      order: 0
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      is_main: false,
      order: 1
    },
    {
      id: 3,
      image: "https://images.unsplash.com/photo-1502877338535-766e1452684a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2072&q=80",
      is_main: false,
      order: 2
    },
    {
      id: 4,
      image: "https://images.unsplash.com/photo-1494905998402-395d579af36f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      is_main: false,
      order: 3
    },
    {
      id: 5,
      image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
      is_main: false,
      order: 4
    }
  ],
  
  // Additional fields
  seller_type: "private",
  exchange_status: "no_exchange",
  is_favorite: false
};
