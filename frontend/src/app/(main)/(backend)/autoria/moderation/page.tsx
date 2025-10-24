import { Metadata } from "next";
import ModerationPage from "@/components/AutoRia/Pages/ModerationPage";

export const metadata: Metadata = {
  title: "Модерация - AutoRia",
  description: "Модерация объявлений на платформе AutoRia",
};

const Moderation = () => {
  console.log('🚀 [Moderation Page Route] Rendering ModerationPage component');
  return <ModerationPage />;
};

export default Moderation;
