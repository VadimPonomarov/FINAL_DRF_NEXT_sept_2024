import React from "react";
import { Metadata } from "next";
import HomeContent from "@/components/HomeContent";
import { getMetadata } from "./index.metadata";

export const dynamic = 'force-dynamic';

const Home = async () => {
  return <HomeContent />;
};

export const metadata: Metadata = {
  title: "Home",
  description: "Welcome to AutoRia - Your trusted car marketplace",
};

export default Home;
