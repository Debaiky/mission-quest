import type { Metadata, Viewport } from "next";
import { Baloo_2, Bricolage_Grotesque, Instrument_Sans, Nunito } from "next/font/google";
import "./globals.css";

const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-baloo",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Mission Quest",
    template: "%s · Mission Quest",
  },
  description: "Daily missions, streaks and rewards that make family routines feel like a game.",
  applicationName: "Mission Quest",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mission Quest",
  },
};

export const viewport: Viewport = {
  themeColor: "#3f7bea",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${baloo.variable} ${nunito.variable} ${bricolage.variable} ${instrument.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
