"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import {
  Clock,
  Calendar,
  CheckCircle,
  Save,
  AlertCircle,
  ChevronDown,
  X,
  Plus,
  Minus,
} from "lucide-react";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const TIME_SLOTS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
];

export default function DoctorAvailability() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState<Record<string, string[]>>(
    {},
  );

  useEffect(() => {
    fetchAvailability();
  }, []);

  async function fetchAvailability() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("doctors")
        .select("availability")
        .eq("id", user.id)
        .single();

      if (error) {
        // If column doesn't exist or is null, initialize with empty object
        console.error("Error fetching availability:", error);
        setAvailability({});
      } else {
        setAvailability(data?.availability || {});
      }
    } catch (error: any) {
      toast.error("Failed to load availability");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const toggleTimeSlot = (day: string, time: string) => {
    setAvailability((prev) => {
      const current = prev[day] || [];
      const updated = current.includes(time)
        ? current.filter((t) => t !== time)
        : [...current, time].sort();
      return { ...prev, [day]: updated };
    });
  };

  const selectAllTimeSlots = (day: string) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: [...TIME_SLOTS],
    }));
  };

  const deselectAllTimeSlots = (day: string) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: [],
    }));
  };

  const saveAvailability = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { error } = await supabase
        .from("doctors")
        .update({ availability })
        .eq("id", user.id);

      if (error) {
        console.error("Save error:", error);
        toast.error("Failed to save availability: " + error.message);
      } else {
        toast.success("Availability updated successfully!");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save availability");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Calculate stats
  const totalSlots = Object.values(availability).reduce(
    (acc, slots) => acc + slots.length,
    0,
  );
  const daysWithSlots = Object.keys(availability).filter(
    (day) => (availability[day] || []).length > 0,
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Loading availability...</p>
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
            Availability
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Set your weekly availability for appointments
          </p>
        </div>
        <Button
          onClick={saveAvailability}
          className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
        >
          <Save className="w-4 h-4 mr-2" />
          Save Availability
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 sm:p-4">
          <p className="text-xs text-gray-500">Total Slots</p>
          <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            {totalSlots}
          </p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs text-gray-500">Days Available</p>
          <p className="text-lg sm:text-xl font-bold text-emerald-600">
            {daysWithSlots} / 7
          </p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs text-gray-500">Avg. Slots/Day</p>
          <p className="text-lg sm:text-xl font-bold text-blue-600">
            {daysWithSlots > 0 ? Math.round(totalSlots / daysWithSlots) : 0}
          </p>
        </Card>
        <Card className="p-3 sm:p-4">
          <p className="text-xs text-gray-500">Status</p>
          <p className="text-lg sm:text-xl font-bold text-emerald-600 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            {totalSlots > 0 ? "Active" : "Inactive"}
          </p>
        </Card>
      </div>

      {/* Availability Grid */}
      <Card className="p-4 sm:p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700">
                <th className="text-left py-3 px-2 sm:px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Day
                </th>
                <th className="text-left py-3 px-2 sm:px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Available Times
                </th>
                <th className="text-right py-3 px-2 sm:px-4 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {DAYS.map((day) => {
                const slots = availability[day] || [];
                const isFullySelected = slots.length === TIME_SLOTS.length;
                const isPartiallySelected =
                  slots.length > 0 && slots.length < TIME_SLOTS.length;

                return (
                  <tr
                    key={day}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-2 sm:px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white text-sm">
                          {day}
                        </span>
                        {isPartiallySelected && (
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-[10px]"
                          >
                            {slots.length}
                          </Badge>
                        )}
                        {isFullySelected && (
                          <Badge
                            variant="secondary"
                            className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-[10px]"
                          >
                            Full Day
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 sm:px-4">
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {TIME_SLOTS.map((time) => {
                          const isSelected = slots.includes(time);
                          return (
                            <button
                              key={time}
                              onClick={() => toggleTimeSlot(day, time)}
                              className={`
                                px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200
                                ${
                                  isSelected
                                    ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm shadow-emerald-500/25"
                                    : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                                }
                              `}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!isFullySelected && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => selectAllTimeSlots(day)}
                            title="Select all"
                          >
                            <Plus className="w-3.5 h-3.5 text-gray-400 hover:text-emerald-600" />
                          </Button>
                        )}
                        {slots.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => deselectAllTimeSlots(day)}
                            title="Deselect all"
                          >
                            <Minus className="w-3.5 h-3.5 text-gray-400 hover:text-rose-600" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-200 dark:bg-slate-700"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Available
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">
              {totalSlots} time slots selected across {daysWithSlots} days
            </span>
          </div>
        </div>
      </Card>

      {/* Tips */}
      <Card className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              Pro Tip
            </p>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              Select your available time slots for each day. Patients will only
              be able to book appointments during these times. You can update
              this anytime.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
