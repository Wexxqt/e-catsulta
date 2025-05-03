import type { Metadata } from "next";
import "./globals.css";
import { Bricolage_Grotesque as FontSans } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { RealtimeProvider } from "@/contexts/RealtimeContext";
import ToastProvider from "@/components/ToastProvider";

import { cn } from "@/lib/utils";

const fontSans = FontSans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
});

const description =
  "An online appointment system designed to make healthcare services at Catanduanes State University Infirmary more accessible and hassle-free. E-Catsulta lets students and employees schedule visits, check doctor availability, and avoid long waits—anytime, anywhere.";

export const metadata: Metadata = {
  title: "E-Catsulta",
  description,
  keywords: [
    "healthcare appointment",
    "online scheduling",
    "Catanduanes State University",
    "doctor appointments",
    "university health services",
    "CSU infirmary",
    "student healthcare",
    "medical appointment",
    "healthcare booking",
  ],
  authors: [{ name: "E-Catsulta" }],
  creator: "E-Catsulta",
  publisher: "E-Catsulta",
  icons: {
    icon: "/assets/icons/logo-icon.svg",
    apple: "/assets/icons/logo-icon.svg",
  },
  metadataBase: new URL("https://book-ecatsulta.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://book-ecatsulta.com",
    title: "E-Catsulta",
    description,
    siteName: "E-Catsulta",
    images: [
      {
        url: "/assets/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "E-Catsulta Banner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "E-Catsulta",
    description,
    images: ["/assets/images/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-dark-300 font-sans antialiased",
          fontSans.variable
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="dark">
          <ToastProvider>
            <RealtimeProvider>{children}</RealtimeProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
