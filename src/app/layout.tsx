import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { AuthProvider } from "@/context/AuthContext"; // Import baru

export const metadata: Metadata = {
  title: "CloudResto POS",
  description: "Modern Restaurant Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-slate-900 antialiased font-sans">
        <AuthProvider>
          {" "}
          {/* Bungkus di sini */}
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 ml-0 md:ml-64 p-8 transition-all duration-300 ease-in-out">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
