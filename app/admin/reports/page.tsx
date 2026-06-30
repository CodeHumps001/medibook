"use client";

import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Users,
  Stethoscope,
  Activity,
  TrendingUp,
  BarChart3,
  PieChart,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Filter,
  Search,
  RefreshCw,
  FileSpreadsheet,
  FileJson,
  File,
  FileDown,
  CalendarRange,
  PrinterIcon,
  Eye,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useAutoRefresh } from "@/lib/hooks/useAutoRefresh";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
);

interface ReportData {
  totalPatients: number;
  totalDoctors: number;
  totalAppointments: number;
  pendingAppointments: number;
  approvedAppointments: number;
  rejectedAppointments: number;
  completedAppointments: number;
  monthlyData: number[];
  departmentStats: { name: string; count: number; appointments: number }[];
  dailyData: { date: string; count: number }[];
  doctorStats: { name: string; appointments: number; patients: number }[];
}

function ReportsContent() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reportData, setReportData] = useState<ReportData>({
    totalPatients: 0,
    totalDoctors: 0,
    totalAppointments: 0,
    pendingAppointments: 0,
    approvedAppointments: 0,
    rejectedAppointments: 0,
    completedAppointments: 0,
    monthlyData: Array(12).fill(0),
    departmentStats: [],
    dailyData: [],
    doctorStats: [],
  });

  // Auto-refresh every 30 seconds
  const { refresh: autoRefresh } = useAutoRefresh({
    interval: 30000,
    enabled: true,
    onRefresh: async () => {
      console.log("Auto-refreshing reports...");
      await fetchReportData(true);
    },
  });

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchReportData(false);
    toast.success("Reports refreshed");
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchReportData();

    // Real-time subscription for appointments
    const channel = supabase
      .channel("reports-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        (payload) => {
          console.log("Appointment changed (realtime):", payload);
          fetchReportData(true);
        },
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchReportData(silent = false) {
    try {
      if (!silent) setLoading(true);

      // Get all appointments
      const { data: appointments } = await supabase
        .from("appointments")
        .select("*");

      // Get patients and doctors counts
      const { count: patients } = await supabase
        .from("patients")
        .select("*", { count: "exact", head: true });

      const { count: doctors } = await supabase
        .from("doctors")
        .select("*", { count: "exact", head: true });

      // Get monthly data
      const monthlyData = Array(12).fill(0);
      appointments?.forEach((a: any) => {
        const month = new Date(a.created_at).getMonth();
        monthlyData[month]++;
      });

      // Get department stats
      const { data: departments } = await supabase.from("departments").select(`
          name,
          doctors (
            id
          )
        `);

      const departmentStats =
        departments?.map((dept: any) => ({
          name: dept.name,
          count: dept.doctors?.length || 0,
          appointments:
            appointments?.filter((a: any) => a.department_id === dept.id)
              .length || 0,
        })) || [];

      // Get daily data (last 30 days)
      const dailyData = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const count =
          appointments?.filter((a: any) => a.appointment_date === dateStr)
            .length || 0;
        dailyData.push({ date: dateStr, count });
      }

      // Get doctor stats
      const { data: doctorsData } = await supabase.from("doctors").select(`
          id,
          profiles (
            full_name
          )
        `);

      const doctorStats = await Promise.all(
        (doctorsData || []).map(async (doc: any) => {
          const { count: appCount } = await supabase
            .from("appointments")
            .select("*", { count: "exact", head: true })
            .eq("doctor_id", doc.id);

          return {
            name: doc.profiles?.full_name || "Unknown",
            appointments: appCount || 0,
            patients: 0,
          };
        }),
      );

      setReportData({
        totalPatients: patients || 0,
        totalDoctors: doctors || 0,
        totalAppointments: appointments?.length || 0,
        pendingAppointments:
          appointments?.filter((a: any) => a.status === "pending").length || 0,
        approvedAppointments:
          appointments?.filter((a: any) => a.status === "approved").length || 0,
        rejectedAppointments:
          appointments?.filter((a: any) => a.status === "rejected").length || 0,
        completedAppointments:
          appointments?.filter((a: any) => a.status === "completed").length ||
          0,
        monthlyData,
        departmentStats,
        dailyData,
        doctorStats,
      });
    } catch (error) {
      console.error("Error fetching report data:", error);
      if (!silent) toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  }

  // Export to PDF
  const exportToPDF = async () => {
    try {
      setExporting(true);
      const doc = new jsPDF("l", "mm", "a4");

      // Add title
      doc.setFontSize(20);
      doc.setTextColor(16, 185, 129);
      doc.text("MediBook - Analytics Report", 20, 20);

      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);

      // Summary section
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text("Summary Statistics", 20, 45);

      const summaryData = [
        ["Metric", "Value"],
        ["Total Patients", reportData.totalPatients.toString()],
        ["Total Doctors", reportData.totalDoctors.toString()],
        ["Total Appointments", reportData.totalAppointments.toString()],
        ["Pending", reportData.pendingAppointments.toString()],
        ["Approved", reportData.approvedAppointments.toString()],
        ["Completed", reportData.completedAppointments.toString()],
        ["Rejected", reportData.rejectedAppointments.toString()],
      ];

      autoTable(doc, {
        startY: 50,
        head: [summaryData[0]],
        body: summaryData.slice(1),
        theme: "striped",
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 10 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 60 } },
      });

      // Department stats
      let finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.text("Department Statistics", 20, finalY);

      const deptData = reportData.departmentStats.map((d) => [
        d.name,
        d.count.toString(),
        d.appointments.toString(),
      ]);

      autoTable(doc, {
        startY: finalY + 5,
        head: [["Department", "Doctors", "Appointments"]],
        body: deptData,
        theme: "striped",
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 10 },
      });

      doc.save("medibook-report.pdf");
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF");
    } finally {
      setExporting(false);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    try {
      setExporting(true);

      const wb = XLSX.utils.book_new();

      // Summary sheet
      const summaryData = [
        ["Metric", "Value"],
        ["Total Patients", reportData.totalPatients],
        ["Total Doctors", reportData.totalDoctors],
        ["Total Appointments", reportData.totalAppointments],
        ["Pending", reportData.pendingAppointments],
        ["Approved", reportData.approvedAppointments],
        ["Completed", reportData.completedAppointments],
        ["Rejected", reportData.rejectedAppointments],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws1, "Summary");

      // Department stats sheet
      const deptData = [
        ["Department", "Doctors", "Appointments"],
        ...reportData.departmentStats.map((d) => [
          d.name,
          d.count,
          d.appointments,
        ]),
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(deptData);
      XLSX.utils.book_append_sheet(wb, ws2, "Departments");

      // Daily data sheet
      const dailyData = [
        ["Date", "Appointments"],
        ...reportData.dailyData.map((d) => [d.date, d.count]),
      ];
      const ws3 = XLSX.utils.aoa_to_sheet(dailyData);
      XLSX.utils.book_append_sheet(wb, ws3, "Daily Trends");

      // Doctor stats sheet
      const doctorData = [
        ["Doctor", "Appointments"],
        ...reportData.doctorStats.map((d) => [d.name, d.appointments]),
      ];
      const ws4 = XLSX.utils.aoa_to_sheet(doctorData);
      XLSX.utils.book_append_sheet(wb, ws4, "Doctors");

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/octet-stream" });
      saveAs(blob, "medibook-report.xlsx");

      toast.success("Excel downloaded successfully!");
    } catch (error) {
      console.error("Excel export error:", error);
      toast.error("Failed to export Excel");
    } finally {
      setExporting(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    try {
      setExporting(true);

      const csvRows = [
        ["Metric", "Value"],
        ["Total Patients", reportData.totalPatients],
        ["Total Doctors", reportData.totalDoctors],
        ["Total Appointments", reportData.totalAppointments],
        ["Pending", reportData.pendingAppointments],
        ["Approved", reportData.approvedAppointments],
        ["Completed", reportData.completedAppointments],
        ["Rejected", reportData.rejectedAppointments],
        [""],
        ["Department", "Doctors", "Appointments"],
        ...reportData.departmentStats.map((d) => [
          d.name,
          d.count,
          d.appointments,
        ]),
        [""],
        ["Date", "Appointments"],
        ...reportData.dailyData.map((d) => [d.date, d.count]),
      ];

      const csvContent = csvRows.map((row) => row.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "medibook-report.csv");

      toast.success("CSV downloaded successfully!");
    } catch (error) {
      console.error("CSV export error:", error);
      toast.error("Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };

  // Export to JSON
  const exportToJSON = () => {
    try {
      setExporting(true);

      const jsonData = {
        generated: new Date().toISOString(),
        summary: {
          totalPatients: reportData.totalPatients,
          totalDoctors: reportData.totalDoctors,
          totalAppointments: reportData.totalAppointments,
          pending: reportData.pendingAppointments,
          approved: reportData.approvedAppointments,
          completed: reportData.completedAppointments,
          rejected: reportData.rejectedAppointments,
        },
        departments: reportData.departmentStats,
        dailyData: reportData.dailyData,
        doctors: reportData.doctorStats,
      };

      const jsonString = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      saveAs(blob, "medibook-report.json");

      toast.success("JSON downloaded successfully!");
    } catch (error) {
      console.error("JSON export error:", error);
      toast.error("Failed to export JSON");
    } finally {
      setExporting(false);
    }
  };

  // Print report
  const handlePrint = () => {
    window.print();
  };

  // Chart data with better colors
  const monthlyChartData = {
    labels: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    datasets: [
      {
        label: "Appointments",
        data: reportData.monthlyData,
        backgroundColor: "rgba(99, 102, 241, 0.6)",
        borderColor: "rgba(99, 102, 241, 1)",
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const dailyChartData = {
    labels: reportData.dailyData.map((d) =>
      new Date(d.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    ),
    datasets: [
      {
        label: "Daily Appointments",
        data: reportData.dailyData.map((d) => d.count),
        fill: true,
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        borderColor: "rgba(99, 102, 241, 1)",
        tension: 0.4,
        pointBackgroundColor: "rgba(99, 102, 241, 1)",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  const statusChartData = {
    labels: ["Pending", "Approved", "Completed", "Rejected"],
    datasets: [
      {
        data: [
          reportData.pendingAppointments,
          reportData.approvedAppointments,
          reportData.completedAppointments,
          reportData.rejectedAppointments,
        ],
        backgroundColor: [
          "rgba(234, 179, 8, 0.8)",
          "rgba(34, 197, 94, 0.8)",
          "rgba(59, 130, 246, 0.8)",
          "rgba(239, 68, 68, 0.8)",
        ],
        borderColor: [
          "rgba(234, 179, 8, 1)",
          "rgba(34, 197, 94, 1)",
          "rgba(59, 130, 246, 1)",
          "rgba(239, 68, 68, 1)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  if (loading && !isRefreshing) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-gray-500">Generating report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Reports
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Generate and export detailed analytics reports
            {isRefreshing && (
              <span className="text-emerald-500 ml-2">(Refreshing...)</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
            variant="outline"
            size="sm"
            onClick={exportToPDF}
            disabled={exporting}
            className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          >
            <File className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            disabled={exporting}
            className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={exporting}
            className="border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            <FileText className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToJSON}
            disabled={exporting}
            className="border-purple-200 text-purple-600 hover:bg-purple-50"
          >
            <FileJson className="w-4 h-4 mr-2" />
            JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <PrinterIcon className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-indigo-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Patients</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {reportData.totalPatients}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <Stethoscope className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Doctors</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {reportData.totalDoctors}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-purple-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Appointments</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {reportData.totalAppointments}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completion Rate</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {reportData.totalAppointments > 0
                  ? Math.round(
                      (reportData.completedAppointments /
                        reportData.totalAppointments) *
                        100,
                    )
                  : 0}
                %
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Monthly Trends
          </h3>
          <div className="h-64">
            <Bar data={monthlyChartData} options={chartOptions} />
          </div>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Status Distribution
          </h3>
          <div className="h-64">
            <Doughnut
              data={statusChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "bottom",
                    labels: {
                      padding: 20,
                      usePointStyle: true,
                      pointStyle: "circle",
                    },
                  },
                },
              }}
            />
          </div>
        </Card>
      </div>

      {/* Daily Trends */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Daily Trends (Last 30 Days)
        </h3>
        <div className="h-48">
          <Line data={dailyChartData} options={chartOptions} />
        </div>
      </Card>

      {/* Department Stats */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Department Statistics
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-slate-700">
                <th className="text-left py-3 text-sm font-medium text-gray-500">
                  Department
                </th>
                <th className="text-right py-3 text-sm font-medium text-gray-500">
                  Doctors
                </th>
                <th className="text-right py-3 text-sm font-medium text-gray-500">
                  Appointments
                </th>
                <th className="text-right py-3 text-sm font-medium text-gray-500">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody>
              {reportData.departmentStats.map((dept, index) => (
                <tr
                  key={index}
                  className="border-b dark:border-slate-700 last:border-0"
                >
                  <td className="py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {dept.name}
                  </td>
                  <td className="py-3 text-sm text-right text-gray-600">
                    {dept.count}
                  </td>
                  <td className="py-3 text-sm text-right text-gray-600">
                    {dept.appointments}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{
                            width: `${Math.min((dept.appointments / (reportData.totalAppointments || 1)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">
                        {Math.round(
                          (dept.appointments /
                            (reportData.totalAppointments || 1)) *
                            100,
                        )}
                        %
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Export Options */}
      <Card className="p-8 border-2 border-dashed border-indigo-200 dark:border-indigo-800">
        <div className="text-center">
          <FileDown className="w-14 h-14 text-indigo-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Export Full Report
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6">
            Download the complete analytics report in your preferred format
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              onClick={exportToPDF}
              disabled={exporting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <File className="w-4 h-4 mr-2" />
              PDF Report
            </Button>
            <Button
              onClick={exportToExcel}
              disabled={exporting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel Report
            </Button>
            <Button
              onClick={exportToCSV}
              disabled={exporting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              CSV Data
            </Button>
            <Button
              onClick={exportToJSON}
              disabled={exporting}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <FileJson className="w-4 h-4 mr-2" />
              JSON Data
            </Button>
          </div>
          {exporting && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-gray-500">Exporting...</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// Main export with Suspense
export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[60vh]">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-sm text-gray-500">Loading reports...</p>
          </div>
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}
