"use client";

import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import {
  Search,
  Filter,
  Calendar as CalendarIcon,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Stethoscope,
  Building2,
  ChevronDown,
  Eye,
  RefreshCw,
} from "lucide-react";
import { useAutoRefresh } from "@/lib/hooks/useAutoRefresh";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  symptoms: string;
  patient_name: string;
  doctor_name: string;
  department_name: string;
  created_at: string;
}

function AdminAppointmentsContent() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-refresh every 30 seconds for admin
  const { refresh: autoRefresh } = useAutoRefresh({
    interval: 30000,
    enabled: true,
    onRefresh: async () => {
      console.log("Auto-refreshing admin appointments...");
      await fetchAppointments(true);
    },
  });

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchAppointments(false);
    toast.success("Appointments refreshed");
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchAppointments();

    // Real-time subscription for appointments
    const channel = supabase
      .channel("admin-appointments-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        (payload) => {
          console.log("Appointment changed (realtime):", payload);
          fetchAppointments(true);
        },
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchAppointments(silent = false) {
    try {
      if (!silent) setLoading(true);

      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          patient:patients (
            profiles (
              full_name
            )
          ),
          doctor:doctors (
            profiles (
              full_name
            ),
            specialization
          ),
          department:departments (
            name
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted =
        data?.map((a: any) => ({
          ...a,
          patient_name: a.patient?.profiles?.full_name || "Unknown",
          doctor_name: a.doctor?.profiles?.full_name || "Unknown",
          department_name: a.department?.name || "Unknown",
        })) || [];

      setAppointments(formatted);
    } catch (error: any) {
      if (!silent) toast.error("Failed to load appointments");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function updateAppointmentStatus(id: string, status: string) {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Appointment ${status}`);
      await fetchAppointments(true);
    } catch (error: any) {
      toast.error("Failed to update status");
      console.error(error);
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
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const filteredAppointments = appointments.filter((a) => {
    const matchesSearch =
      a.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.doctor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.department_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || a.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: appointments.length,
    pending: appointments.filter((a) => a.status === "pending").length,
    approved: appointments.filter((a) => a.status === "approved").length,
    completed: appointments.filter((a) => a.status === "completed").length,
    rejected: appointments.filter((a) => a.status === "rejected").length,
  };

  if (loading && !isRefreshing) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Loading appointments...</p>
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
            Appointments
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage all appointments across the system
            {isRefreshing && (
              <span className="text-emerald-500 ml-2">(Refreshing...)</span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="border-gray-300 dark:border-slate-600"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3 sm:p-4">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            {stats.total}
          </p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs text-gray-500">Pending</p>
          <p className="text-lg sm:text-xl font-bold text-amber-600">
            {stats.pending}
          </p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs text-gray-500">Approved</p>
          <p className="text-lg sm:text-xl font-bold text-emerald-600">
            {stats.approved}
          </p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs text-gray-500">Completed</p>
          <p className="text-lg sm:text-xl font-bold text-blue-600">
            {stats.completed}
          </p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs text-gray-500">Rejected</p>
          <p className="text-lg sm:text-xl font-bold text-rose-600">
            {stats.rejected}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by patient, doctor, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
        <select
          className="px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 dark:border-slate-700 w-full sm:w-48"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="text-left py-3 px-3 sm:px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="text-left py-3 px-3 sm:px-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Doctor
                </th>
                <th className="text-left py-3 px-3 sm:px-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Department
                </th>
                <th className="text-left py-3 px-3 sm:px-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Date & Time
                </th>
                <th className="text-left py-3 px-3 sm:px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right py-3 px-3 sm:px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No appointments found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {searchTerm || statusFilter !== "all"
                        ? "Try adjusting your filters"
                        : "No appointments in the system yet"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((appointment) => (
                  <tr
                    key={appointment.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-semibold text-sm flex-shrink-0">
                          {appointment.patient_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {appointment.patient_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">
                            {appointment.doctor_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 sm:px-4 hidden sm:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {appointment.doctor_name}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 hidden md:table-cell">
                      <Badge
                        variant="secondary"
                        className="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                      >
                        {appointment.department_name}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 sm:px-4 hidden lg:table-cell">
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {new Date(
                          appointment.appointment_date,
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-xs text-gray-400">
                        {appointment.appointment_time}
                      </div>
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          appointment.status,
                        )}`}
                      >
                        {getStatusIcon(appointment.status)}
                        {getStatusLabel(appointment.status)}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                        {appointment.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() =>
                                updateAppointmentStatus(
                                  appointment.id,
                                  "approved",
                                )
                              }
                              title="Approve"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 w-8 p-0"
                              onClick={() =>
                                updateAppointmentStatus(
                                  appointment.id,
                                  "rejected",
                                )
                              }
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {appointment.status === "approved" && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() =>
                              updateAppointmentStatus(
                                appointment.id,
                                "completed",
                              )
                            }
                          >
                            Complete
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setShowViewModal(true);
                          }}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4 text-gray-400 hover:text-emerald-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* View Appointment Modal */}
      {showViewModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Appointment Details
                </h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                >
                  <XCircle className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xl">
                    {selectedAppointment.patient_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedAppointment.patient_name}
                    </h3>
                    <p className="text-sm text-gray-500">Patient</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Stethoscope className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Dr. {selectedAppointment.doctor_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {selectedAppointment.department_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {new Date(
                        selectedAppointment.appointment_date,
                      ).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      at {selectedAppointment.appointment_time}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Status:{" "}
                      <span
                        className={`font-medium ${getStatusColor(
                          selectedAppointment.status,
                        )}`}
                      >
                        {getStatusLabel(selectedAppointment.status)}
                      </span>
                    </span>
                  </div>
                  {selectedAppointment.symptoms && (
                    <div className="flex items-start gap-3 text-sm">
                      <span className="text-gray-400">📋</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        Symptoms: {selectedAppointment.symptoms}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                  onClick={() => setShowViewModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main export with Suspense
export default function AdminAppointments() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[60vh]">
          <div className="relative text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500">
              Loading appointments...
            </p>
          </div>
        </div>
      }
    >
      <AdminAppointmentsContent />
    </Suspense>
  );
}
