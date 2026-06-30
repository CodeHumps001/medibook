export interface Department {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface Doctor {
  id: string;
  full_name: string;
  email: string;
  department_id: string;
  department?: Department;
  specialization: string;
  qualification: string;
  consultation_fee: number;
  availability: {
    monday: string[];
    tuesday: string[];
    wednesday: string[];
    thursday: string[];
    friday: string[];
    saturday: string[];
    sunday: string[];
  };
  is_active: boolean;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  department_id: string;
  appointment_date: string;
  appointment_time: string;
  status: "pending" | "approved" | "rejected" | "completed" | "cancelled";
  symptoms?: string;
  notes?: string;
  created_at: string;
  doctor?: Doctor;
  department?: Department;
}
