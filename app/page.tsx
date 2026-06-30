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
} from "lucide-react";

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
  department: {
    name: string;
  };
  profiles: {
    full_name: string;
  };
}

export default function Home() {
  const supabase = createClient();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
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

      // Fetch departments with doctor counts
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

      // Fetch active doctors with their profiles and departments
      const { data: doctorData } = await supabase
        .from("doctors")
        .select(
          `
          id,
          specialization,
          qualification,
          consultation_fee,
          is_active,
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

      // Fetch stats
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

  const testimonials = [
    {
      name: "John Anderson",
      role: "Patient",
      content:
        "I was able to see a specialist within 24 hours. The platform is incredibly easy to use and the doctors are top-notch.",
      rating: 5,
      avatar: "👨",
      date: "2 days ago",
    },
    {
      name: "Dr. Sarah Mitchell",
      role: "Cardiologist",
      content:
        "MediBook has transformed how I manage my practice. It's efficient, professional, and my patients love it.",
      rating: 5,
      avatar: "👩",
      date: "1 week ago",
    },
    {
      name: "Emily Thompson",
      role: "Patient",
      content:
        "The best healthcare booking experience I've ever had. The reminders and follow-ups are incredibly helpful.",
      rating: 5,
      avatar: "👩",
      date: "3 days ago",
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
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center space-x-2 flex-shrink-0"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <HeartPulse className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                Medi<span className="text-emerald-600">Book</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
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
                href="#testimonials"
                className="text-sm font-medium text-gray-600 hover:text-emerald-600 transition"
              >
                Testimonials
              </Link>
            </div>

            {/* Desktop Actions */}
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

            {/* Mobile Menu Button */}
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

          {/* Mobile Menu */}
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
                    href="#testimonials"
                    className="text-gray-600 hover:text-emerald-600 transition"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Testimonials
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
            {/* Hero Content */}
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

              {/* Stats */}
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

            {/* Hero Image / Cards */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border border-gray-100">
                {/* Search Bar */}
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
                    onClick={() => setSearchTerm(searchTerm)}
                  >
                    Search
                  </Button>
                </div>

                {/* Doctor Cards */}
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
                        4.9
                      </span>
                      <span className="text-sm text-gray-500">
                        ({stats.totalAppointments.toLocaleString()}+ reviews)
                      </span>
                    </div>
                    <Link
                      href="#doctors"
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
                <Card
                  key={specialty.name}
                  className="p-4 text-center hover:shadow-lg transition-all cursor-pointer group border border-gray-100 hover:border-emerald-200"
                >
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
              );
            })}
          </div>
        </div>
      </section>

      {/* Top Doctors */}
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
                <Card className="p-6 text-center hover:shadow-xl transition-all duration-300 group border border-gray-100 hover:border-emerald-200">
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
                    <span className="ml-1 text-sm font-medium">4.9</span>
                    <span className="mx-1 text-gray-300">•</span>
                    <span className="text-sm text-gray-500">234 reviews</span>
                  </div>
                  <div className="mt-4">
                    <Badge className="bg-emerald-100 text-emerald-700">
                      Available Today
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full mt-4 border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300"
                  >
                    View Profile
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-16 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 mb-4">
              Testimonials
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              What our <span className="text-emerald-600">users say</span>
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Real experiences from real people who trust MediBook
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
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
                        className="w-4 h-4 text-yellow-400 fill-current"
                      />
                    ))}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{testimonial.avatar}</span>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {testimonial.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">
                      {testimonial.date}
                    </span>
                  </div>
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
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 pb-8 border-b border-gray-800">
            <div className="col-span-2 sm:col-span-1">
              <Link href="/" className="flex items-center space-x-2 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <HeartPulse className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">MediBook</span>
              </Link>
              <p className="text-sm text-gray-400 max-w-xs">
                Your trusted healthcare booking platform. Making healthcare
                accessible for everyone.
              </p>
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
                  <Link href="#" className="hover:text-white transition">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Security
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Integrations
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
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Press
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Help Center
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
              © 2024 MediBook. All rights reserved. Made with ❤️ for better
              healthcare.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
