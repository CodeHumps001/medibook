"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  Building2,
  FileText,
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  XCircle,
  DollarSign,
  Award,
} from "lucide-react";

interface Department {
  id: string;
  name: string;
  description: string;
}

interface Doctor {
  id: string;
  full_name: string;
  specialization: string;
  qualification: string;
  consultation_fee: number;
  department_id: string;
  department_name?: string;
}

export default function BookAppointmentPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const [formData, setFormData] = useState({
    department_id: "",
    doctor_id: "",
    appointment_date: "",
    appointment_time: "",
    symptoms: "",
    notes: "",
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (formData.department_id) {
      fetchDoctors(formData.department_id);
    } else {
      setFilteredDoctors([]);
      setSelectedDoctor(null);
    }
  }, [formData.department_id]);

  useEffect(() => {
    if (formData.doctor_id) {
      const doctor = filteredDoctors.find((d) => d.id === formData.doctor_id);
      setSelectedDoctor(doctor || null);
    } else {
      setSelectedDoctor(null);
    }
  }, [formData.doctor_id, filteredDoctors]);

  async function fetchDepartments() {
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name");

      if (error) throw error;
      console.log("Departments fetched:", data);
      setDepartments(data || []);
    } catch (error: any) {
      toast.error("Failed to load departments");
      console.error("Error fetching departments:", error);
    }
  }

  async function fetchDoctors(departmentId: string) {
    try {
      setLoadingDoctors(true);
      console.log("Fetching doctors for department:", departmentId);

      // First, get the doctors in this department
      const { data: doctorsData, error: doctorsError } = await supabase
        .from("doctors")
        .select("*")
        .eq("department_id", departmentId)
        .eq("is_active", true);

      if (doctorsError) {
        console.error("Doctors fetch error:", doctorsError);
        throw doctorsError;
      }

      console.log("Doctors found:", doctorsData);

      if (!doctorsData || doctorsData.length === 0) {
        setFilteredDoctors([]);
        setLoadingDoctors(false);
        return;
      }

      // Get the doctor IDs
      const doctorIds = doctorsData.map((d) => d.id);
      console.log("Doctor IDs:", doctorIds);

      // Fetch the profiles for these doctors
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", doctorIds);

      if (profilesError) {
        console.error("Profiles fetch error:", profilesError);
        throw profilesError;
      }

      console.log("Profiles found:", profilesData);

      // Get department name
      const { data: deptData } = await supabase
        .from("departments")
        .select("name")
        .eq("id", departmentId)
        .single();

      // Combine the data
      const doctorsWithNames = doctorsData.map((doc: any) => {
        const profile = profilesData?.find((p: any) => p.id === doc.id);
        return {
          ...doc,
          full_name: profile?.full_name || "Unknown Doctor",
          department_name: deptData?.name || "Unknown Department",
        };
      });

      console.log("Combined doctors:", doctorsWithNames);
      setFilteredDoctors(doctorsWithNames);
    } catch (error: any) {
      toast.error("Failed to load doctors: " + error.message);
      console.error("Error fetching doctors:", error);
    } finally {
      setLoadingDoctors(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login first");
        return;
      }

      // Check if patient exists
      let { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!patientData) {
        const { data: newPatient, error: createError } = await supabase
          .from("patients")
          .insert({ id: user.id })
          .select("id")
          .single();

        if (createError) throw createError;
        patientData = newPatient;
      }

      // Create appointment
      const { error } = await supabase.from("appointments").insert({
        patient_id: patientData?.id,
        doctor_id: formData.doctor_id,
        department_id: formData.department_id,
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time,
        symptoms: formData.symptoms,
        notes: formData.notes,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Appointment booked successfully!");
      router.push("/dashboard/appointments");
    } catch (error: any) {
      console.error("Booking error:", error);
      toast.error(error.message || "Failed to book appointment");
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
            Book an Appointment
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Fill in the details below to schedule your visit
          </p>
        </div>
      </div>

      <Card className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Department Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Building2 className="w-4 h-4 inline mr-2" />
              Department
            </label>
            <select
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              value={formData.department_id}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  department_id: e.target.value,
                  doctor_id: "",
                })
              }
              required
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {formData.department_id && (
              <p className="text-xs text-gray-400 mt-1">
                {departments.find((d) => d.id === formData.department_id)
                  ?.description || ""}
              </p>
            )}
            {departments.length === 0 && (
              <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                No departments found. Please contact admin.
              </p>
            )}
          </div>

          {/* Doctor Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Stethoscope className="w-4 h-4 inline mr-2" />
              Doctor
            </label>
            <select
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              value={formData.doctor_id}
              onChange={(e) =>
                setFormData({ ...formData, doctor_id: e.target.value })
              }
              required
              disabled={!formData.department_id || loadingDoctors}
            >
              <option value="">
                {loadingDoctors
                  ? "Loading doctors..."
                  : !formData.department_id
                    ? "Select a department first"
                    : "Select Doctor"}
              </option>
              {filteredDoctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  Dr. {doctor.full_name} - {doctor.specialization}
                  {doctor.consultation_fee > 0 &&
                    ` ($${doctor.consultation_fee})`}
                </option>
              ))}
            </select>
            {formData.department_id &&
              filteredDoctors.length === 0 &&
              !loadingDoctors && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  No doctors available in this department
                </p>
              )}
          </div>

          {/* Selected Doctor Details */}
          {selectedDoctor && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-semibold">
                    {selectedDoctor.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Dr. {selectedDoctor.full_name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedDoctor.specialization}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 ml-auto">
                  {selectedDoctor.qualification && (
                    <Badge
                      variant="secondary"
                      className="bg-white dark:bg-slate-800"
                    >
                      <Award className="w-3 h-3 mr-1" />
                      {selectedDoctor.qualification}
                    </Badge>
                  )}
                  {selectedDoctor.consultation_fee > 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-white dark:bg-slate-800"
                    >
                      <DollarSign className="w-3 h-3 mr-1" />$
                      {selectedDoctor.consultation_fee}
                    </Badge>
                  )}
                  {selectedDoctor.department_name && (
                    <Badge
                      variant="secondary"
                      className="bg-white dark:bg-slate-800"
                    >
                      <Building2 className="w-3 h-3 mr-1" />
                      {selectedDoctor.department_name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Date
              </label>
              <Input
                type="date"
                min={today}
                value={formData.appointment_date}
                onChange={(e) =>
                  setFormData({ ...formData, appointment_date: e.target.value })
                }
                required
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Clock className="w-4 h-4 inline mr-2" />
                Time
              </label>
              <Input
                type="time"
                value={formData.appointment_time}
                onChange={(e) =>
                  setFormData({ ...formData, appointment_time: e.target.value })
                }
                required
                className="w-full"
              />
            </div>
          </div>

          {/* Symptoms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FileText className="w-4 h-4 inline mr-2" />
              Symptoms
            </label>
            <textarea
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-none"
              rows={3}
              value={formData.symptoms}
              onChange={(e) =>
                setFormData({ ...formData, symptoms: e.target.value })
              }
              placeholder="Describe your symptoms in detail..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional Notes
            </label>
            <textarea
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-none"
              rows={2}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Any additional information for the doctor..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all py-2.5"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Book Appointment
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>

          {/* Info Note */}
          <p className="text-xs text-gray-400 text-center">
            <AlertCircle className="w-3 h-3 inline mr-1" />
            Your appointment request will be reviewed by the doctor. You'll
            receive a confirmation once approved.
          </p>
        </form>
      </Card>
    </div>
  );
}
