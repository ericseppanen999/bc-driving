import "leaflet/dist/leaflet.css";
import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";
import { AppProviders } from "@/components/providers/app-providers";

export const metadata: Metadata = {
  title: "BC Driving",
  description: "Traffic cameras and DriveBC events across Vancouver and BC highways."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
