"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  PlusCircle,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock as ClockIcon,
  Star,
  ThumbsUp,
  X,
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
  doctor_name: string;
  doctor_specialization: string;
  department_name: string;
  rating?: number;
  review?: string;
  has_review?: boolean;
  doctor_id: string;
}

export default function AppointmentsPage() {
  const supabase = createClient();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<string | null>(
    null,
  );
  const [reviewData, setReviewData] = useState({
    rating: 0,
    review: "",
  });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-refresh every 15 seconds
  const { refresh: autoRefresh } = useAutoRefresh({
    interval: 15000,
    enabled: true,
    onRefresh: async () => {
      console.log("Auto-refreshing appointments...");
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
      .channel("appointments-realtime")
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

      // Get patient ID
      let { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (patientError && patientError.code !== "PGRST116") {
        throw patientError;
      }

      let patientId = patientData?.id;
      if (!patientId) {
        const { data: newPatient, error: createError } = await supabase
          .from("patients")
          .insert({ id: user.id })
          .select("id")
          .single();

        if (createError) throw createError;
        patientId = newPatient.id;
      }

      // Fetch appointments
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
        rating,
        review,
        doctor_id,
        department_id
      `,
          )
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false });

      if (appointmentsError) {
        console.error("Error fetching appointments:", appointmentsError);
        throw appointmentsError;
      }

      console.log("Appointments data:", appointmentsData);

      if (!appointmentsData || appointmentsData.length === 0) {
        setAppointments([]);
        setLoading(false);
        return;
      }

      // Get all doctor IDs
      const doctorIds = [
        ...new Set(appointmentsData.map((a) => a.doctor_id).filter(Boolean)),
      ];
      console.log("Doctor IDs from appointments:", doctorIds);

      // Build doctors map by fetching each doctor's profile individually
      let doctorsMap: Record<string, any> = {};

      for (const doctorId of doctorIds) {
        console.log(`Fetching profile for doctor ID: ${doctorId}`);

        // First, check if doctor exists in doctors table
        const { data: doctorData } = await supabase
          .from("doctors")
          .select("id, specialization, department_id")
          .eq("id", doctorId)
          .single();

        console.log("Doctor data:", doctorData);

        // Then fetch the profile for this specific doctor
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", doctorId)
          .single();

        console.log("Profile data for doctor:", profileData);

        if (profileData) {
          doctorsMap[doctorId] = {
            specialization:
              doctorData?.specialization || "General Practitioner",
            full_name: profileData.full_name || "Unknown Doctor",
            department_id: doctorData?.department_id,
          };
          console.log(`Doctor mapped: ${doctorId} -> ${profileData.full_name}`);
        } else {
          // If profile not found, try one more time with maybeSingle
          const { data: profileFallback } = await supabase
            .from("profiles")
            .select("id, full_name")
            .eq("id", doctorId)
            .maybeSingle();

          if (profileFallback) {
            doctorsMap[doctorId] = {
              specialization:
                doctorData?.specialization || "General Practitioner",
              full_name: profileFallback.full_name || "Unknown Doctor",
              department_id: doctorData?.department_id,
            };
          } else {
            console.log(`No profile found for doctor ID: ${doctorId}`);
            doctorsMap[doctorId] = {
              specialization: "General Practitioner",
              full_name: "Unknown Doctor",
              department_id: null,
            };
          }
        }
      }

      console.log("Final doctors map:", doctorsMap);

      // Get departments
      const departmentIds = [
        ...new Set(
          appointmentsData.map((a) => a.department_id).filter(Boolean),
        ),
      ];
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
      const appointmentsWithDetails = appointmentsData.map(
        (appointment: any) => {
          const doctorInfo = doctorsMap[appointment.doctor_id] || {
            specialization: "General Practitioner",
            full_name: "Unknown Doctor",
          };

          console.log(
            `Appointment ${appointment.id}: doctor_id=${appointment.doctor_id}, name=${doctorInfo.full_name}`,
          );

          return {
            ...appointment,
            doctor_name: doctorInfo.full_name,
            doctor_specialization: doctorInfo.specialization,
            department_name:
              departmentsMap[appointment.department_id] || "Unknown",
            has_review: !!(appointment.rating && appointment.review),
          };
        },
      );

      setAppointments(appointmentsWithDetails);
    } catch (error: any) {
      console.error("Error fetching appointments:", error);
      if (!silent) toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }

  async function cancelAppointment(id: string) {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) throw error;

      toast.success("Appointment cancelled");
      await fetchAppointments(true);
    } catch (error: any) {
      toast.error("Failed to cancel appointment");
      console.error(error);
    }
  }

  async function submitReview(appointmentId: string) {
    if (reviewData.rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    if (!reviewData.review.trim()) {
      toast.error("Please write a review");
      return;
    }

    setSubmitting(true);

    try {
      console.log("Submitting review for appointment:", appointmentId);
      console.log("Review data:", reviewData);

      const { data, error } = await supabase
        .from("appointments")
        .update({
          rating: reviewData.rating,
          review: reviewData.review.trim(),
        })
        .eq("id", appointmentId)
        .select();

      if (error) {
        console.error("Error submitting review:", error);
        toast.error("Failed to submit review: " + error.message);
        throw error;
      }

      console.log("Review submitted successfully:", data);
      toast.success("Review submitted successfully!");

      // Reset modal state
      setShowReviewModal(false);
      setReviewData({ rating: 0, review: "" });
      setSelectedAppointment(null);

      // Refresh appointments to show the review
      await fetchAppointments(true);

      // Update doctor's rating
      await updateDoctorRating(appointmentId);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit review");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateDoctorRating(appointmentId: string) {
    try {
      const { data: appointment } = await supabase
        .from("appointments")
        .select("doctor_id")
        .eq("id", appointmentId)
        .single();

      if (!appointment) return;

      const { data: reviews } = await supabase
        .from("appointments")
        .select("rating")
        .eq("doctor_id", appointment.doctor_id)
        .not("rating", "is", null);

      if (!reviews || reviews.length === 0) return;

      const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
      const averageRating = totalRating / reviews.length;

      await supabase
        .from("doctors")
        .update({
          rating: Math.round(averageRating * 10) / 10,
          total_reviews: reviews.length,
        })
        .eq("id", appointment.doctor_id);

      console.log("Doctor rating updated:", {
        doctor_id: appointment.doctor_id,
        rating: Math.round(averageRating * 10) / 10,
        total_reviews: reviews.length,
      });
    } catch (error) {
      console.error("Error updating doctor rating:", error);
    }
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      pending: "bg-amber-50 text-amber-700 border-amber-200",
      approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
      rejected: "bg-rose-50 text-rose-700 border-rose-200",
      completed: "bg-blue-50 text-blue-700 border-blue-200",
      cancelled: "bg-gray-50 text-gray-600 border-gray-200",
    };
    return colors[status] || "bg-gray-50 text-gray-600 border-gray-200";
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "pending":
        return <ClockIcon className="w-3 h-3" />;
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
  }

  function getStatusLabel(status: string) {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

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
            View and manage all your appointments
            {isRefreshing && (
              <span className="text-emerald-500 ml-2">(Refreshing...)</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
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
          <Link href="/dashboard/book-appointment">
            <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all">
              <PlusCircle className="w-4 h-4 mr-2" />
              Book New Appointment
            </Button>
          </Link>
        </div>
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

      {/* Appointments List */}
      {appointments.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center">
            <Calendar className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg font-medium">
              No appointments yet
            </p>
            <p className="text-sm text-gray-400 mt-1 mb-4">
              Book your first appointment to get started
            </p>
            <Link href="/dashboard/book-appointment">
              <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                <PlusCircle className="w-4 h-4 mr-2" />
                Book Your First Appointment
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <Card
              key={appointment.id}
              className="p-4 sm:p-6 hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-emerald-200 dark:border-slate-700 dark:hover:border-emerald-800"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                      <Stethoscope className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                        Dr. {appointment.doctor_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          {appointment.doctor_specialization}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          {appointment.department_name}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {new Date(
                            appointment.appointment_date,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {appointment.appointment_time}
                        </span>
                      </div>
                      {appointment.symptoms && (
                        <div className="mt-2 p-2 bg-gray-50 dark:bg-slate-800 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Symptoms: {appointment.symptoms}
                          </p>
                        </div>
                      )}
                      {appointment.has_review && (
                        <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < (appointment.rating || 0)
                                    ? "text-yellow-400 fill-current"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                              {appointment.review}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
                    <>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full sm:w-auto"
                        onClick={() => cancelAppointment(appointment.id)}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                        Cancel
                      </Button>
                      <p className="text-[10px] text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Awaiting confirmation
                      </p>
                    </>
                  )}
                  {(appointment.status === "completed" ||
                    appointment.status === "approved") &&
                    !appointment.has_review && (
                      <Button
                        size="sm"
                        className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:shadow-lg hover:shadow-amber-500/25 transition-all"
                        onClick={() => {
                          setSelectedAppointment(appointment.id);
                          setReviewData({ rating: 0, review: "" });
                          setHoverRating(0);
                          setShowReviewModal(true);
                        }}
                      >
                        <Star className="w-3.5 h-3.5 mr-1.5" />
                        Leave Review
                      </Button>
                    )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Leave a Review
                </h2>
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setReviewData({ rating: 0, review: "" });
                    setSelectedAppointment(null);
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Your Rating
                  </label>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() =>
                          setReviewData({ ...reviewData, rating: i + 1 })
                        }
                        onMouseEnter={() => setHoverRating(i + 1)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            (hoverRating || reviewData.rating) > i
                              ? "text-yellow-400 fill-current"
                              : "text-gray-300 dark:text-gray-600"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {reviewData.rating > 0
                      ? `${reviewData.rating} / 5 stars`
                      : "Tap a star to rate"}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Your Review
                  </label>
                  <textarea
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-none"
                    rows={4}
                    value={reviewData.review}
                    onChange={(e) =>
                      setReviewData({ ...reviewData, review: e.target.value })
                    }
                    placeholder="Share your experience with the doctor..."
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {reviewData.review.length} characters
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
                  onClick={() =>
                    selectedAppointment && submitReview(selectedAppointment)
                  }
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <ThumbsUp className="w-4 h-4 mr-2" />
                      Submit Review
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowReviewModal(false);
                    setReviewData({ rating: 0, review: "" });
                    setSelectedAppointment(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
