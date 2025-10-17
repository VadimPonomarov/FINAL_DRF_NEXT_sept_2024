import { Metadata } from "next";
import MyAdsPage from "@/components/AutoRia/Pages/MyAdsPage";

export const metadata: Metadata = {
  title: "My Ads - CarHub",
  description: "Manage your car sale advertisements",
};

const MyAds = () => {
  return <MyAdsPage />;
};

export default MyAds;
