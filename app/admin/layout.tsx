"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Users, Calendar, ClipboardList, Menu, X, ChevronLeft, ChevronRight, Settings, LogOut } from "lucide-react";
import { decryptKey } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Define sidebar navigation items
const sidebarNavItems = [
  {
    title: "Dashboard",
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
    title: "Doctor Scheduling",
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
  const router = useRouter();
  const pathname = usePathname();
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    // Set initial value
    checkMobile();
    
    // Add event listener for resize
    window.addEventListener('resize', checkMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  useEffect(() => {
    // Verify admin authentication
    const encryptedKey = typeof window !== "undefined" 
      ? window.localStorage.getItem("accessKey") 
      : null;
    
    if (!encryptedKey) {
      router.push("/?admin=true");
      return;
    }

    const accessKey = encryptedKey && decryptKey(encryptedKey);
    
    if (accessKey !== process.env.NEXT_PUBLIC_ADMIN_PASSKEY!.toString()) {
      router.push("/?admin=true");
      return;
    }
    
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("accessKey");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-dark-200">
      {/* Mobile Sidebar Toggle - Only visible on mobile */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="fixed left-4 top-4 z-50 lg:hidden" 
        onClick={toggleSidebar}
      >
        <Menu className="h-6 w-6" />
      </Button>

      {/* Sidebar */}
      <div 
        className={cn(
          "sidebar z-30 fixed border-r border-gray-800 transition-all duration-300 relative",
          "top-[70px] bottom-0 lg:left-0",
          sidebarOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0 lg:w-[72px]" 
        )}
      >
        <div className={cn(
          "flex items-center justify-between mb-8",
          !sidebarOpen && "lg:justify-center"
        )}>
          {/* Mobile close button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden" 
            onClick={toggleSidebar}
          >
            <X className="h-6 w-6" />
          </Button>
          
          {/* Desktop sidebar toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="hidden lg:flex"
          >
            {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </Button>
        </div>

        <nav className="space-y-2">
          <TooltipProvider>
            {sidebarNavItems.map((item) => (
              <Tooltip key={item.href} delayDuration={300}>
                <TooltipTrigger asChild>
                  <Link 
                    href={item.href} 
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-gray-200 hover:bg-gray-800 hover:text-gray-100 transition-colors",
                      !sidebarOpen && "lg:justify-center lg:px-2",
                      pathname === item.href && "bg-gray-800 text-white"
                    )}
                  >
                    <div className={cn("flex-shrink-0", !sidebarOpen && "lg:mx-auto")}>
                      {item.icon}
                    </div>
                    {(sidebarOpen || isMobile) && <span>{item.title}</span>}
                  </Link>
                </TooltipTrigger>
                {!sidebarOpen && !isMobile && (
                  <TooltipContent side="right">
                    {item.title}
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
          </TooltipProvider>
        </nav>
      </div>

      {/* Main Content */}
      <div className={cn(
        "flex-1 transition-all duration-300 pt-[70px]",
        sidebarOpen ? "lg:ml-72" : "lg:ml-[72px]",
        sidebarOpen && "lg:max-w-full"
      )}>
        <header className="fixed top-0 left-0 right-0 z-40 bg-dark-200 shadow-lg flex items-center justify-between py-4 px-6">
          <div className="flex items-center gap-4 ml-3 lg:ml-6">
            {/* Logo in header (no toggle button) */}
            <Link href="/admin" className="flex items-center">
              <Image
                src="/assets/icons/logo-full.svg"
                height={32}
                width={162}
                alt="logo"
                className="h-8 w-fit"
              />
            </Link>
          </div>
          
          {/* User Avatar Dropdown */}
          <div className="mr-3 lg:mr-6">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 cursor-pointer border border-gray-800">
                    <AvatarImage src="https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff" alt="Admin User" />
                    <AvatarFallback className="bg-gray-800 text-gray-100">AU</AvatarFallback>
                  </Avatar>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 bg-gray-900 border-gray-800 p-2" align="end">
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-gray-200 font-medium">Admin User</p>
                  <p className="text-gray-400 text-sm">admin@example.com</p>
                </div>
                <Separator className="my-2 bg-gray-800" />
                <div className="flex flex-col space-y-1">
                  <Button variant="ghost" className="flex items-center justify-start gap-2 text-gray-200 hover:bg-gray-800 hover:text-gray-100">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    className="flex items-center justify-start gap-2 text-gray-200 hover:bg-gray-800 hover:text-gray-100"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
} 