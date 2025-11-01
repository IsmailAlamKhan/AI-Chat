import type { Metadata } from "next";
import { Montserrat, Merriweather, Ubuntu_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-sans",
  subsets: ["latin"],
});

const merriweather = Merriweather({
  variable: "--font-serif",
  weight: ["300", "400", "700"],
  subsets: ["latin"],
});

const ubuntuMono = Ubuntu_Mono({
  variable: "--font-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AI Chat",
    template: "%s | AI Chat"
  },
  description: "Modern AI chat interface with Ollama and Google AI. Chat with local and cloud AI models, manage conversations, and get intelligent responses.",
  keywords: ["AI", "Chat", "Ollama", "Google AI", "Gemini", "LLM", "Chatbot"],
  authors: [{ name: "Ismail Alam Khan" }],
  creator: "Ismail Alam Khan",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon.svg", type: "image/svg+xml" },
    ],
  },
  manifest: "/manifest.json",
  themeColor: "#18181b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${montserrat.variable} ${merriweather.variable} ${ubuntuMono.variable} antialiased font-sans`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
