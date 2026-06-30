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
  Stethoscope,
  Trash2,
  Eye,
  ToggleLeft,
  ToggleRight,
  Users,
  X,
  Mail,
  Phone,
  Calendar as CalendarIcon,
  DollarSign,
  Award,
  Building2,
  User,
  Clock,
  RefreshCw,
} from "lucide-react";
import { useAutoRefresh } from "@/lib/hooks/useAutoRefresh";

interface Doctor {
  id: string;
  full_name: string;
  email: string;
  specialization: string;
  department: string;
  is_active: boolean;
  consultation_fee: number;
  appointment_count: number;
}

function AdminDoctorsContent() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    full_name: "",
    email: "",
    password: "",
    specialization: "",
    department_id: "",
    qualification: "",
    consultation_fee: "",
  });

  // Auto-refresh every 30 seconds
  const { refresh: autoRefresh } = useAutoRefresh({
    interval: 30000,
    enabled: true,
    onRefresh: async () => {
      console.log("Auto-refreshing doctors...");
      await fetchDoctors(true);
    },
  });

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchDoctors(false);
    toast.success("Doctors refreshed");
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchDoctors();
    fetchDepartments();

    // Real-time subscription for doctors
    const channel = supabase
      .channel("admin-doctors-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "doctors",
        },
        (payload) => {
          console.log("Doctor changed (realtime):", payload);
          fetchDoctors(true);
        },
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchDepartments() {
    const { data } = await supabase.from("departments").select("*");
    setDepartments(data || []);
  }

  async function fetchDoctors(silent = false) {
    try {
      if (!silent) setLoading(true);

      const { data, error } = await supabase
        .from("doctors")
        .select(
          `
          id,
          specialization,
          qualification,
          consultation_fee,
          is_active,
          profiles (
            full_name,
            email
          ),
          departments (
            name
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const doctorsWithCounts = await Promise.all(
        (data || []).map(async (doc: any) => {
          const { count } = await supabase
            .from("appointments")
            .select("*", { count: "exact", head: true })
            .eq("doctor_id", doc.id);

          return {
            id: doc.id,
            full_name: doc.profiles?.full_name || "Unknown",
            email: doc.profiles?.email || "",
            specialization: doc.specialization || "General",
            department: doc.departments?.name || "Unassigned",
            is_active: doc.is_active,
            consultation_fee: doc.consultation_fee || 0,
            appointment_count: count || 0,
          };
        }),
      );

      setDoctors(doctorsWithCounts);
    } catch (error: any) {
      if (!silent) toast.error("Failed to load doctors");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleDoctorStatus(id: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from("doctors")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Doctor ${!currentStatus ? "activated" : "deactivated"}`);
      await fetchDoctors(true);
    } catch (error: any) {
      toast.error("Failed to update status");
      console.error(error);
    }
  }

  async function deleteDoctor(id: string) {
    try {
      await supabase.from("appointments").delete().eq("doctor_id", id);
      await supabase.from("doctors").delete().eq("id", id);
      await supabase.from("profiles").delete().eq("id", id);

      toast.success("Doctor deleted successfully");
      setShowDeleteModal(null);
      await fetchDoctors(true);
    } catch (error: any) {
      toast.error("Failed to delete doctor");
      console.error(error);
    }
  }

  async function addDoctor(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newDoctor.email,
        password: newDoctor.password,
        options: {
          data: {
            full_name: newDoctor.full_name,
            role: "doctor",
            specialization: newDoctor.specialization,
            qualification: newDoctor.qualification,
            department_id: newDoctor.department_id,
            consultation_fee: newDoctor.consultation_fee,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: doctorError } = await supabase.from("doctors").insert({
          id: authData.user.id,
          specialization: newDoctor.specialization,
          qualification: newDoctor.qualification,
          department_id: newDoctor.department_id,
          consultation_fee: parseFloat(newDoctor.consultation_fee) || 0,
          is_active: true,
        });

        if (doctorError) throw doctorError;

        toast.success("Doctor added successfully!");
        setShowAddModal(false);
        setNewDoctor({
          full_name: "",
          email: "",
          password: "",
          specialization: "",
          department_id: "",
          qualification: "",
          consultation_fee: "",
        });
        await fetchDoctors(true);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to add doctor");
      console.error(error);
    }
  }

  const filteredDoctors = doctors.filter(
    (d) =>
      d.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.department.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading && !isRefreshing) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Loading doctors...</p>
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
            Doctors
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage all registered doctors in the system
            {isRefreshing && (
              <span className="text-emerald-500 ml-2">(Refreshing...)</span>
            )}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search doctors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full sm:w-48 md:w-64"
            />
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
          >
            <Stethoscope className="w-4 h-4 mr-2" />
            Add Doctor
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500">Total Doctors</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {doctors.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Active</p>
          <p className="text-xl font-bold text-emerald-600">
            {doctors.filter((d) => d.is_active).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Inactive</p>
          <p className="text-xl font-bold text-rose-600">
            {doctors.filter((d) => !d.is_active).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Total Appointments</p>
          <p className="text-xl font-bold text-blue-600">
            {doctors.reduce((acc, d) => acc + d.appointment_count, 0)}
          </p>
        </Card>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="text-left py-3 px-3 sm:px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Doctor
                </th>
                <th className="text-left py-3 px-3 sm:px-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Specialty
                </th>
                <th className="text-left py-3 px-3 sm:px-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Department
                </th>
                <th className="text-left py-3 px-3 sm:px-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Fee
                </th>
                <th className="text-left py-3 px-3 sm:px-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                  Appointments
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
              {filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No doctors found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {searchTerm
                        ? "Try adjusting your search"
                        : "Add your first doctor to get started"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doctor) => (
                  <tr
                    key={doctor.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-semibold text-sm flex-shrink-0">
                          {doctor.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {doctor.full_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">
                            {doctor.specialization}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 sm:px-4 hidden sm:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {doctor.specialization}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 hidden md:table-cell">
                      <Badge
                        variant="secondary"
                        className="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                      >
                        {doctor.department}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 sm:px-4 hidden lg:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        ${doctor.consultation_fee}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 hidden xl:table-cell">
                      <Badge
                        variant="secondary"
                        className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        {doctor.appointment_count} appointments
                      </Badge>
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      <Badge
                        className={
                          doctor.is_active
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                        }
                      >
                        {doctor.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() =>
                            toggleDoctorStatus(doctor.id, doctor.is_active)
                          }
                          title={doctor.is_active ? "Deactivate" : "Activate"}
                        >
                          {doctor.is_active ? (
                            <ToggleRight className="w-4 h-4 text-emerald-600 hover:text-emerald-700" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedDoctor(doctor);
                            setShowViewModal(true);
                          }}
                        >
                          <Eye className="w-4 h-4 text-gray-400 hover:text-emerald-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setShowDeleteModal(doctor.id)}
                        >
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-rose-600" />
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

      {/* Add Doctor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Add New Doctor
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={addDoctor}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name
                    </label>
                    <Input
                      placeholder="Enter full name"
                      value={newDoctor.full_name}
                      onChange={(e) =>
                        setNewDoctor({
                          ...newDoctor,
                          full_name: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      value={newDoctor.email}
                      onChange={(e) =>
                        setNewDoctor({ ...newDoctor, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Temporary Password
                    </label>
                    <Input
                      type="password"
                      placeholder="Min 6 characters"
                      value={newDoctor.password}
                      onChange={(e) =>
                        setNewDoctor({ ...newDoctor, password: e.target.value })
                      }
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Specialization
                    </label>
                    <Input
                      placeholder="e.g., Cardiologist"
                      value={newDoctor.specialization}
                      onChange={(e) =>
                        setNewDoctor({
                          ...newDoctor,
                          specialization: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Qualification
                    </label>
                    <Input
                      placeholder="e.g., MD, PhD"
                      value={newDoctor.qualification}
                      onChange={(e) =>
                        setNewDoctor({
                          ...newDoctor,
                          qualification: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Department
                    </label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 dark:border-slate-700"
                      value={newDoctor.department_id}
                      onChange={(e) =>
                        setNewDoctor({
                          ...newDoctor,
                          department_id: e.target.value,
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
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Consultation Fee ($)
                    </label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={newDoctor.consultation_fee}
                      onChange={(e) =>
                        setNewDoctor({
                          ...newDoctor,
                          consultation_fee: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                  >
                    Add Doctor
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Doctor Modal */}
      {showViewModal && selectedDoctor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Doctor Details
                </h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-2xl">
                    {selectedDoctor.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedDoctor.full_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedDoctor.specialization}
                    </p>
                    <Badge
                      className={
                        selectedDoctor.is_active
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 mt-1"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 mt-1"
                      }
                    >
                      {selectedDoctor.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {selectedDoctor.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {selectedDoctor.department}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      ${selectedDoctor.consultation_fee} per consultation
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {selectedDoctor.appointment_count} total appointments
                    </span>
                  </div>
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-rose-600 dark:text-rose-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Delete Doctor
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete this doctor? This action
                  cannot be undone. All appointments associated with this doctor
                  will also be deleted.
                </p>
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() =>
                      showDeleteModal && deleteDoctor(showDeleteModal)
                    }
                  >
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowDeleteModal(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Main export with Suspense
export default function AdminDoctors() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[60vh]">
          <div className="relative text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500">Loading doctors...</p>
          </div>
        </div>
      }
    >
      <AdminDoctorsContent />
    </Suspense>
  );
}
