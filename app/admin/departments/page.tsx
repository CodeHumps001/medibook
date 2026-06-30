"use client";

import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import {
  Building2,
  Plus,
  Trash2,
  Edit,
  X,
  Hospital,
  Users,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { useAutoRefresh } from "@/lib/hooks/useAutoRefresh";

interface Department {
  id: string;
  name: string;
  description: string;
  doctor_count: number;
}

function AdminDepartmentsContent() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  // Auto-refresh every 30 seconds
  const { refresh: autoRefresh } = useAutoRefresh({
    interval: 30000,
    enabled: true,
    onRefresh: async () => {
      console.log("Auto-refreshing departments...");
      await fetchDepartments(true);
    },
  });

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchDepartments(false);
    toast.success("Departments refreshed");
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchDepartments();

    // Real-time subscription for departments
    const channel = supabase
      .channel("admin-departments-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "departments",
        },
        (payload) => {
          console.log("Department changed (realtime):", payload);
          fetchDepartments(true);
        },
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchDepartments(silent = false) {
    try {
      if (!silent) setLoading(true);

      const { data, error } = await supabase
        .from("departments")
        .select(
          `
          id,
          name,
          description
        `,
        )
        .order("name");

      if (error) throw error;

      const departmentsWithCounts = await Promise.all(
        (data || []).map(async (dept) => {
          const { count } = await supabase
            .from("doctors")
            .select("*", { count: "exact", head: true })
            .eq("department_id", dept.id);

          return {
            ...dept,
            doctor_count: count || 0,
          };
        }),
      );

      setDepartments(departmentsWithCounts);
    } catch (error: any) {
      if (!silent) toast.error("Failed to load departments");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        const { error } = await supabase
          .from("departments")
          .update({
            name: formData.name,
            description: formData.description,
          })
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Department updated successfully!");
      } else {
        const { error } = await supabase.from("departments").insert({
          name: formData.name,
          description: formData.description,
        });

        if (error) throw error;
        toast.success("Department added successfully!");
      }

      setShowAddModal(false);
      setEditingId(null);
      setFormData({ name: "", description: "" });
      await fetchDepartments(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to save department");
      console.error(error);
    }
  }

  async function deleteDepartment(id: string) {
    try {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Department deleted successfully");
      setShowDeleteModal(null);
      await fetchDepartments(true);
    } catch (error: any) {
      toast.error("Failed to delete department");
      console.error(error);
    }
  }

  // Calculate stats
  const totalDoctors = departments.reduce(
    (acc, dept) => acc + dept.doctor_count,
    0,
  );
  const departmentsWithDoctors = departments.filter(
    (d) => d.doctor_count > 0,
  ).length;

  if (loading && !isRefreshing) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Loading departments...</p>
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
            Departments
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage all medical departments in the system
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
          <Button
            onClick={() => {
              setEditingId(null);
              setFormData({ name: "", description: "" });
              setShowAddModal(true);
            }}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Department
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500">Total Departments</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">
            {departments.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Active Departments</p>
          <p className="text-xl font-bold text-emerald-600">
            {departmentsWithDoctors}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Total Doctors</p>
          <p className="text-xl font-bold text-blue-600">{totalDoctors}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Avg. Doctors per Dept</p>
          <p className="text-xl font-bold text-purple-600">
            {departments.length > 0
              ? Math.round(totalDoctors / departments.length)
              : 0}
          </p>
        </Card>
      </div>

      {/* Department Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {departments.length === 0 ? (
          <Card className="p-12 text-center col-span-full">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No departments found</p>
            <p className="text-sm text-gray-400 mt-1">
              Add your first department to get started
            </p>
          </Card>
        ) : (
          departments.map((dept) => (
            <Card
              key={dept.id}
              className="p-6 hover:shadow-lg transition-all duration-300 group border border-gray-100 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500 transition">
                    <Building2 className="w-6 h-6 text-emerald-600 group-hover:text-white transition" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {dept.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {dept.description || "No description"}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge
                        variant="secondary"
                        className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        <Users className="w-3 h-3 mr-1" />
                        {dept.doctor_count} doctors
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 ml-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => {
                      setEditingId(dept.id);
                      setFormData({
                        name: dept.name,
                        description: dept.description || "",
                      });
                      setShowAddModal(true);
                    }}
                  >
                    <Edit className="w-4 h-4 text-gray-400 hover:text-emerald-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setShowDeleteModal(dept.id)}
                  >
                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-rose-600" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Department Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingId ? "Edit Department" : "Add Department"}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingId(null);
                    setFormData({ name: "", description: "" });
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Department Name
                    </label>
                    <Input
                      placeholder="e.g., Cardiology"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-slate-900 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      rows={3}
                      placeholder="Describe the department..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                  >
                    {editingId ? "Update" : "Add"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingId(null);
                      setFormData({ name: "", description: "" });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
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
                  Delete Department
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete this department? This action
                  cannot be undone. All doctors associated with this department
                  will need to be reassigned.
                </p>
                <div className="flex gap-3 mt-6">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() =>
                      showDeleteModal && deleteDepartment(showDeleteModal)
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
export default function AdminDepartments() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[60vh]">
          <div className="relative text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500">Loading departments...</p>
          </div>
        </div>
      }
    >
      <AdminDepartmentsContent />
    </Suspense>
  );
}
