"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import {
  User,
  Mail,
  Phone,
  Stethoscope,
  Award,
  DollarSign,
  FileText,
  Save,
  AlertCircle,
  CheckCircle,
  XCircle,
  Building2,
  Clock,
} from "lucide-react";

interface Department {
  id: string;
  name: string;
  description: string;
}

export default function DoctorProfile() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    specialization: "",
    qualification: "",
    consultation_fee: "",
    bio: "",
    department_id: "",
  });
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    fetchDepartments();
    fetchProfile();
  }, []);

  async function fetchDepartments() {
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .order("name");

      if (error) throw error;
      setDepartments(data || []);
    } catch (error: any) {
      console.error("Error fetching departments:", error);
      toast.error("Failed to load departments");
    }
  }

  async function fetchProfile() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login first");
        return;
      }

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        toast.error("Failed to load profile");
        return;
      }

      // Fetch doctor data
      const { data: doctorData, error: doctorError } = await supabase
        .from("doctors")
        .select("*")
        .eq("id", user.id)
        .single();

      if (doctorError) {
        console.error("Doctor fetch error:", doctorError);
        toast.error("Failed to load doctor profile");
        return;
      }

      setProfile({
        full_name: profileData?.full_name || "",
        email: profileData?.email || "",
        phone: profileData?.phone || "",
        specialization: doctorData?.specialization || "",
        qualification: doctorData?.qualification || "",
        consultation_fee: doctorData?.consultation_fee?.toString() || "",
        bio: doctorData?.bio || "",
        department_id: doctorData?.department_id || "",
      });
      setIsActive(doctorData?.is_active ?? true);
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast.error(error.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login first");
        setSaving(false);
        return;
      }

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
        })
        .eq("id", user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
        toast.error("Failed to update profile: " + profileError.message);
        setSaving(false);
        return;
      }

      // Update doctor
      const { error: doctorError } = await supabase
        .from("doctors")
        .update({
          specialization: profile.specialization,
          qualification: profile.qualification,
          consultation_fee: parseFloat(profile.consultation_fee) || 0,
          bio: profile.bio || null,
          department_id: profile.department_id || null,
        })
        .eq("id", user.id);

      if (doctorError) {
        console.error("Doctor update error:", doctorError);
        toast.error("Failed to update doctor profile: " + doctorError.message);
        setSaving(false);
        return;
      }

      toast.success("Profile updated successfully!");
      await fetchProfile(); // Refresh the data
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
            Doctor Profile
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage your professional information and availability
          </p>
        </div>
        <Badge
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm ${
            isActive
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
          }`}
        >
          {isActive ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Profile Card */}
      <Card className="p-4 sm:p-6">
        {/* Avatar Section */}
        <div className="flex items-center gap-4 pb-6 mb-6 border-b border-gray-200 dark:border-slate-700">
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-emerald-500/25">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {profile.full_name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {profile.specialization || "Specialization not set"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" />
              {profile.email}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <User className="w-4 h-4 inline mr-1.5" />
                Full Name
              </label>
              <Input
                value={profile.full_name}
                onChange={(e) =>
                  setProfile({ ...profile, full_name: e.target.value })
                }
                required
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <Mail className="w-4 h-4 inline mr-1.5" />
                Email
              </label>
              <Input
                value={profile.email}
                disabled
                className="bg-gray-100 dark:bg-slate-800 cursor-not-allowed w-full"
              />
              <p className="text-xs text-gray-400 mt-1">
                Email cannot be changed
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <Phone className="w-4 h-4 inline mr-1.5" />
              Phone
            </label>
            <Input
              value={profile.phone}
              onChange={(e) =>
                setProfile({ ...profile, phone: e.target.value })
              }
              placeholder="Enter phone number"
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <Stethoscope className="w-4 h-4 inline mr-1.5" />
                Specialization
              </label>
              <Input
                value={profile.specialization}
                onChange={(e) =>
                  setProfile({ ...profile, specialization: e.target.value })
                }
                placeholder="e.g., Cardiologist"
                required
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <Award className="w-4 h-4 inline mr-1.5" />
                Qualification
              </label>
              <Input
                value={profile.qualification}
                onChange={(e) =>
                  setProfile({ ...profile, qualification: e.target.value })
                }
                placeholder="e.g., MD, PhD"
                required
                className="w-full"
              />
            </div>
          </div>

          {/* Department Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <Building2 className="w-4 h-4 inline mr-1.5" />
              Department
            </label>
            <select
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              value={profile.department_id}
              onChange={(e) =>
                setProfile({ ...profile, department_id: e.target.value })
              }
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {profile.department_id && (
              <p className="text-xs text-gray-400 mt-1">
                {departments.find((d) => d.id === profile.department_id)
                  ?.description || ""}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <DollarSign className="w-4 h-4 inline mr-1.5" />
              Consultation Fee
            </label>
            <Input
              type="number"
              value={profile.consultation_fee}
              onChange={(e) =>
                setProfile({ ...profile, consultation_fee: e.target.value })
              }
              placeholder="0.00"
              required
              min="0"
              step="0.01"
              className="w-full sm:w-48"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <FileText className="w-4 h-4 inline mr-1.5" />
              Bio
            </label>
            <textarea
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition resize-none"
              rows={4}
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Tell patients about your experience, expertise, and approach to care..."
            />
            <p className="text-xs text-gray-400 mt-1">
              {profile.bio.length} characters
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <Button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all py-2.5"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => fetchProfile()}
              className="flex-1"
              disabled={saving}
            >
              Reset
            </Button>
          </div>
        </form>
      </Card>

      {/* Info Card */}
      <Card className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              Profile Tips
            </p>
            <ul className="text-sm text-emerald-700 dark:text-emerald-400 space-y-1 mt-1">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" />
                Keep your specialization and qualifications up to date
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" />
                Select your department so patients can find you easily
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" />
                Add a professional bio to help patients choose you
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
