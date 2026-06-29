import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { SessionProvider } from "@/components/providers";
import { auth } from "@/lib/auth/config";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Cloud SecureLens",
    template: "%s | Cloud SecureLens",
  },
  description:
    "Gain complete visibility into AWS account access and database security with intelligent security insights and continuous audit monitoring.",
  keywords: [
    "AWS",
    "security",
    "dashboard",
    "IAM",
    "CloudTrail",
    "Aurora",
    "audit",
    "monitoring",
  ],
  authors: [{ name: "Cloud SecureLens" }],
  creator: "Cloud SecureLens",
};

export const viewport: Viewport = {
  themeColor: "#050b14",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch the session server-side and hydrate the client SessionProvider.
  // This makes useSession() return the user immediately on first render,
  // instead of relying on a client-side fetch that can be unreliable inside
  // the preview's cross-site iframe (which made the Header fall back to "User").
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full dark`}
    >
      <body className="min-h-full flex flex-col antialiased bg-[#050b14] text-slate-200">
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
        <Toaster
          position="top-right"
          theme="dark"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: "rgba(13, 24, 41, 0.95)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              color: "#e2e8f0",
            },
          }}
        />
      </body>
    </html>
  );
}
