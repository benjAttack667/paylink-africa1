import { DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans"
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

export const metadata = {
  title: "PayLink Africa",
  description: "MVP de plateforme de liens de paiement pour vendeurs africains"
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f3ea",
  colorScheme: "light",
  interactiveWidget: "resizes-content"
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className={`${dmSans.variable} ${spaceGrotesk.variable}`}>
        {children}
      </body>
    </html>
  );
}
