import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./provider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "MediBook - Hospital Appointment Booking",
    template: "%s | MediBook",
  },
  description:
    "Book appointments with top doctors online. Manage your health records, find specialists, and get the care you deserve with MediBook's secure healthcare platform.",
  keywords:
    "hospital appointment booking, online doctor booking, healthcare, medical appointments, find doctors, MediBook",
  authors: [{ name: "MediBook Team" }],
  creator: "MediBook",
  publisher: "MediBook",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://medibook-in.vercel.app/",
    title: "MediBook - Hospital Appointment Booking",
    description:
      "Book appointments with top doctors online. Manage your health records and get the care you deserve.",
    siteName: "MediBook",
    images: [
      {
        url: "/logo.jpeg",
        width: 1200,
        height: 630,
        alt: "MediBook - Hospital Appointment Booking",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MediBook - Hospital Appointment Booking",
    description:
      "Book appointments with top doctors online. Manage your health records and get the care you deserve.",
    images: ["/logo.jpeg"],
    creator: "@medibook",
    site: "@medibook",
  },
  icons: {
    icon: [
      { url: "/logo.jpeg", sizes: "32x32" },
      { url: "/logo.jpeg", sizes: "192x192", type: "image/jpeg" },
      { url: "/logo.jpeg", sizes: "512x512", type: "image/jpeg" },
    ],
    apple: [
      { url: "/logo.jpeg", sizes: "180x180", type: "image/jpeg" },
      { url: "/logo.jpeg", sizes: "152x152", type: "image/jpeg" },
      { url: "/logo.jpeg", sizes: "120x120", type: "image/jpeg" },
      { url: "/logo.jpeg", sizes: "76x76", type: "image/jpeg" },
    ],
    shortcut: [{ url: "/logo.jpeg" }],
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/logo.jpeg",
      },
    ],
  },
  manifest: "/manifest.json",
  verification: {
    google: "your-google-verification-code",
  },
  alternates: {
    canonical: "https://medibook.com",
  },
  category: "healthcare",
  applicationName: "MediBook",
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  other: {
    "theme-color": "#10b981",
    "msapplication-TileColor": "#10b981",
    "msapplication-TileImage": "/logo.jpeg",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to Google Fonts for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${inter.className} ${inter.variable} min-h-screen bg-gray-50 font-sans antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
