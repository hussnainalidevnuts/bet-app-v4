import { Inter } from "next/font/google";
import "./globals.css";
import { ReduxProvider } from "@/components/ReduxProvider";
import { SidebarProvider } from "@/contexts/SidebarContext.js";
import AuthProvider from "@/components/auth/AuthProvider";
import Header from "@/components/Header";
import SidebarWrapper from "@/components/SidebarWrapper";
import ContentWrapper from "@/components/ContentWrapper";
import BetSlip from "@/components/BetSlip";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "BetApp - Sports Betting Platform",
  description:
    "Professional sports betting platform with live odds and markets",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased h-screen overflow-hidden">
        <ReduxProvider>
          <AuthProvider>
            <SidebarProvider>
              <div className="bg-gray-100 h-screen flex flex-col">
                {/* Header */}
                <div className="flex-shrink-0">
                  <Header />
                </div>

                {/* Main Content Area */}
                <div className="flex flex-1 overflow-hidden">
                  {/* Fixed Sidebar */}
                  <SidebarWrapper />

                  {/* Main Content Area with Secondary Navigation */}
                  <ContentWrapper>{children}</ContentWrapper>
                </div>
              </div>

              {/* Bet Slip - Global component */}
              <BetSlip />
            </SidebarProvider>
          </AuthProvider>
        </ReduxProvider>
        <Toaster />
      </body>
    </html>
  );
}
