"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  Building2,
  XCircle,
  CheckCircle,
  AlertCircle,
  Filter,
  Users,
  Phone,
  FileText,
  RefreshCw,
} from "lucide-react";
import { useAutoRefresh } from "@/lib/hooks/useAutoRefresh";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  symptoms: string;
  notes: string;
  patient_name: string;
  patient_phone?: string;
  patient_id: string;
  department_name?: string;
}

export default function DoctorAppointments() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-refresh every 15 seconds
  const { refresh: autoRefresh } = useAutoRefresh({
    interval: 15000,
    enabled: true,
    onRefresh: async () => {
      console.log("Auto-refreshing doctor appointments...");
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

    const channel = supabase
      .channel("doctor-appointments-realtime")
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

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch appointments for this doctor
      const { data: appointmentsData, error: appointmentsError } =
        await supabase
          .from("appointments")
          .select(
            `
          id,
          appointment_date,
          appointment_time,
          status,
          symptoms,
          notes,
          patient_id,
          department_id
        `,
          )
          .eq("doctor_id", user.id)
          .order("appointment_date", { ascending: true });

      if (appointmentsError) {
        console.error("Error fetching appointments:", appointmentsError);
        throw appointmentsError;
      }

      console.log("Doctor appointments data:", appointmentsData);

      if (!appointmentsData || appointmentsData.length === 0) {
        setAppointments([]);
        setLoading(false);
        return;
      }

      // Get all patient IDs
      const patientIds = [
        ...new Set(appointmentsData.map((a) => a.patient_id).filter(Boolean)),
      ];
      const departmentIds = [
        ...new Set(
          appointmentsData.map((a) => a.department_id).filter(Boolean),
        ),
      ];

      // Fetch patients with their profiles
      let patientsMap: Record<string, any> = {};
      if (patientIds.length > 0) {
        // Get patient data
        const { data: patientsData } = await supabase
          .from("patients")
          .select("id")
          .in("id", patientIds);

        // Get profile data
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", patientIds);

        // Create profile map
        const profileMap: Record<string, any> = {};
        if (profilesData) {
          profilesData.forEach((p: any) => {
            profileMap[p.id] = {
              full_name: p.full_name || "Unknown Patient",
              phone: p.phone || "",
            };
          });
        }

        // Build patients map
        if (patientsData) {
          patientsData.forEach((patient: any) => {
            patientsMap[patient.id] = profileMap[patient.id] || {
              full_name: "Unknown Patient",
              phone: "",
            };
          });
        }

        // If patientsMap is empty, try direct profile lookup
        if (Object.keys(patientsMap).length === 0) {
          const { data: directProfiles } = await supabase
            .from("profiles")
            .select("id, full_name, phone")
            .in("id", patientIds);

          if (directProfiles) {
            directProfiles.forEach((p: any) => {
              patientsMap[p.id] = {
                full_name: p.full_name || "Unknown Patient",
                phone: p.phone || "",
              };
            });
          }
        }
      }

      // Get departments
      let departmentsMap: Record<string, string> = {};
      if (departmentIds.length > 0) {
        const { data: deptsData } = await supabase
          .from("departments")
          .select("id, name")
          .in("id", departmentIds);

        if (deptsData) {
          deptsData.forEach((dept: any) => {
            departmentsMap[dept.id] = dept.name || "Unknown";
          });
        }
      }

      // Build appointments with details
      const formatted = appointmentsData.map((appointment: any) => {
        const patientInfo = patientsMap[appointment.patient_id] || {
          full_name: "Unknown Patient",
          phone: "",
        };

        return {
          ...appointment,
          patient_name: patientInfo.full_name,
          patient_phone: patientInfo.phone,
          department_name:
            departmentsMap[appointment.department_id] || "Unknown",
        };
      });

      console.log("Final formatted appointments:", formatted);
      setAppointments(formatted);
    } catch (error: any) {
      if (!silent) {
        toast.error("Failed to load appointments");
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
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
      case "cancelled":
        return <XCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const filteredAppointments = appointments.filter((a) =>
    filter === "all" ? true : a.status === filter,
  );

  const stats = {
    total: appointments.length,
    pending: appointments.filter((a) => a.status === "pending").length,
    approved: appointments.filter((a) => a.status === "approved").length,
    completed: appointments.filter((a) => a.status === "completed").length,
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
            My Appointments
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage your scheduled appointments with patients
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">Filter:</span>
        </div>
        <select
          className="px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 dark:border-slate-700 w-full sm:w-48 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Appointments</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <span className="text-xs text-gray-400 ml-auto">
          Showing {filteredAppointments.length} of {appointments.length}
        </span>
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center">
            <Calendar className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg font-medium">
              No appointments found
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {filter !== "all"
                ? "Try changing your filter"
                : "You don't have any appointments yet"}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appointment) => (
            <Card
              key={appointment.id}
              className="p-4 sm:p-6 hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                        {appointment.patient_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(
                            appointment.appointment_date,
                          ).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {appointment.appointment_time}
                        </span>
                        {appointment.department_name && (
                          <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {appointment.department_name}
                          </span>
                        )}
                        {appointment.patient_phone && (
                          <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {appointment.patient_phone}
                          </span>
                        )}
                      </div>
                      {appointment.symptoms && (
                        <div className="mt-2 p-2 bg-gray-50 dark:bg-slate-800 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span>
                              <span className="font-medium">Symptoms:</span>{" "}
                              {appointment.symptoms}
                            </span>
                          </p>
                        </div>
                      )}
                      {appointment.notes && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-start gap-1.5">
                          <span className="font-medium">Notes:</span>{" "}
                          {appointment.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex flex-col items-end gap-2 sm:min-w-[140px]">
                  <Badge
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      appointment.status,
                    )}`}
                  >
                    {getStatusIcon(appointment.status)}
                    {getStatusLabel(appointment.status)}
                  </Badge>

                  {appointment.status === "pending" && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => updateStatus(appointment.id, "approved")}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateStatus(appointment.id, "rejected")}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                        Reject
                      </Button>
                    </div>
                  )}

                  {appointment.status === "approved" && (
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => updateStatus(appointment.id, "completed")}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                      Complete
                    </Button>
                  )}

                  {appointment.status === "pending" && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                      <AlertCircle className="w-3 h-3" />
                      Awaiting your decision
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
