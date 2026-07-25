"use client";

import StoreProvider from "@/state/redux";
import { AuthProvider } from "@/context/AuthContext";

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <StoreProvider>
      <AuthProvider>{children}</AuthProvider>
    </StoreProvider>
  );
};

export default Providers;
