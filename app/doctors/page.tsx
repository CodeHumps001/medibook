"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Star,
  Stethoscope,
  Building2,
  DollarSign,
  ChevronDown,
  ChevronUp,
  HeartPulse,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

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

// Component that uses useSearchParams - wrapped in Suspense
function DoctorsContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const specialtyFilter = searchParams.get("specialty");

  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>(
    specialtyFilter || "",
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchDoctors();
    fetchDepartments();
  }, []);

  useEffect(() => {
    filterDoctors();
  }, [searchTerm, selectedDepartment, doctors]);

  async function fetchDoctors() {
    try {
      setLoading(true);
      const { data } = await supabase
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
        .eq("is_active", true);

      const formatted = (data || []).map((doc: any) => ({
        ...doc,
        full_name: doc.profiles?.full_name || "Unknown",
        department: doc.departments || { name: "General" },
      }));

      setDoctors(formatted);
      setFilteredDoctors(formatted);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      toast.error("Failed to load doctors");
    } finally {
      setLoading(false);
    }
  }

  async function fetchDepartments() {
    try {
      const { data } = await supabase
        .from("departments")
        .select("name")
        .order("name");
      if (data) {
        setDepartments(data.map((d) => d.name));
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  }

  function filterDoctors() {
    let filtered = doctors;

    if (searchTerm) {
      filtered = filtered.filter(
        (doc) =>
          doc.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.specialization.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    if (selectedDepartment) {
      filtered = filtered.filter(
        (doc) => doc.department?.name === selectedDepartment,
      );
    }

    setFilteredDoctors(filtered);
  }

  const toggleDoctorExpand = (id: string) => {
    setExpandedDoctor(expandedDoctor === id ? null : id);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDoctors();
    toast.success("Doctors refreshed");
    setIsRefreshing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Loading doctors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Our <span className="text-emerald-600">Doctors</span>
            </h1>
            <p className="mt-2 text-gray-600">
              Find and book appointments with our expert healthcare
              professionals
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by name or specialization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            className="px-4 py-2 border rounded-lg bg-white w-full sm:w-48"
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* Results Count */}
        <p className="text-sm text-gray-500 mb-4">
          Showing {filteredDoctors.length} doctors
        </p>

        {/* Doctors Grid */}
        {filteredDoctors.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-500">No doctors found</p>
            <p className="text-sm text-gray-400 mt-1">
              Try adjusting your search or filters
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor) => (
              <motion.div
                key={doctor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="p-6 hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-emerald-200">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-2xl font-bold flex-shrink-0">
                      {doctor.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">
                        {doctor.full_name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {doctor.specialization}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          <Building2 className="w-3 h-3 mr-1" />
                          {doctor.department?.name}
                        </Badge>
                        {doctor.consultation_fee > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <DollarSign className="w-3 h-3 mr-1" />$
                            {doctor.consultation_fee}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center mt-2">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="ml-1 text-sm font-medium">
                          {doctor.rating || 4.9}
                        </span>
                        <span className="mx-1 text-gray-300">•</span>
                        <span className="text-sm text-gray-500">
                          {doctor.total_reviews || 0} reviews
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleDoctorExpand(doctor.id)}
                    className="w-full mt-4 text-sm text-emerald-600 hover:text-emerald-700 flex items-center justify-center gap-1"
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
                        className="mt-4 pt-4 border-t border-gray-200"
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
                          <div className="flex flex-wrap gap-2 mt-3">
                            <Link
                              href={`/dashboard/book-appointment?doctor=${doctor.id}`}
                            >
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <Stethoscope className="w-3.5 h-3.5 mr-1.5" />
                                Book Appointment
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-emerald-200 text-emerald-600"
                            >
                              <HeartPulse className="w-3.5 h-3.5 mr-1.5" />
                              Full Profile
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function DoctorsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="relative text-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-sm text-gray-500">Loading doctors...</p>
          </div>
        </div>
      }
    >
      <DoctorsContent />
    </Suspense>
  );
}
