"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import toast from "react-hot-toast";
import {
  HeartPulse,
  Mail,
  Lock,
  ArrowRight,
  Shield,
  Users,
  Stethoscope,
  Calendar,
  CheckCircle,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // After successful login, fetch the user's role
      if (data.user) {
        // Wait a moment for the trigger to complete
        await new Promise((resolve) => setTimeout(resolve, 500));

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle(); // Use maybeSingle to avoid errors

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          // If profile doesn't exist, redirect to dashboard as patient
          router.push("/dashboard");
          router.refresh();
          return;
        }

        console.log("User role:", profile?.role);

        // Redirect based on role
        if (profile?.role === "doctor") {
          toast.success(`Welcome Dr. ${email}!`);
          router.push("/doctor");
        } else if (profile?.role === "admin") {
          toast.success("Welcome Admin!");
          router.push("/admin");
        } else {
          toast.success("Login successful!");
          router.push("/dashboard");
        }
        router.refresh();
      }
    } catch (error: any) {
      toast.error(error.message || "Login failed. Please try again.");
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

      {/* Right Side - Login Form */}
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
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Welcome Back
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Sign in to continue your healthcare journey
            </p>
          </div>

          {/* Form */}
          <Card className="p-6 sm:p-8 border-0 shadow-lg dark:shadow-slate-800/10">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    <Mail className="w-4 h-4 inline mr-1.5" />
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Remember me</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-emerald-600 hover:text-emerald-700 font-medium"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all py-2.5"
              >
                Sign In
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400">
                  New to MediBook?
                </span>
              </div>
            </div>

            {/* Register Link */}
            <Link href="/register">
              <Button
                variant="outline"
                className="w-full border-gray-300 dark:border-slate-600 hover:border-emerald-500 hover:text-emerald-600 dark:hover:border-emerald-400 dark:hover:text-emerald-400"
              >
                Create an Account
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
