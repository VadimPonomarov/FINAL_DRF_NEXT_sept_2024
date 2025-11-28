import { getServerSession } from "next-auth/next";
import { authConfig } from "@/configs/auth";

export async function getProfilePageSession() {
  return getServerSession(authConfig);
}
