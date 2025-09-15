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
  title: "Home",
  description: "Welcome to AutoRia - Your trusted car marketplace",
};

export default Home;
