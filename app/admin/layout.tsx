"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Settings,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { decryptKey } from "@/lib/utils";
import { validatePasskey } from "@/lib/utils/validatePasskey";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Define sidebar navigation items
const sidebarNavItems = [
  {
    title: "Overview",
    href: "/admin",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: "Patients",
    href: "/admin/users",
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: "Appointments",
    href: "/admin/appointments",
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    title: "Doctors",
    href: "/admin/scheduling",
    icon: <ClipboardList className="h-5 w-5" />,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const router = useRouter();
  const pathname = usePathname();

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    // Apply theme to document immediately
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };

    // Set initial value
    checkMobile();

    // Add event listener for resize
    window.addEventListener("resize", checkMobile);

    // Clean up
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    // Verify admin authentication
    const encryptedKey =
      typeof window !== "undefined"
        ? window.localStorage.getItem("accessKey")
        : null;

    const verifyAccess = async () => {
      if (!encryptedKey) {
        router.push("/?admin=true");
        return;
      }

      const decryptedKey = decryptKey(encryptedKey);
      const isValid = await validatePasskey(decryptedKey, "admin");

      if (!isValid) {
        router.push("/?admin=true");
        return;
      }

      setLoading(false);
    };

    verifyAccess();
  }, [router]);

  // Add a theme effect to handle theme toggling and persistence
  useEffect(() => {
    // Set initial theme based on user preference
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      setTheme(storedTheme as "light" | "dark");

      // Apply theme class immediately on initial load
      if (storedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      // Default to system preference
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setTheme("dark");
        document.documentElement.classList.add("dark");
      } else {
        setTheme("light");
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("accessKey");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-dark-200">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-gray-500 dark:text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-dark-200 overflow-hidden">
      {/* Mobile Sidebar Toggle - Only visible on mobile */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 lg:hidden group"
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Sidebar */}
      <div
        className={cn(
          "sidebar z-40 fixed border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-300 transition-all duration-300 flex flex-col h-screen overflow-hidden",
          "top-0 bottom-0 lg:left-0",
          sidebarOpen
            ? "translate-x-0 w-64 shadow-lg"
            : "-translate-x-full lg:translate-x-0 lg:w-[70px]"
        )}
      >
        <div className="p-4">
          {/* Logo in sidebar */}
          <Link
            href="/admin"
            className={cn(
              "flex items-center mb-6",
              !sidebarOpen && "lg:justify-center"
            )}
          >
            <Image
              src="/assets/icons/logo-full.svg"
              height={32}
              width={162}
              alt="logo"
              className={cn(
                "h-8 w-fit transition-opacity",
                !sidebarOpen && "lg:opacity-0 lg:hidden"
              )}
            />
            {!sidebarOpen && (
              <Image
                src="/assets/icons/logo-icon.svg"
                height={32}
                width={32}
                alt="logo"
                className="h-8 w-8 hidden lg:block"
              />
            )}
          </Link>

          {/* Desktop sidebar toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn(
              "absolute -right-4 top-6 hidden lg:flex bg-white dark:bg-dark-300 rounded-full border border-gray-200 dark:border-gray-800 shadow-md",
              sidebarOpen ? "rotate-0" : "rotate-180",
              "@media (hover: hover) { &:hover:bg-gray-100 dark:hover:bg-dark-400 }"
            )}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          <TooltipProvider>
            {sidebarNavItems.map((item) => (
              <Tooltip key={item.href} delayDuration={300}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white transition-colors",
                      !sidebarOpen && "lg:justify-center lg:px-2",
                      pathname === item.href && "bg-primary/10 text-primary"
                    )}
                  >
                    <div
                      className={cn(
                        "flex-shrink-0",
                        !sidebarOpen && "lg:mx-auto",
                        pathname === item.href && "text-primary"
                      )}
                    >
                      {item.icon}
                    </div>
                    <span
                      className={cn(
                        "transition-opacity duration-200",
                        !sidebarOpen && "lg:opacity-0 lg:hidden"
                      )}
                    >
                      {item.title}
                    </span>
                  </Link>
                </TooltipTrigger>
                {!sidebarOpen && !isMobile && (
                  <TooltipContent side="right">{item.title}</TooltipContent>
                )}
              </Tooltip>
            ))}
          </TooltipProvider>
        </nav>

        {/* User Avatar Dropdown - Now at bottom of sidebar */}
        <div className={cn("p-4 mt-auto", !sidebarOpen && "lg:px-2")}>
          <Separator className="my-2 bg-gray-200 dark:bg-gray-800" />

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={cn(
              "mb-2 w-full flex justify-center items-center rounded-md py-2 text-gray-600 dark:text-gray-400 transition-colors",
              "data-[state=on]:bg-gray-100 dark:data-[state=on]:bg-dark-400",
              "@media (hover: hover) { &:hover:bg-gray-100 dark:hover:bg-dark-400/50 }",
              !sidebarOpen && "lg:mx-auto"
            )}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "relative w-full flex items-center gap-3 rounded-md px-3 py-2 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors",
                  !sidebarOpen && "lg:justify-center lg:px-2"
                )}
              >
                <Avatar className="h-8 w-8 cursor-pointer ring-1 ring-gray-200 dark:ring-gray-700">
                  <AvatarImage
                    src="https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff"
                    alt="Admin User"
                  />
                  <AvatarFallback className="bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                    AU
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    "flex flex-col items-start transition-opacity duration-200",
                    !sidebarOpen && "lg:opacity-0 lg:hidden"
                  )}
                >
                  <p className="text-sm font-medium">Admin User</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    admin@example.com
                  </p>
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-56 bg-white dark:bg-dark-300 border-gray-200 dark:border-gray-800 p-2"
              align="center"
              side="right"
            >
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-gray-900 dark:text-gray-200 font-medium">
                  Admin User
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  admin@example.com
                </p>
              </div>
              <Separator className="my-2 bg-gray-200 dark:bg-gray-800" />
              <div className="flex flex-col space-y-1">
                <Button
                  variant="ghost"
                  className="flex items-center justify-start gap-2 text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </Button>
                <Button
                  variant="ghost"
                  className="flex items-center justify-start gap-2 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={cn(
          "flex-1 transition-all duration-300 bg-gray-100 dark:bg-dark-200",
          sidebarOpen ? "lg:ml-64" : "lg:ml-[70px]"
        )}
      >
        <main className="h-full overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
