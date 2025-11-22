import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./frontend/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Explode Anything",
  description: "Upload a photo. SAM 3 will identify the parts. SAM 3D will build the geometry.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}

