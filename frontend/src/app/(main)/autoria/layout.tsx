import { Metadata } from "next";
import AutoRiaLayout from "@/components/AutoRia/Layout/AutoRiaLayout";

export const metadata: Metadata = {
  title: "CarHub - Система объявлений",
  description: "Платформа для продажи и покупки автомобилей",
};

export default function AutoRiaLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AutoRiaLayout>
      {children}
    </AutoRiaLayout>
  );
}
