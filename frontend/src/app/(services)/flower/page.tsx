import { Metadata } from "next";
import FlowerFrame from "@/components/Flower/FlowerFrame";

export const metadata: Metadata = {
  title: "Flower Monitoring",
  description: "Celery task monitoring with Flower",
};

export const dynamic = 'force-dynamic';

const FlowerPage = () => {
  return <FlowerFrame />;
};

export default FlowerPage;