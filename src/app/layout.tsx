import type { Metadata, Viewport } from "next";
import "@/index.css";
import { Providers } from "./providers";

const ogImage =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/u0rOXtBjwEVibcrLMy7EhKZZcDj2/social-images/social-1768448376980-Diseño sin título (5) (1).png";

export const metadata: Metadata = {
  title: "VEXA - App Chatbot AI & Automatización",
  description: "Software Chatbot AI & Automatización",
  authors: [{ name: "VEXA" }],
  icons: {
    icon: {
      url: "https://storage.googleapis.com/gpt-engineer-file-uploads/u0rOXtBjwEVibcrLMy7EhKZZcDj2/uploads/1768447991392-Diseño sin título (6)-Photoroom (1).png",
      type: "image/png",
    },
  },
  openGraph: {
    type: "website",
    title: "VEXA - App Chatbot AI & Automatización",
    description: "Software Chatbot AI & Automatización",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    site: "@vexa",
    title: "VEXA - App Chatbot AI & Automatización",
    description: "Software Chatbot AI & Automatización",
    images: [ogImage],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563EB",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
