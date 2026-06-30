"use client";

import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#fff",
            color: "#1a1a1a",
            borderRadius: "12px",
            padding: "16px 20px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
            fontSize: "14px",
            fontFamily: "Inter, system-ui, sans-serif",
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff",
            },
            style: {
              borderLeft: "4px solid #10b981",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
            style: {
              borderLeft: "4px solid #ef4444",
            },
          },
          loading: {
            style: {
              borderLeft: "4px solid #6366f1",
            },
          },
        }}
      />
    </>
  );
}
