import { Metadata } from "next";
import CreateAdPage from "@/components/AutoRia/Pages/CreateAdPage";

export const metadata: Metadata = {
  title: "Create Ad - CarHub",
  description: "Create a new car sale advertisement",
};

const CreateAd = () => {
  return <CreateAdPage />;
};

export default CreateAd;
