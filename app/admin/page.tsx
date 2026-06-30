"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import {
  Users,
  Stethoscope,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

interface Stats {
  totalPatients: number;
  totalDoctors: number;
  totalAppointments: number;
  pendingAppointments: number;
  approvedAppointments: number;
  rejectedAppointments: number;
  completedAppointments: number;
  todayAppointments: number;
}

// Fix: Update Activity interface to match actual Supabase response
interface Activity {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  patient: {
    profiles: {
      full_name: string;
    };
  } | null;
  doctor: {
    profiles: {
      full_name: string;
    };
  } | null;
}

export default function AdminDashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalPatients: 0,
    totalDoctors: 0,
    totalAppointments: 0,
    pendingAppointments: 0,
    approvedAppointments: 0,
    rejectedAppointments: 0,
    completedAppointments: 0,
    todayAppointments: 0,
  });
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const { count: patients } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true });

      const { count: doctors } = await supabase
        .from("doctors")
        .select("*", { count: "exact", head: true });

      const { data: appointments } = await supabase
        .from("appointments")
        .select("status, appointment_date");

      const today = new Date().toISOString().split("T")[0];

      setStats({
        totalPatients: patients || 0,
        totalDoctors: doctors || 0,
        totalAppointments: appointments?.length || 0,
        pendingAppointments:
          appointments?.filter((a) => a.status === "pending").length || 0,
        approvedAppointments:
          appointments?.filter((a) => a.status === "approved").length || 0,
        rejectedAppointments:
          appointments?.filter((a) => a.status === "rejected").length || 0,
        completedAppointments:
          appointments?.filter((a) => a.status === "completed").length || 0,
        todayAppointments:
          appointments?.filter((a) => a.appointment_date === today).length || 0,
      });

      const { data: recent } = await supabase
        .from("appointments")
        .select(
          `
          id,
          appointment_date,
          appointment_time,
          status,
          patient:patients (
            profiles (
              full_name
            )
          ),
          doctor:doctors (
            profiles (
              full_name
            )
          )
        `,
        )
        .order("created_at", { ascending: false })
        .limit(5);

      // Fix: Properly map the data to match Activity interface
      if (recent) {
        const mappedActivity: Activity[] = recent.map((item: any) => ({
          id: item.id,
          appointment_date: item.appointment_date,
          appointment_time: item.appointment_time,
          status: item.status,
          patient: item.patient
            ? {
                profiles: {
                  full_name: item.patient.profiles?.[0]?.full_name || "Unknown",
                },
              }
            : null,
          doctor: item.doctor
            ? {
                profiles: {
                  full_name: item.doctor.profiles?.[0]?.full_name || "Unknown",
                },
              }
            : null,
        }));
        setRecentActivity(mappedActivity);
      } else {
        setRecentActivity([]);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      setRecentActivity([]);
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
        return <XCircle className="w-3 h-3" />;
      case "completed":
        return <Activity className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const statCards = [
    {
      title: "Total Patients",
      value: stats.totalPatients,
      icon: Users,
      color: "blue",
      change: "+12%",
      trend: "up",
    },
    {
      title: "Total Doctors",
      value: stats.totalDoctors,
      icon: Stethoscope,
      color: "emerald",
      change: "+8%",
      trend: "up",
    },
    {
      title: "Total Appointments",
      value: stats.totalAppointments,
      icon: Calendar,
      color: "purple",
      change: "+25%",
      trend: "up",
    },
    {
      title: "Today's Appointments",
      value: stats.todayAppointments,
      icon: Clock,
      color: "orange",
      change: stats.todayAppointments > 0 ? "+5" : "0",
      trend: stats.todayAppointments > 0 ? "up" : "neutral",
    },
  ];

  const statusBreakdown = [
    { label: "Pending", value: stats.pendingAppointments, color: "amber" },
    { label: "Approved", value: stats.approvedAppointments, color: "emerald" },
    { label: "Completed", value: stats.completedAppointments, color: "blue" },
    { label: "Rejected", value: stats.rejectedAppointments, color: "rose" },
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
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Overview of your healthcare system performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
            Last updated: Today
          </span>
        </div>
      </div>

      {/* Stats Grid - Mobile First */}
      <div className="grid grid-cols-1 xs:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: "bg-blue-50 text-blue-600",
            emerald: "bg-emerald-50 text-emerald-600",
            purple: "bg-purple-50 text-purple-600",
            orange: "bg-orange-50 text-orange-600",
          };
          return (
            <Card
              key={stat.title}
              className="p-4 sm:p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    {stat.title}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                    {stat.value.toLocaleString()}
                  </p>
                  {stat.change && (
                    <div className="flex items-center gap-1 mt-1.5">
                      {stat.trend === "up" ? (
                        <ArrowUp className="w-3 h-3 text-emerald-600" />
                      ) : stat.trend === "down" ? (
                        <ArrowDown className="w-3 h-3 text-rose-600" />
                      ) : null}
                      <span
                        className={`text-xs font-medium ${
                          stat.trend === "up"
                            ? "text-emerald-600"
                            : stat.trend === "down"
                              ? "text-rose-600"
                              : "text-gray-400"
                        }`}
                      >
                        {stat.change}
                      </span>
                      <span className="text-xs text-gray-400 hidden sm:inline">
                        vs last month
                      </span>
                    </div>
                  )}
                </div>
                <div
                  className={`p-2.5 sm:p-3 rounded-xl flex-shrink-0 ${colorClasses[stat.color as keyof typeof colorClasses]}`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Status Breakdown - Responsive Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {statusBreakdown.map((item) => {
          const percentage = stats.totalAppointments
            ? Math.round((item.value / stats.totalAppointments) * 100)
            : 0;
          const colorMap = {
            amber: "bg-amber-500",
            emerald: "bg-emerald-500",
            blue: "bg-blue-500",
            rose: "bg-rose-500",
          };
          const textMap = {
            amber: "text-amber-600",
            emerald: "text-emerald-600",
            blue: "text-blue-600",
            rose: "text-rose-600",
          };
          return (
            <Card key={item.label} className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs sm:text-sm text-gray-600">
                  {item.label}
                </span>
                <span
                  className={`text-base sm:text-lg font-semibold ${textMap[item.color as keyof typeof textMap]}`}
                >
                  {item.value}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 sm:h-2">
                <div
                  className={`${colorMap[item.color as keyof typeof colorMap]} h-1.5 sm:h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-[10px] sm:text-xs text-gray-400 mt-1">
                {percentage}% of total
              </p>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            Recent Activity
          </h2>
          <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full self-start sm:self-auto">
            Last 5 appointments
          </span>
        </div>
        {recentActivity.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Activity className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {recentActivity.map((activity) => {
              const patientName =
                activity?.patient?.profiles?.full_name || "Unknown";
              const doctorName =
                activity?.doctor?.profiles?.full_name || "Unknown";

              return (
                <div
                  key={activity.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-semibold text-xs flex-shrink-0">
                      {patientName.charAt(0) || "P"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                        {patientName} → Dr. {doctorName}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500">
                        {new Date(activity.appointment_date).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}{" "}
                        at {activity.appointment_time}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium border ${getStatusColor(
                        activity.status,
                      )}`}
                    >
                      {getStatusIcon(activity.status)}
                      {activity.status.charAt(0).toUpperCase() +
                        activity.status.slice(1)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
