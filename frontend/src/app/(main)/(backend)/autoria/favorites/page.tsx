import { Metadata } from "next";
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: "Favorites - CarHub",
  description: "Saved ads and list of desired cars",
};

const Favorites = () => {
  // Перенаправляем на поиск с фильтром избранного
  redirect('/autoria/search?favorites_only=true');
};

export default Favorites;
