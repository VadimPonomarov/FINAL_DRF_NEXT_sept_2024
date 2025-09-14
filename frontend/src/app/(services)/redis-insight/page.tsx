import { Metadata } from "next";
import RedisInsightFrame from "@/components/RedisInsight/RedisInsightFrame";

export const metadata: Metadata = {
  title: "Redis Insight",
  description: "Redis database monitoring",
};

const RedisInsightPage = () => {
  return (
    <div className="py-10 px-0 w-full h-full">
      <RedisInsightFrame />
    </div>
  );
};

export default RedisInsightPage;
