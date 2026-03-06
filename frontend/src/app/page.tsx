import React from "react";
import { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { authConfig } from "@/configs/auth";
import HomeContent from "@/components/HomeContent";
import { getMetadata } from "./index.metadata";

export const dynamic = 'force-dynamic';

const Home = async () => {
  // Получаем сессию на сервере
  const session = await getServerSession(authConfig);

  console.log('[Home Page] Server session:', session);

  return <HomeContent serverSession={session} />;
};

export const metadata: Metadata = {
  title: "Головна",
  description: "Купівля та продаж автомобілів. Найбільший маркетплейс оголошень про авто в Україні.",
};

export default Home;
