import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BoolBul | Drop Churn, Keep The Cash",
  description:
    "The first native retention & cancel deflection engine for Dodo Payments. Zero-trust execution, 45-second setup.",
  icons: {
    icon: "/brand/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen selection:bg-lime selection:text-pitch">
        {children}
      </body>
    </html>
  );
}

