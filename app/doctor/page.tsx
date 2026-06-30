"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Users,
  CalendarDays,
  TrendingUp,
  Activity,
} from "lucide-react";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  patient_name: string;
  symptoms: string;
}

export default function DoctorDashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    today: 0,
    completed: 0,
  });
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>(
    [],
  );
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      setUser(user);

      // Get doctor data
      const { data: doctorData, error: doctorError } = await supabase
        .from("doctors")
        .select("id, specialization, qualification, department_id")
        .eq("id", user.id)
        .maybeSingle();

      if (doctorError || !doctorData) {
        setError("Doctor profile not found");
        setLoading(false);
        return;
      }

      // Get all appointments for this doctor
      const { data: appointments, error } = await supabase
        .from("appointments")
        .select(
          `
        *,
        patient_id
      `,
        )
        .eq("doctor_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Appointments fetch error:", error);
      }

      // Get patient names for appointments
      let appointmentsWithPatients = appointments || [];
      if (appointments && appointments.length > 0) {
        const patientIds = [
          ...new Set(appointments.map((a) => a.patient_id).filter(Boolean)),
        ];

        if (patientIds.length > 0) {
          // Get profiles for patients
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", patientIds);

          const profileMap: Record<string, string> = {};
          if (profilesData) {
            profilesData.forEach((p: any) => {
              profileMap[p.id] = p.full_name || "Unknown Patient";
            });
          }

          appointmentsWithPatients = appointments.map((a: any) => ({
            ...a,
            patient_name: profileMap[a.patient_id] || "Unknown Patient",
          }));
        }
      }

      const today = new Date().toISOString().split("T")[0];

      setStats({
        total: appointments?.length || 0,
        pending:
          appointments?.filter((a) => a.status === "pending").length || 0,
        today:
          appointments?.filter((a) => a.appointment_date === today).length || 0,
        completed:
          appointments?.filter((a) => a.status === "completed").length || 0,
      });

      // Get recent appointments
      const recent = appointmentsWithPatients.slice(0, 5) || [];

      setRecentAppointments(recent);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      setError(error.message || "Failed to load data");
      toast.error("Failed to load dashboard data");
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
        return <CheckCircle className="w-3 h-3" />;
      case "cancelled":
        return <XCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
        <Button
          onClick={() => fetchData()}
          className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
        >
          Try Again
        </Button>
      </div>
    );
  }

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
            Doctor Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Welcome back! Here's your practice overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          >
            <Activity className="w-3 h-3 mr-1" />
            Online
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Total Appointments</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-lg sm:text-2xl font-bold text-amber-600">
                {stats.pending}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Today</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-600">
                {stats.today}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className="p-3 sm:p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Completed</p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-600">
                {stats.completed}
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/doctor/appointments">
          <Card className="p-4 hover:shadow-lg transition-all cursor-pointer hover:border-emerald-200 border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  View Appointments
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Manage all appointments
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
            </div>
          </Card>
        </Link>

        <Link href="/doctor/availability">
          <Card className="p-4 hover:shadow-lg transition-all cursor-pointer hover:border-emerald-200 border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  Set Availability
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Manage your schedule
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
            </div>
          </Card>
        </Link>

        <Link href="/doctor/profile">
          <Card className="p-4 hover:shadow-lg transition-all cursor-pointer hover:border-emerald-200 border border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  Update Profile
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Keep your info current
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 ml-auto" />
            </div>
          </Card>
        </Link>
      </div>

      {/* Recent Appointments */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            Recent Appointments
          </h2>
          <Link href="/doctor/appointments">
            <Button variant="outline" size="sm" className="text-sm">
              View All
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        {recentAppointments.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center">
              <Calendar className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500">No appointments yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Your upcoming appointments will appear here
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentAppointments.map((appointment) => (
              <Card
                key={appointment.id}
                className="p-4 hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-semibold text-sm flex-shrink-0">
                      {appointment.patient_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {appointment.patient_name}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(
                            appointment.appointment_date,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {appointment.appointment_time}
                        </span>
                      </div>
                      {appointment.symptoms && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Symptoms: {appointment.symptoms}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      appointment.status,
                    )}`}
                  >
                    {getStatusIcon(appointment.status)}
                    {getStatusLabel(appointment.status)}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
