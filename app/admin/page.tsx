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
  TrendingUp,
  BarChart3,
  PieChart,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
);

interface Stats {
  totalPatients: number;
  totalDoctors: number;
  totalAppointments: number;
  pendingAppointments: number;
  approvedAppointments: number;
  rejectedAppointments: number;
  completedAppointments: number;
  todayAppointments: number;
  weeklyAppointments: number[];
  monthlyAppointments: number[];
}

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
    weeklyAppointments: [0, 0, 0, 0, 0, 0, 0],
    monthlyAppointments: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  });
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [selectedChart, setSelectedChart] = useState<"weekly" | "monthly">(
    "weekly",
  );

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
        .select("status, appointment_date, created_at");

      const today = new Date().toISOString().split("T")[0];

      // Calculate weekly appointments
      const weeklyData = [0, 0, 0, 0, 0, 0, 0];
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        const dateStr = date.toISOString().split("T")[0];
        weeklyData[i] =
          appointments?.filter((a) => a.appointment_date === dateStr).length ||
          0;
      }

      // Calculate monthly appointments
      const monthlyData = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      const currentMonth = new Date().getMonth();
      for (let i = 0; i < 12; i++) {
        const monthIndex = (currentMonth - 11 + i + 12) % 12;
        const year = new Date().getFullYear();
        const date = new Date(year, monthIndex, 1);
        const startOfMonth = date.toISOString().split("T")[0];
        const endOfMonth = new Date(year, monthIndex + 1, 1)
          .toISOString()
          .split("T")[0];
        monthlyData[i] =
          appointments?.filter(
            (a) =>
              a.appointment_date >= startOfMonth &&
              a.appointment_date < endOfMonth,
          ).length || 0;
      }

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
        weeklyAppointments: weeklyData,
        monthlyAppointments: monthlyData,
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

  // Chart Data
  const barChartData = {
    labels:
      selectedChart === "weekly"
        ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        : [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ],
    datasets: [
      {
        label: "Appointments",
        data:
          selectedChart === "weekly"
            ? stats.weeklyAppointments
            : stats.monthlyAppointments,
        backgroundColor: [
          "rgba(99, 102, 241, 0.7)",
          "rgba(99, 102, 241, 0.7)",
          "rgba(99, 102, 241, 0.7)",
          "rgba(99, 102, 241, 0.7)",
          "rgba(99, 102, 241, 0.7)",
          "rgba(99, 102, 241, 0.7)",
          "rgba(99, 102, 241, 0.7)",
        ],
        borderColor: "rgba(99, 102, 241, 1)",
        borderWidth: 2,
        borderRadius: 8,
        barPercentage: 0.6,
      },
    ],
  };

  const lineChartData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Appointments",
        data: stats.weeklyAppointments,
        fill: true,
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        borderColor: "rgba(99, 102, 241, 1)",
        tension: 0.4,
        pointBackgroundColor: "rgba(99, 102, 241, 1)",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  const doughnutData = {
    labels: ["Pending", "Approved", "Completed", "Rejected"],
    datasets: [
      {
        data: [
          stats.pendingAppointments,
          stats.approvedAppointments,
          stats.completedAppointments,
          stats.rejectedAppointments,
        ],
        backgroundColor: [
          "rgba(234, 179, 8, 0.8)",
          "rgba(34, 197, 94, 0.8)",
          "rgba(59, 130, 246, 0.8)",
          "rgba(239, 68, 68, 0.8)",
        ],
        borderColor: [
          "rgba(234, 179, 8, 1)",
          "rgba(34, 197, 94, 1)",
          "rgba(59, 130, 246, 1)",
          "rgba(239, 68, 68, 1)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
    },
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
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Overview of your healthcare system performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 bg-gray-50 dark:bg-slate-800 px-3 py-1 rounded-full">
            Last updated: Today
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
            emerald:
              "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
            purple:
              "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
            orange:
              "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
          };
          return (
            <Card
              key={stat.title}
              className="p-4 sm:p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {stat.title}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Appointment Trends
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedChart("weekly")}
                className={`px-3 py-1 text-xs rounded-lg transition-all ${
                  selectedChart === "weekly"
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setSelectedChart("monthly")}
                className={`px-3 py-1 text-xs rounded-lg transition-all ${
                  selectedChart === "monthly"
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
          <div className="h-64">
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </Card>

        {/* Doughnut Chart */}
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Status Distribution
          </h3>
          <div className="h-64">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </Card>
      </div>

      {/* Line Chart - Weekly Trend */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Weekly Trend
          </h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
              <span className="text-xs text-gray-500">Appointments</span>
            </div>
          </div>
        </div>
        <div className="h-48">
          <Line data={lineChartData} options={chartOptions} />
        </div>
      </Card>

      {/* Status Breakdown */}
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
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {item.label}
                </span>
                <span
                  className={`text-base sm:text-lg font-semibold ${textMap[item.color as keyof typeof textMap]}`}
                >
                  {item.value}
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 sm:h-2">
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
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            Recent Activity
          </h2>
          <span className="text-xs text-gray-400 bg-gray-50 dark:bg-slate-800 px-3 py-1 rounded-full self-start sm:self-auto">
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
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex-shrink-0">
                      {patientName.charAt(0) || "P"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                        {patientName} → Dr. {doctorName}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
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
