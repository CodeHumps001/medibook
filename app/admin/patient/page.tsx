"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import {
  Search,
  UserPlus,
  Trash2,
  Eye,
  Users,
  X,
  Mail,
  Phone,
  Calendar as CalendarIcon,
  User,
  Clock,
} from "lucide-react";

interface Patient {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  appointment_count: number;
}

export default function AdminPatients() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  async function fetchPatients() {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select(
          `
          id,
          profiles (
            full_name,
            email,
            phone,
            created_at
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const patientsWithCounts = await Promise.all(
        (data || []).map(async (patient: any) => {
          const { count } = await supabase
            .from("appointments")
            .select("*", { count: "exact", head: true })
            .eq("patient_id", patient.id);

          return {
            id: patient.id,
            full_name: patient.profiles?.full_name || "Unknown",
            email: patient.profiles?.email || "",
            phone: patient.profiles?.phone || "",
            created_at: patient.profiles?.created_at || "",
            appointment_count: count || 0,
          };
        }),
      );

      setPatients(patientsWithCounts);
    } catch (error: any) {
      toast.error("Failed to load patients");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function deletePatient(id: string) {
    try {
      await supabase.from("appointments").delete().eq("patient_id", id);
      await supabase.from("patients").delete().eq("id", id);
      await supabase.from("profiles").delete().eq("id", id);

      toast.success("Patient deleted successfully");
      setShowDeleteModal(null);
      fetchPatients();
    } catch (error: any) {
      toast.error("Failed to delete patient");
      console.error(error);
    }
  }

  const filteredPatients = patients.filter(
    (p) =>
      p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone?.includes(searchTerm),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Loading patients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            Patients
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage all registered patients in the system
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full sm:w-48 md:w-64"
            />
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Patient
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500">Total Patients</p>
          <p className="text-xl font-bold text-gray-900">{patients.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Active</p>
          <p className="text-xl font-bold text-emerald-600">
            {patients.filter((p) => p.appointment_count > 0).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Total Appointments</p>
          <p className="text-xl font-bold text-blue-600">
            {patients.reduce((acc, p) => acc + p.appointment_count, 0)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">New This Month</p>
          <p className="text-xl font-bold text-purple-600">
            {
              patients.filter((p) => {
                const date = new Date(p.created_at);
                const now = new Date();
                return (
                  date.getMonth() === now.getMonth() &&
                  date.getFullYear() === now.getFullYear()
                );
              }).length
            }
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
                  Patient
                </th>
                <th className="text-left py-3 px-3 sm:px-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Contact
                </th>
                <th className="text-left py-3 px-3 sm:px-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Appointments
                </th>
                <th className="text-left py-3 px-3 sm:px-4 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                  Joined
                </th>
                <th className="text-right py-3 px-3 sm:px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No patients found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {searchTerm
                        ? "Try adjusting your search"
                        : "Add your first patient to get started"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <td className="py-3 px-3 sm:px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-semibold text-sm flex-shrink-0">
                          {patient.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {patient.full_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">
                            {patient.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 sm:px-4 hidden sm:table-cell">
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {patient.email}
                      </p>
                      <p className="text-xs text-gray-400">
                        {patient.phone || "No phone"}
                      </p>
                    </td>
                    <td className="py-3 px-3 sm:px-4 hidden md:table-cell">
                      <Badge
                        variant="secondary"
                        className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        {patient.appointment_count} appointments
                      </Badge>
                    </td>
                    <td className="py-3 px-3 sm:px-4 hidden lg:table-cell">
                      <span className="text-sm text-gray-500">
                        {new Date(patient.created_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setShowViewModal(true);
                          }}
                        >
                          <Eye className="w-4 h-4 text-gray-400 hover:text-emerald-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setShowDeleteModal(patient.id)}
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

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Add New Patient
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const formData = new FormData(form);

                  try {
                    const { data, error } = await supabase.auth.signUp({
                      email: formData.get("email") as string,
                      password: formData.get("password") as string,
                      options: {
                        data: {
                          full_name: formData.get("full_name") as string,
                          role: "patient",
                          phone: formData.get("phone") as string,
                        },
                      },
                    });

                    if (error) throw error;

                    toast.success("Patient added successfully!");
                    setShowAddModal(false);
                    fetchPatients();
                  } catch (error: any) {
                    toast.error(error.message || "Failed to add patient");
                  }
                }}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name
                    </label>
                    <Input
                      name="full_name"
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <Input
                      name="email"
                      type="email"
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone
                    </label>
                    <Input name="phone" placeholder="Enter phone number" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Temporary Password
                    </label>
                    <Input
                      name="password"
                      type="password"
                      placeholder="Min 6 characters"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                  >
                    Add Patient
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

      {/* View Patient Modal */}
      {showViewModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Patient Details
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
                    {selectedPatient.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedPatient.full_name}
                    </h3>
                    <p className="text-sm text-gray-500">Patient</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {selectedPatient.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {selectedPatient.phone || "No phone number"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Joined{" "}
                      {new Date(selectedPatient.created_at).toLocaleDateString(
                        "en-US",
                        {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {selectedPatient.appointment_count} total appointments
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
                  Delete Patient
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete this patient? This action
                  cannot be undone. All appointments associated with this
                  patient will also be deleted.
                </p>
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() =>
                      showDeleteModal && deletePatient(showDeleteModal)
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
