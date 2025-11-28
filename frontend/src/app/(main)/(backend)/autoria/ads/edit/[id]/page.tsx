import { Metadata } from "next";
import { EditAdPageView } from "./EditAdPageView";

export const metadata: Metadata = {
  title: "Edit Ad - CarHub",
  description: "Edit your car sale advertisement",
};

interface EditAdProps {
  params: Promise<{
    id: string;
  }>;
}

const EditAd = async ({ params }: EditAdProps) => {
  const resolvedParams = await params;

  return <EditAdPageView id={resolvedParams.id} />;
};

export default EditAd;
