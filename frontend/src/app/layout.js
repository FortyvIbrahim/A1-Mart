"use client";

import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import {
  AllCommunityModule,
  ModuleRegistry,
  TextEditorModule,
} from "ag-grid-community";
import { Providers } from "../contexts/provider";
import SideBar from "@/components/Sidebar";
import { Box, Flex, LocaleProvider } from "@chakra-ui/react";
import { SidebarProvider } from "../contexts/SidebarContext";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { Toaster } from "react-hot-toast";
import { useEffect, useState } from "react";
import axiosInstance from "@/api";
import "react-datepicker/dist/react-datepicker.css";
import Header from "@/components/Header";
import ModuleTabs from "@/components/ModuleTabs";
import { usePathname } from "next/navigation";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

// Figma list-page tables (Master Data, Transports, Logs, Stock Circle, Payroll,
// Accounts) set headers, cells and pagination in Plus Jakarta Sans.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

ModuleRegistry.registerModules([AllCommunityModule, TextEditorModule]);

const AUTH_ROUTES = ["/login", "/register"];

function LayoutContent({ children }) {
  const pathname = usePathname();
  const [loaded, setLoaded] = useState(false);
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");

    if (savedToken) {
      axiosInstance.updateToken(savedToken);
    } else if (
      typeof window !== "undefined" &&
      !AUTH_ROUTES.includes(window.location.pathname)
    ) {
      window.location.href = "/login";
    }

    setLoaded(true);
  }, []);

  // The page scrolls inside #app-scroll-container (not the window), so Next's
  // own scroll reset never applies — start every new page at the top.
  useEffect(() => {
    document
      .getElementById("app-scroll-container")
      ?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  if (!loaded) {
    return <div />;
  }

  if (isAuthRoute) {
    return <Box minH="100dvh" bg="app.base">{children}</Box>;
  }

  return (
    <Flex h="100dvh" overflow="hidden" bg="app.base">
      <SideBar />

      <Flex
        as="main"
        flex={1}
        minW={0}
        flexDirection="column"
        overflowY="auto"
        overflowX="hidden"
        bg="app.base"
        id="app-scroll-container"
      >
        <Header />
        <ModuleTabs />
        <Box flex={1} minW={0} bg="app.base">
          {children}
        </Box>
      </Flex>
    </Flex>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>A1 MART</title>
        <meta name="theme-color" content="#F47721" />
        <link rel="icon" href="/images/A1MartLogo.jpeg" />
        <link rel="apple-touch-icon" href="/images/A1MartLogo.jpeg" />
      </head>
      <body className={`${inter.variable} ${jakarta.variable}`} id="root-portal">
        <Providers>
          <SidebarProvider>
            <LocaleProvider locale="en-IN">
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    borderRadius: "12px",
                    border: "1px solid #F2E2D6",
                    color: "#1F2937",
                    fontSize: "13.5px",
                    boxShadow: "0 12px 32px rgba(31, 41, 55, 0.12)",
                  },
                  success: { iconTheme: { primary: "#16A34A", secondary: "#fff" } },
                  error: { iconTheme: { primary: "#DC2626", secondary: "#fff" } },
                }}
              />
              <LayoutContent>{children}</LayoutContent>
            </LocaleProvider>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  );
}
