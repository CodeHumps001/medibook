"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Clock,
  Users,
  Stethoscope,
  Calendar,
  FileText,
  Heart,
  ChevronRight,
  Star,
  ArrowRight,
  Award,
  MessageCircle,
  Bell,
  HeartPulse,
  Search,
  Sparkles,
  Menu,
  X,
  Brain,
  Bone,
  Eye,
  MapPin,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Quote,
} from "lucide-react";
import Image from "next/image";

interface Department {
  id: string;
  name: string;
  description: string;
  doctor_count: number;
}

interface Doctor {
  id: string;
  full_name: string;
  specialization: string;
  qualification: string;
  consultation_fee: number;
  is_active: boolean;
  bio?: string;
  rating?: number;
  total_reviews?: number;
  department: {
    name: string;
  };
  profiles: {
    full_name: string;
  };
}

interface Review {
  id: string;
  rating: number;
  review: string;
  patient_name: string;
  created_at: string;
}

const FAQS = [
  {
    question: "How do I book an appointment?",
    answer:
      "Simply create an account, search for a doctor by specialty or department, select an available time slot, and confirm your booking. You'll receive a confirmation email immediately.",
  },
  {
    question: "Can I cancel or reschedule my appointment?",
    answer:
      "Yes, you can cancel or reschedule your appointment up to 24 hours before the scheduled time. Log in to your dashboard and navigate to 'My Appointments' to manage your bookings.",
  },
  {
    question: "How do I leave a review for my doctor?",
    answer:
      "After your appointment is completed, you'll find a 'Leave Review' button in your appointment history. You can rate your doctor from 1-5 stars and leave a detailed review.",
  },
  {
    question: "Is my personal information secure?",
    answer:
      "Absolutely! MediBook is fully HIPAA compliant and uses enterprise-grade encryption to protect all your personal and medical information.",
  },
  {
    question: "How do I become a doctor on MediBook?",
    answer:
      "If you're a licensed medical professional, you can register as a doctor during sign-up. You'll need to provide your specialization, qualifications, and consultation fee.",
  },
  {
    question: "What payment methods are accepted?",
    answer:
      "We accept all major credit cards, debit cards, and mobile money. Your payment will be processed securely at the time of booking.",
  },
];

export default function Home() {
  const supabase = createClient();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalDoctors: 0,
    totalAppointments: 0,
    satisfactionRate: 98,
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    fetchData();
    fetchReviews();

    // Set up real-time subscription for new reviews
    const channel = supabase
      .channel("reviews-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "appointments",
        },
        (payload) => {
          // Check if the updated record has a rating (meaning it's a review)
          if (
            payload.new?.rating !== null &&
            payload.new?.rating !== undefined
          ) {
            console.log("New review added:", payload);
            fetchReviews();
          }
        },
      )
      .subscribe((status) => {
        console.log("Realtime subscription status for reviews:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredDoctors(doctors.slice(0, 3));
    } else {
      const filtered = doctors.filter(
        (doctor) =>
          doctor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doctor.specialization
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          doctor.department?.name
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
      setFilteredDoctors(filtered.slice(0, 3));
    }
  }, [searchTerm, doctors]);

  async function fetchData() {
    try {
      setLoading(true);

      const { data: deptData } = await supabase.from("departments").select(`
          id,
          name,
          description
        `);

      const deptsWithCounts = await Promise.all(
        (deptData || []).map(async (dept) => {
          const { count } = await supabase
            .from("doctors")
            .select("*", { count: "exact", head: true })
            .eq("department_id", dept.id)
            .eq("is_active", true);
          return {
            ...dept,
            doctor_count: count || 0,
          };
        }),
      );
      setDepartments(deptsWithCounts);

      const { data: doctorData } = await supabase
        .from("doctors")
        .select(
          `
          id,
          specialization,
          qualification,
          consultation_fee,
          is_active,
          bio,
          rating,
          total_reviews,
          profiles (
            full_name
          ),
          departments (
            name
          )
        `,
        )
        .eq("is_active", true)
        .limit(6);

      const formattedDoctors = (doctorData || []).map((doc: any) => ({
        ...doc,
        full_name: doc.profiles?.full_name || "Unknown",
        department: doc.departments || { name: "General" },
      }));
      setDoctors(formattedDoctors);
      setFilteredDoctors(formattedDoctors.slice(0, 3));

      const { count: patients } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true });

      const { count: doctorsCount } = await supabase
        .from("doctors")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      const { count: appointments } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true });

      setStats({
        totalPatients: patients || 0,
        totalDoctors: doctorsCount || 0,
        totalAppointments: appointments || 0,
        satisfactionRate: 98,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchReviews() {
    try {
      console.log("Fetching reviews with simple query...");

      // Simple query without joins
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .not("rating", "is", null)
        .not("review", "is", null)
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) {
        console.error("Error fetching reviews:", error);
        return;
      }

      console.log("Reviews from simple query:", data);

      if (data && data.length > 0) {
        // Get patient names for each review
        const reviewsWithNames = await Promise.all(
          data.map(async (review: any) => {
            let patientName = "Anonymous Patient";
            if (review.patient_id) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", review.patient_id)
                .single();
              if (profile) {
                patientName = profile.full_name;
              }
            }
            return {
              id: review.id,
              rating: review.rating,
              review: review.review,
              patient_name: patientName,
              created_at: review.created_at,
            };
          }),
        );

        console.log("Reviews with names:", reviewsWithNames);
        setReviews(reviewsWithNames);
      } else {
        setReviews([]);
      }
    } catch (error) {
      console.error("Error in fetchReviews:", error);
      setReviews([]);
    }
  }

  // Alternative method using separate queries
  async function fetchReviewsAlternative() {
    try {
      // First, get appointments with reviews
      const { data: appointments, error: appError } = await supabase
        .from("appointments")
        .select("id, rating, review, patient_id, created_at")
        .not("rating", "is", null)
        .not("review", "is", null)
        .order("created_at", { ascending: false })
        .limit(6);

      if (appError || !appointments || appointments.length === 0) {
        console.log("No appointments with reviews");
        setReviews([]);
        return;
      }

      // Then, get patient names
      const patientIds = appointments.map((a) => a.patient_id).filter(Boolean);
      let patientMap: Record<string, string> = {};

      if (patientIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", patientIds);

        if (profiles) {
          profiles.forEach((p: any) => {
            patientMap[p.id] = p.full_name;
          });
        }
      }

      // Combine the data
      const formattedReviews = appointments.map((item: any) => ({
        id: item.id,
        rating: item.rating,
        review: item.review,
        patient_name: patientMap[item.patient_id] || "Anonymous Patient",
        created_at: item.created_at,
      }));

      console.log("Formatted reviews (alternative):", formattedReviews);
      setReviews(formattedReviews);
    } catch (error) {
      console.error("Error in alternative fetchReviews:", error);
      setReviews([]);
    }
  }

  const toggleDoctorExpand = (id: string) => {
    setExpandedDoctor(expandedDoctor === id ? null : id);
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const features = [
    {
      icon: Calendar,
      title: "Easy Booking",
      description:
        "Book appointments in under 2 minutes with our intuitive interface.",
      color: "emerald",
    },
    {
      icon: Clock,
      title: "Real-time Availability",
      description:
        "See live doctor schedules and choose the perfect time slot.",
      color: "blue",
    },
    {
      icon: Shield,
      title: "HIPAA Compliant",
      description:
        "Your data is protected with enterprise-grade security and privacy.",
      color: "purple",
    },
    {
      icon: Bell,
      title: "Smart Reminders",
      description: "Get automated reminders so you never miss an appointment.",
      color: "amber",
    },
    {
      icon: FileText,
      title: "Digital Records",
      description:
        "Access your medical history and prescriptions anytime, anywhere.",
      color: "rose",
    },
    {
      icon: MessageCircle,
      title: "Direct Messaging",
      description: "Communicate securely with your healthcare providers.",
      color: "indigo",
    },
  ];

  const specialties = [
    {
      name: "Cardiology",
      icon: HeartPulse,
      count:
        departments.find((d) => d.name === "Cardiology")?.doctor_count || 0,
    },
    {
      name: "Neurology",
      icon: Brain,
      count: departments.find((d) => d.name === "Neurology")?.doctor_count || 0,
    },
    {
      name: "Orthopedics",
      icon: Bone,
      count:
        departments.find((d) => d.name === "Orthopedics")?.doctor_count || 0,
    },
    {
      name: "Pediatrics",
      icon: Users,
      count:
        departments.find((d) => d.name === "Pediatrics")?.doctor_count || 0,
    },
    {
      name: "Dermatology",
      icon: Eye,
      count:
        departments.find((d) => d.name === "Dermatology")?.doctor_count || 0,
    },
    {
      name: "Psychiatry",
      icon: Heart,
      count:
        departments.find((d) => d.name === "Psychiatry")?.doctor_count || 0,
    },
  ];

  const colorMap = {
    emerald: "bg-emerald-100 text-emerald-600",
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    amber: "bg-amber-100 text-amber-600",
    rose: "bg-rose-100 text-rose-600",
    indigo: "bg-indigo-100 text-indigo-600",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-md shadow-sm border-b"
            : "bg-transparent"
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link
              href="/"
              className="flex items-center space-x-2 flex-shrink-0"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden shadow-lg shadow-emerald-500/25">
                <Image
                  src="/logo.jpeg"
                  alt="MediBook Logo"
                  width={36}
                  height={36}
                  className="object-cover"
                  priority
                />
              </div>
              <span className="text-xl font-bold text-gray-900">
                Medi<span className="text-emerald-600">Book</span>
              </span>
            </Link>

            <div className="hidden lg:flex items-center space-x-8">
              <Link
                href="#features"
                className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition"
              >
                Features
              </Link>
              <Link
                href="#doctors"
                className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition"
              >
                Doctors
              </Link>
              <Link
                href="#reviews"
                className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition"
              >
                Reviews
              </Link>
              <Link
                href="#faq"
                className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition"
              >
                FAQ
              </Link>
            </div>

            <div className="hidden lg:flex items-center space-x-3">
              <Link href="/login">
                <Button
                  variant="outline"
                  className="text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 border-gray-300"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>

          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden py-4 border-t"
              >
                <div className="flex flex-col space-y-4">
                  <Link
                    href="#features"
                    className="text-gray-600 hover:text-emerald-600 transition"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Features
                  </Link>
                  <Link
                    href="#doctors"
                    className="text-gray-600 hover:text-emerald-600 transition"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Doctors
                  </Link>
                  <Link
                    href="#reviews"
                    className="text-gray-600 hover:text-emerald-600 transition"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Reviews
                  </Link>
                  <Link
                    href="#faq"
                    className="text-gray-600 hover:text-emerald-600 transition"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    FAQ
                  </Link>
                  <div className="pt-4 border-t flex flex-col space-y-3">
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button variant="outline" className="w-full">
                        Sign In
                      </Button>
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Button className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 md:pt-32 pb-12 md:pb-20 overflow-hidden bg-gradient-to-br from-emerald-50/50 via-white to-blue-50/30">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-100/80 backdrop-blur-sm text-emerald-700 text-sm font-medium">
                <Sparkles className="w-4 h-4 mr-2" />
                Trusted by {stats.totalPatients.toLocaleString()}+ patients
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 leading-[1.1]">
                Your Health,
                <br />
                <span className="bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                  Our Priority
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-lg">
                Book appointments with top doctors, manage your health records,
                and get the care you deserve—all from the comfort of your home.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-xl hover:shadow-emerald-500/25 transition-all text-base px-8"
                  >
                    Start Your Journey
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto text-base border-gray-300 hover:border-emerald-500 hover:text-emerald-600"
                  >
                    Learn More
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-200/50">
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {stats.totalPatients.toLocaleString()}+
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Happy Patients
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {stats.totalDoctors.toLocaleString()}+
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Expert Doctors
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {stats.totalAppointments.toLocaleString()}+
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Appointments
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {stats.satisfactionRate}%
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Satisfaction Rate
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-gray-100">
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 mb-6">
                  <Search className="w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search for doctors or specialties..."
                    className="bg-transparent flex-1 outline-none text-sm text-gray-900 placeholder:text-gray-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Search
                  </Button>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {filteredDoctors.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No doctors found</p>
                      <p className="text-sm">Try adjusting your search</p>
                    </div>
                  ) : (
                    filteredDoctors.map((doctor, index) => (
                      <motion.div
                        key={doctor.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className="flex items-center justify-between p-3 bg-gray-50 hover:bg-emerald-50/50 rounded-xl transition cursor-pointer group"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-3xl">👨‍⚕️</span>
                          <div>
                            <p className="font-medium text-gray-900 group-hover:text-emerald-600 transition">
                              {doctor.full_name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {doctor.specialization}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-gray-400">
                                {doctor.department?.name}
                              </span>
                              {doctor.consultation_fee > 0 && (
                                <span className="text-xs text-emerald-600 font-medium">
                                  ${doctor.consultation_fee}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                            Available
                          </span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-4 h-4 text-yellow-400 fill-current"
                        />
                      ))}
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        {reviews.length > 0
                          ? (
                              reviews.reduce((acc, r) => acc + r.rating, 0) /
                              reviews.length
                            ).toFixed(1)
                          : "4.9"}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({reviews.length || 2500}+ reviews)
                      </span>
                    </div>
                    <Link
                      href="/doctors"
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center"
                    >
                      See all doctors
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 mb-4">
              Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Everything you need for{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                better healthcare
              </span>
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              A complete platform designed to make healthcare accessible and
              convenient for everyone.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="p-6 hover:shadow-xl transition-all duration-300 group border border-gray-100 hover:border-emerald-200">
                    <div
                      className={`w-12 h-12 rounded-xl ${colorMap[feature.color as keyof typeof colorMap]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Specialties Grid */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 mb-4">
              Specialties
            </Badge>
            <h2 className="text-3xl font-bold text-gray-900">
              Find the right{" "}
              <span className="text-emerald-600">specialist</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {specialties.map((specialty) => {
              const Icon = specialty.icon;
              return (
                <Link
                  href={`/doctors?specialty=${specialty.name}`}
                  key={specialty.name}
                >
                  <Card className="p-4 text-center hover:shadow-lg transition-all cursor-pointer group border border-gray-100 hover:border-emerald-200">
                    <div className="w-12 h-12 mx-auto bg-emerald-100 rounded-xl flex items-center justify-center mb-2 group-hover:bg-emerald-500 transition">
                      <Icon className="w-6 h-6 text-emerald-600 group-hover:text-white transition" />
                    </div>
                    <p className="font-medium text-sm text-gray-900">
                      {specialty.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {specialty.count} doctors
                    </p>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Top Doctors with Expandable Cards */}
      <section id="doctors" className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 gap-4">
            <div>
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 mb-4">
                Top Doctors
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Meet our <span className="text-emerald-600">experts</span>
              </h2>
            </div>
            <Link href="/doctors">
              <Button
                variant="outline"
                className="border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
              >
                View All Doctors
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {doctors.slice(0, 4).map((doctor, index) => (
              <motion.div
                key={doctor.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="p-6 hover:shadow-xl transition-all duration-300 group border border-gray-100 hover:border-emerald-200">
                  <div className="text-5xl mb-3">👨‍⚕️</div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-600 transition">
                    {doctor.full_name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {doctor.specialization}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {doctor.department?.name}
                  </p>
                  {doctor.consultation_fee > 0 && (
                    <p className="text-sm font-medium text-emerald-600 mt-1">
                      ${doctor.consultation_fee}
                    </p>
                  )}
                  <div className="flex items-center justify-center mt-2">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="ml-1 text-sm font-medium">
                      {doctor.rating || 4.9}
                    </span>
                    <span className="mx-1 text-gray-300">•</span>
                    <span className="text-sm text-gray-500">
                      {doctor.total_reviews || 234} reviews
                    </span>
                  </div>
                  <div className="mt-4">
                    <Badge className="bg-emerald-100 text-emerald-700">
                      Available Today
                    </Badge>
                  </div>

                  <button
                    onClick={() => toggleDoctorExpand(doctor.id)}
                    className="w-full mt-3 text-sm text-emerald-600 hover:text-emerald-700 flex items-center justify-center gap-1"
                  >
                    {expandedDoctor === doctor.id ? (
                      <>
                        Hide Details <ChevronUp className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        View Profile <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedDoctor === doctor.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-gray-200 text-left"
                      >
                        <div className="space-y-2 text-sm">
                          {doctor.bio && (
                            <p className="text-gray-600">
                              <span className="font-medium">Bio:</span>{" "}
                              {doctor.bio}
                            </p>
                          )}
                          {doctor.qualification && (
                            <p className="text-gray-600">
                              <span className="font-medium">
                                Qualification:
                              </span>{" "}
                              {doctor.qualification}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Link href="/dashboard/book-appointment">
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                Book Appointment
                              </Button>
                            </Link>
                            <Link href={`/doctors`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-emerald-200 text-emerald-600"
                              >
                                Full Profile
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="reviews" className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 mb-4">
              Patient Reviews
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Real <span className="text-emerald-600">Reviews</span> from Real
              Patients
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Hear what our patients say about their experience with MediBook
              doctors
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.length > 0 ? (
              reviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="p-6 hover:shadow-xl transition-shadow border border-gray-100">
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating
                              ? "text-yellow-400 fill-current"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                      "{review.review}"
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-semibold text-sm">
                          {review.patient_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {review.patient_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(review.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-emerald-600 font-medium">
                        Verified Patient
                      </span>
                    </div>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="flex flex-col items-center">
                  <Star className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500">No reviews yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Be the first to leave a review after your appointment!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 mb-4">
              FAQ
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Frequently Asked{" "}
              <span className="text-emerald-600">Questions</span>
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Find answers to common questions about using MediBook
            </p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
              >
                <Card
                  className={`p-6 cursor-pointer transition-all duration-300 border ${
                    expandedFaq === index
                      ? "border-emerald-200 shadow-md"
                      : "border-gray-100 hover:border-emerald-100"
                  }`}
                  onClick={() => toggleFaq(index)}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 pr-4">
                      {faq.question}
                    </h3>
                    {expandedFaq === index ? (
                      <ChevronUp className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                  <AnimatePresence>
                    {expandedFaq === index && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="text-gray-600 text-sm leading-relaxed pt-4">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-emerald-500"></div>
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to take control of your health?
          </h2>
          <p className="text-xl text-emerald-50 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied patients and start your healthcare
            journey today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-white text-emerald-600 hover:bg-gray-50 text-base px-8 shadow-xl hover:shadow-2xl transition-all"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 text-base"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 pb-8 border-b border-gray-800">
            <div className="col-span-2 sm:col-span-1">
              <Link href="/" className="flex items-center space-x-2 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden">
                  <Image
                    src="/logo.jpeg"
                    alt="MediBook Logo"
                    width={36}
                    height={36}
                    className="object-cover"
                  />
                </div>
                <span className="text-xl font-bold">MediBook</span>
              </Link>
              <p className="text-sm text-gray-400 max-w-xs">
                Your trusted healthcare booking platform. Making healthcare
                accessible for everyone.
              </p>
              <div className="flex space-x-4 mt-4">
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.048-1.067-.06-1.407-.06-4.123v-.08c0-2.643.012-2.987.06-4.043.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772 4.902 4.902 0 011.772-1.153c.636-.247 1.363-.416 2.427-.465C9.5 2.013 9.825 2 12.315 2zm0 1.336c-2.387 0-2.729.009-3.704.054-1.022.05-1.583.217-1.946.365-.477.194-.818.423-1.178.783-.36.36-.589.701-.783 1.178-.148.363-.314.924-.365 1.946-.045.975-.054 1.317-.054 3.704s.009 2.729.054 3.704c.05 1.022.217 1.583.365 1.946.194.477.423.818.783 1.178.36.36.701.589 1.178.783.363.148.924.314 1.946.365.975.045 1.317.054 3.704.054s2.729-.009 3.704-.054c1.022-.05 1.583-.217 1.946-.365.477-.194.818-.423 1.178-.783.36-.36.589-.701.783-1.178.148-.363.314-.924.365-1.946.045-.975.054-1.317.054-3.704s-.009-2.729-.054-3.704c-.05-1.022-.217-1.583-.365-1.946-.194-.477-.423-.818-.783-1.178-.36-.36-.701-.589-1.178-.783-.363-.148-.924-.314-1.946-.365-.975-.045-1.317-.054-3.704-.054zM12.315 7.24a4.76 4.76 0 100 9.52 4.76 4.76 0 000-9.52zm0 1.337a3.423 3.423 0 110 6.846 3.423 3.423 0 010-6.846zm4.808-3.336a.9.9 0 100 1.8.9.9 0 000-1.8z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878-.003-.985-.016-2.258-.328-3.266-.362-1.167-.805-2.398-.805-2.398s-.256-.633-.256-1.583c0-1.48.86-2.59 1.93-2.59.91 0 1.35.684 1.35 1.5 0 .915-.583 2.284-.884 3.553-.15.647.324 1.173 1.218 1.173 1.462 0 2.586-1.543 2.586-3.77 0-1.97-1.416-3.349-3.438-3.349-2.341 0-3.715 1.756-3.715 3.571 0 .708.273 1.464.614 1.877.067.083.077.156.058.24-.071.293-.206.786-.232.896-.037.162-.122.196-.28.118-1.048-.489-1.704-2.023-1.704-3.256 0-2.65 1.924-5.083 5.552-5.083 2.915 0 5.18 2.077 5.18 4.854 0 2.896-1.827 5.228-4.36 5.228-.852 0-1.653-.443-1.927-.967 0 0-.421 1.604-.523 1.997-.189.727-.699 1.464-1.042 1.961.783.241 1.614.372 2.478.372 5.523 0 10-4.477 10-10S17.523 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link
                    href="#features"
                    className="hover:text-white transition"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/doctors" className="hover:text-white transition">
                    Doctors
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white transition">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="#faq" className="hover:text-white transition">
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 text-center text-sm text-gray-400">
            <p>
              © 2026 MediBook. All rights reserved. Made by POCO for healthcare.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
