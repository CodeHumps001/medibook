"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import toast from "react-hot-toast";
import {
  HeartPulse,
  User,
  Mail,
  Lock,
  ArrowRight,
  Shield,
  Users,
  Stethoscope,
  Calendar,
  CheckCircle,
  UserPlus,
  Sparkles,
  Building2,
  Award,
  DollarSign,
} from "lucide-react";

// Define a simpler type for departments used in registration
interface SimpleDepartment {
  id: string;
  name: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "patient",
  });
  const supabase = createClient();

  const [departments, setDepartments] = useState<SimpleDepartment[]>([]);
  const [doctorData, setDoctorData] = useState({
    department_id: "",
    specialization: "",
    qualification: "",
    consultation_fee: "",
  });

  // Fetch departments on mount
  useEffect(() => {
    fetchDepartments();
  }, []);

  async function fetchDepartments() {
    try {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .order("name");
      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      console.log("Registering with role:", formData.role);

      // Build metadata based on role
      const metadata: any = {
        full_name: formData.full_name,
        role: formData.role,
      };

      // If doctor, add doctor-specific data
      if (formData.role === "doctor") {
        metadata.specialization = doctorData.specialization;
        metadata.qualification = doctorData.qualification;
        metadata.consultation_fee = doctorData.consultation_fee;
        metadata.department_id = doctorData.department_id;
      }

      // Create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: metadata,
        },
      });

      if (authError) {
        if (authError.message.includes("User already registered")) {
          toast.error(
            "This email is already registered. Please login instead.",
          );
        } else {
          throw authError;
        }
        return;
      }

      // Wait a moment for the trigger to create the profile
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // If doctor, also create the doctor record manually if trigger didn't work
      if (authData.user && formData.role === "doctor") {
        try {
          const { error: doctorInsertError } = await supabase
            .from("doctors")
            .insert({
              id: authData.user.id,
              specialization: doctorData.specialization,
              qualification: doctorData.qualification,
              consultation_fee: parseFloat(doctorData.consultation_fee) || 0,
              department_id: doctorData.department_id || null,
              is_active: true,
            });

          if (doctorInsertError) {
            console.log(
              "Doctor insert error (non-critical):",
              doctorInsertError,
            );
          }
        } catch (err) {
          console.log("Doctor insert skipped, trigger may have handled it");
        }
      }

      // If patient, create patient record
      if (authData.user && formData.role === "patient") {
        try {
          const { error: patientInsertError } = await supabase
            .from("patients")
            .insert({
              id: authData.user.id,
            });

          if (patientInsertError) {
            console.log(
              "Patient insert error (non-critical):",
              patientInsertError,
            );
          }
        } catch (err) {
          console.log("Patient insert skipped, trigger may have handled it");
        }
      }

      // Check if email confirmation is required
      if (authData.user?.email_confirmed_at) {
        toast.success(
          `Registration successful! Welcome ${formData.full_name}!`,
        );
        if (formData.role === "doctor") {
          router.push("/doctor");
        } else {
          router.push("/dashboard");
        }
        router.refresh();
      } else {
        toast.success(
          "Registration successful! Please check your email to verify your account.",
        );
        router.push("/login");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Shield, text: "HIPAA Compliant" },
    { icon: Users, text: "Trusted by 50K+ Patients" },
    { icon: Stethoscope, text: "200+ Expert Doctors" },
    { icon: Calendar, text: "Easy Appointment Booking" },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image Grid */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-700 p-8 flex-col justify-between">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <HeartPulse className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">
              Medi<span className="text-emerald-200">Book</span>
            </span>
          </div>
        </div>

        {/* Image Grid */}
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/10">
                <div className="text-4xl mb-2">🏥</div>
                <p className="text-white font-medium text-sm">
                  Modern Healthcare
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/10">
                <div className="text-4xl mb-2">👨‍⚕️</div>
                <p className="text-white font-medium text-sm">Expert Doctors</p>
              </div>
            </div>
            <div className="space-y-4 mt-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/10">
                <div className="text-4xl mb-2">💊</div>
                <p className="text-white font-medium text-sm">Quality Care</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/10">
                <div className="text-4xl mb-2">📅</div>
                <p className="text-white font-medium text-sm">Easy Booking</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features List */}
        <div className="relative z-10 grid grid-cols-2 gap-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="flex items-center space-x-2 text-white/90"
              >
                <Icon className="w-4 h-4 text-emerald-200" />
                <span className="text-sm">{feature.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-white dark:bg-slate-900">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <HeartPulse className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                Medi<span className="text-emerald-600">Book</span>
              </span>
            </div>
          </div>

          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium mb-3">
              <Sparkles className="w-3 h-3 mr-1" />
              Join 50,000+ patients
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Create Your Account
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Start your healthcare journey today
            </p>
          </div>

          {/* Form */}
          <Card className="p-6 sm:p-8 border-0 shadow-lg dark:shadow-slate-800/10">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    <User className="w-4 h-4 inline mr-1.5" />
                    Full Name
                  </label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    required
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    <Mail className="w-4 h-4 inline mr-1.5" />
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    <Lock className="w-4 h-4 inline mr-1.5" />
                    Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Min 6 characters"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    minLength={6}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    <Lock className="w-4 h-4 inline mr-1.5" />
                    Confirm Password
                  </label>
                  <Input
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    required
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    I am a
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.role === "patient"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                          : "border-gray-200 dark:border-slate-700 hover:border-emerald-300"
                      }`}
                    >
                      <input
                        type="radio"
                        value="patient"
                        checked={formData.role === "patient"}
                        onChange={(e) =>
                          setFormData({ ...formData, role: e.target.value })
                        }
                        className="sr-only"
                      />
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">Patient</span>
                    </label>
                    <label
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.role === "doctor"
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                          : "border-gray-200 dark:border-slate-700 hover:border-emerald-300"
                      }`}
                    >
                      <input
                        type="radio"
                        value="doctor"
                        checked={formData.role === "doctor"}
                        onChange={(e) =>
                          setFormData({ ...formData, role: e.target.value })
                        }
                        className="sr-only"
                      />
                      <Stethoscope className="w-4 h-4" />
                      <span className="text-sm font-medium">Doctor</span>
                    </label>
                  </div>
                </div>

                {/* Doctor-specific fields */}
                {formData.role === "doctor" && (
                  <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-slate-700">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        <Building2 className="w-4 h-4 inline mr-1.5" />
                        Department
                      </label>
                      <select
                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                        value={doctorData.department_id}
                        onChange={(e) =>
                          setDoctorData({
                            ...doctorData,
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
                      {departments.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          No departments available. Please contact admin.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        <Stethoscope className="w-4 h-4 inline mr-1.5" />
                        Specialization
                      </label>
                      <Input
                        placeholder="e.g., Cardiologist"
                        value={doctorData.specialization}
                        onChange={(e) =>
                          setDoctorData({
                            ...doctorData,
                            specialization: e.target.value,
                          })
                        }
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
                        placeholder="e.g., MD, PhD"
                        value={doctorData.qualification}
                        onChange={(e) =>
                          setDoctorData({
                            ...doctorData,
                            qualification: e.target.value,
                          })
                        }
                        required
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        <DollarSign className="w-4 h-4 inline mr-1.5" />
                        Consultation Fee ($)
                      </label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={doctorData.consultation_fee}
                        onChange={(e) =>
                          setDoctorData({
                            ...doctorData,
                            consultation_fee: e.target.value,
                          })
                        }
                        required
                        min="0"
                        step="0.01"
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all py-2.5"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Create Account
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400">
                  Already have an account?
                </span>
              </div>
            </div>

            {/* Login Link */}
            <Link href="/login">
              <Button
                variant="outline"
                className="w-full border-gray-300 dark:border-slate-600 hover:border-emerald-500 hover:text-emerald-600 dark:hover:border-emerald-400 dark:hover:text-emerald-400"
              >
                Sign In
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </Card>

          {/* Trust Badge */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                Secure
              </span>
              <span className="w-px h-4 bg-gray-300 dark:bg-slate-700"></span>
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                HIPAA Compliant
              </span>
              <span className="w-px h-4 bg-gray-300 dark:bg-slate-700"></span>
              <span className="flex items-center gap-1">24/7 Support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
