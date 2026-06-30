"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  HeartPulse,
  Stethoscope,
  User,
  CalendarDays,
  PlusCircle,
  Activity,
  TrendingUp,
} from "lucide-react";

export default function DashboardPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    completed: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: patientData } = await supabase
        .from("patients")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!patientData) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          doctor:doctors (
            profiles (
              full_name
            ),
            specialization
          )
        `,
        )
        .eq("patient_id", patientData.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setStats({
        total: data?.length || 0,
        pending: data?.filter((a) => a.status === "pending").length || 0,
        approved: data?.filter((a) => a.status === "approved").length || 0,
        completed: data?.filter((a) => a.status === "completed").length || 0,
      });

      setRecentAppointments(data?.slice(0, 3) || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-amber-50 text-amber-700 border-amber-200",
      approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
      rejected: "bg-rose-50 text-rose-700 border-rose-200",
      completed: "bg-blue-50 text-blue-700 border-blue-200",
      cancelled: "bg-gray-50 text-gray-600 border-gray-200",
    };
    return colors[status] || "bg-gray-50 text-gray-600 border-gray-200";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-3 h-3" />;
      case "approved":
        return <CheckCircle className="w-3 h-3" />;
      case "rejected":
        return <AlertCircle className="w-3 h-3" />;
      case "completed":
        return <CheckCircle className="w-3 h-3" />;
      case "cancelled":
        return <AlertCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const quickActions = [
    {
      title: "Book Appointment",
      description: "Schedule a new appointment",
      icon: PlusCircle,
      href: "/dashboard/book-appointment",
      color: "emerald",
    },
    {
      title: "View Appointments",
      description: "See all your appointments",
      icon: CalendarDays,
      href: "/dashboard/appointments",
      color: "blue",
    },
    {
      title: "Update Profile",
      description: "Manage your information",
      icon: User,
      href: "/dashboard/profile",
      color: "purple",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
            Welcome Back! 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Here's what's happening with your health today
          </p>
        </div>
        <Link href="/dashboard/book-appointment">
          <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all">
            <PlusCircle className="w-4 h-4 mr-2" />
            New Appointment
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 border-l-4 border-emerald-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 border-l-4 border-amber-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                {stats.pending}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 border-l-4 border-emerald-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Approved</p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {stats.approved}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 border-l-4 border-blue-500 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Completed</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.completed}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <HeartPulse className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const colorClasses = {
              emerald: "hover:border-emerald-500 hover:shadow-emerald-100",
              blue: "hover:border-blue-500 hover:shadow-blue-100",
              purple: "hover:border-purple-500 hover:shadow-purple-100",
            };
            const bgClasses = {
              emerald: "bg-emerald-100 text-emerald-600",
              blue: "bg-blue-100 text-blue-600",
              purple: "bg-purple-100 text-purple-600",
            };
            return (
              <Link key={action.title} href={action.href}>
                <Card
                  className={`p-4 text-center transition-all duration-300 cursor-pointer hover:shadow-xl hover:-translate-y-1 border border-gray-100 dark:border-slate-700 ${colorClasses[action.color as keyof typeof colorClasses]}`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${bgClasses[action.color as keyof typeof bgClasses]} flex items-center justify-center mx-auto mb-3`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                    {action.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {action.description}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Appointments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Recent Appointments
          </h2>
          <Link
            href="/dashboard/appointments"
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center"
          >
            View All
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        {recentAppointments.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center">
              <div className="text-4xl mb-3">🏥</div>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                No appointments yet
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Book your first appointment to get started
              </p>
              <Link href="/dashboard/book-appointment">
                <Button
                  variant="outline"
                  className="mt-4 border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Book Your First Appointment
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {recentAppointments.map((appointment) => (
              <Card
                key={appointment.id}
                className="p-3 sm:p-4 hover:shadow-md transition-shadow border border-gray-100 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <Stethoscope className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        Dr.{" "}
                        {appointment.doctor?.profiles?.full_name || "Unknown"}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {appointment.doctor?.specialization || "General"}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(
                            appointment.appointment_date,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-xs text-gray-400">at</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {appointment.appointment_time}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-1">
                    <Badge
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                        appointment.status,
                      )}`}
                    >
                      {getStatusIcon(appointment.status)}
                      {getStatusLabel(appointment.status)}
                    </Badge>
                    {appointment.status === "pending" && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Awaiting confirmation
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
