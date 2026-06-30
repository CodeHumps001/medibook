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

      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          router.push("/dashboard");
          return;
        }

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
      }

      router.refresh();
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

  const floatingImages = [
    {
      src: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200&h=200&fit=crop&crop=center",
      alt: "Doctor Consultation",
      className: "w-20 h-20 rounded-full shadow-xl",
      top: "10%",
      left: "5%",
      animation: "float-slow",
    },
    {
      src: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=200&h=200&fit=crop&crop=center",
      alt: "Modern Hospital",
      className: "w-32 h-32 rounded-2xl shadow-xl",
      top: "25%",
      right: "8%",
      animation: "float-medium",
    },
    {
      src: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&h=200&fit=crop&crop=center",
      alt: "Doctor with Patient",
      className: "w-24 h-24 rounded-full shadow-xl",
      bottom: "20%",
      left: "10%",
      animation: "float-fast",
    },
    {
      src: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=200&h=200&fit=crop&crop=center",
      alt: "Healthcare App",
      className: "w-28 h-28 rounded-2xl shadow-xl",
      bottom: "30%",
      right: "5%",
      animation: "float-slow",
    },
  ];

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-700 p-8 flex-col justify-between">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>

        <div className="absolute inset-0 overflow-hidden">
          {floatingImages.map((img, index) => (
            <div
              key={index}
              className={`absolute ${img.animation}`}
              style={{
                top: img.top,
                left: img.left,
                right: img.right,
                bottom: img.bottom,
              }}
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2 border border-white/20 shadow-2xl hover:scale-110 transition-transform duration-300 cursor-pointer">
                <Image
                  src={img.src}
                  alt={img.alt}
                  width={parseInt(img.className.match(/w-(\d+)/)?.[1] || "80")}
                  height={parseInt(img.className.match(/h-(\d+)/)?.[1] || "80")}
                  className={`${img.className} object-cover`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center overflow-hidden">
              <Image
                src="/logo.jpeg"
                alt="MediBook Logo"
                width={40}
                height={40}
                className="object-cover"
              />
            </div>
            <span className="text-2xl font-bold text-white">
              Medi<span className="text-emerald-200">Book</span>
            </span>
          </Link>
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Welcome Back</h2>
          <p className="text-emerald-100 text-lg max-w-sm">
            Sign in to continue your healthcare journey
          </p>
        </div>

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
          <div className="lg:hidden text-center">
            <Link
              href="/"
              className="flex items-center justify-center space-x-2 mb-4"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25 overflow-hidden">
                <Image
                  src="/logo.jpeg"
                  alt="MediBook Logo"
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                Medi<span className="text-emerald-600">Book</span>
              </span>
            </Link>
          </div>

          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Welcome Back
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Sign in to continue your healthcare journey
            </p>
          </div>

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
