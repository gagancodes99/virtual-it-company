"use client";

import { SessionProvider } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useEffect } from "react";

function AuthSync({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    if (status === "loading") {
      setLoading(true);
    } else {
      setLoading(false);
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          name: session.user.name!,
          image: session.user.image,
          role: session.user.role,
          tenantId: session.user.tenantId,
        });
      } else {
        setUser(null);
      }
    }
  }, [session, status, setUser, setLoading]);

  return <>{children}</>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthSync>{children}</AuthSync>
    </SessionProvider>
  );
}