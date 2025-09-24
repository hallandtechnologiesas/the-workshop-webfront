import type { Metadata } from "next";
import "./globals.css";

import ReactQueryProvider from "./react-query-provider";

export const metadata: Metadata = {
  title: "The Workshop",
  description: "On-demand 3D printing in Cairo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </body>
    </html>
  );
}
