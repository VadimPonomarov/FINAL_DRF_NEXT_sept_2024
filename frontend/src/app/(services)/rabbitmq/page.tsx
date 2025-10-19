import { Metadata } from "next";
import RabbitMQFrame from "@/components/RabbitMQ/RabbitMQFrame";

export const metadata: Metadata = {
  title: "RabbitMQ Management",
  description: "RabbitMQ Management Interface",
};

export const dynamic = 'force-dynamic';

const RabbitMQPage = () => {
  return <RabbitMQFrame />;
};

export default RabbitMQPage;