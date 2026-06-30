"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import {
  LayoutDashboard,
  Calendar,
  Clock,
  User,
  LogOut,
  Menu,
  X,
  Stethoscope,
  Home,
  CalendarDays,
  Timer,
  UserCircle,
  Power,
} from "lucide-react";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    getUser();
  }, []);

  async function getUser() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Check if user is a doctor
      const { data: doctorData, error } = await supabase
        .from("doctors")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (error || !doctorData) {
        toast.error("Access denied. Doctor only.");
        router.push("/dashboard");
        return;
      }

      setUser(user);
    } catch (error) {
      console.error("Error:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    router.push("/login");
  };

  const navigation = [
    { name: "Dashboard", href: "/doctor", icon: LayoutDashboard },
    {
      name: "Appointments",
      href: "/doctor/appointments",
      icon: Calendar,
    },
    {
      name: "Availability",
      href: "/doctor/availability",
      icon: Clock,
    },
    { name: "Profile", href: "/doctor/profile", icon: User },
  ];

  // Mobile bottom navigation
  const mobileTabs = [
    { name: "Home", href: "/doctor", icon: Home },
    {
      name: "Appointments",
      href: "/doctor/appointments",
      icon: CalendarDays,
    },
    {
      name: "Availability",
      href: "/doctor/availability",
      icon: Timer,
    },
    { name: "Profile", href: "/doctor/profile", icon: UserCircle },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="relative text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-16 md:pb-0">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shadow-lg shadow-emerald-500/25">
              <Image
                src="/logo.jpeg"
                alt="MediBook Logo"
                width={32}
                height={32}
                className="object-cover"
              />
            </div>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              Medi<span className="text-emerald-600">Book</span>
            </span>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] px-2 py-0.5 rounded-full">
              Doctor
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition text-red-500"
              title="Logout"
            >
              <Power className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-[999] w-64 h-full bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo - Desktop */}
          <div className="hidden lg:flex items-center space-x-2 p-6 border-b border-gray-200 dark:border-slate-700">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-emerald-500/25">
              <Image
                src="/logo.jpeg"
                alt="MediBook Logo"
                width={40}
                height={40}
                className="object-cover"
                priority
              />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              Medi<span className="text-emerald-600">Book</span>
            </span>
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] px-2 py-0.5 rounded-full ml-1">
              Doctor
            </Badge>
          </div>

          {/* Mobile Sidebar Header */}
          <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shadow-lg shadow-emerald-500/25">
                <Image
                  src="/logo.jpeg"
                  alt="MediBook Logo"
                  width={32}
                  height={32}
                  className="object-cover"
                />
              </div>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                Medi<span className="text-emerald-600">Book</span>
              </span>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px] px-2 py-0.5 rounded-full">
                Doctor
              </Badge>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                    ${
                      isActive
                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 shadow-sm"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon
                    className={`w-5 h-5 ${isActive ? "text-emerald-600 dark:text-emerald-400" : ""}`}
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-semibold shadow-lg shadow-emerald-500/25">
                {user?.email?.[0]?.toUpperCase() || "D"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Doctor
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-center text-sm border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pt-14 md:pt-0">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shadow-lg">
        <div className="flex justify-around items-center h-16">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`
                  flex flex-col items-center justify-center px-3 py-1 rounded-lg transition-all
                  ${
                    isActive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-gray-500 dark:text-gray-400"
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? "scale-110" : ""}`} />
                <span
                  className={`text-[10px] mt-0.5 ${isActive ? "font-semibold" : ""}`}
                >
                  {tab.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Overlay - Higher z-index to cover everything except sidebar */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[998] bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
