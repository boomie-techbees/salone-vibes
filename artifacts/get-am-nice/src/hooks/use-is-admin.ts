import { useUser } from "@clerk/react";

export function useIsAdmin(): boolean {
  const { user } = useUser();
  return user?.publicMetadata?.role === "admin";
}
