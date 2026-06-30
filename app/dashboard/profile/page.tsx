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
  MapPin,
  AlertCircle,
  Save,
  CheckCircle,
  XCircle,
  Heart,
  UserCircle,
} from "lucide-react";

export default function ProfilePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    phone: "",
    address: "",
    emergency_contact: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          emergency_contact: data.emergency_contact || "",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
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
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
          emergency_contact: profile.emergency_contact,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully");
    } catch (error: any) {
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
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
            My Profile
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage your personal information and preferences
          </p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 inline-flex items-center gap-1.5">
          <UserCircle className="w-3.5 h-3.5" />
          Patient
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
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" />
              {profile.email}
            </p>
            {profile.phone && (
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                {profile.phone}
              </p>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
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
              placeholder="Enter your phone number"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <MapPin className="w-4 h-4 inline mr-1.5" />
              Address
            </label>
            <Input
              value={profile.address}
              onChange={(e) =>
                setProfile({ ...profile, address: e.target.value })
              }
              placeholder="Enter your address"
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <Heart className="w-4 h-4 inline mr-1.5" />
              Emergency Contact
            </label>
            <Input
              value={profile.emergency_contact}
              onChange={(e) =>
                setProfile({ ...profile, emergency_contact: e.target.value })
              }
              placeholder="Emergency contact number"
              className="w-full"
            />
            <p className="text-xs text-gray-400 mt-1">
              This number will be used in case of emergency
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all py-2.5"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => fetchProfile()}
              className="flex-1"
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
                Keep your contact information up to date
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" />
                Add an emergency contact for safety
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" />
                Your address helps with location-based services
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
