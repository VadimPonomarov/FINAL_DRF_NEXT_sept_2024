import type { Metadata } from "next";

export const getMetadata = async ({
  title,
  description,
}: Metadata): Promise<Metadata> => ({
  title,
  description,
});
