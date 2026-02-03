// Type definitions for BambooHR API

export interface BambooHRConfig {
  apiKey: string;
  companyDomain: string;
}

export interface Employee {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  jobTitle?: string;
  department?: string;
  location?: string;
  supervisor?: string;
  hireDate?: string;
  status?: string;
  [key: string]: unknown;
}

export interface DirectoryEmployee {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  department?: string;
  photoUrl?: string;
}

export interface PaginatedResponse<T> {
  total: number;
  count: number;
  offset: number;
  items: T[];
  has_more: boolean;
  next_offset?: number;
}

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  status: string;
  start: string;
  end: string;
  amount: string;
  type: {
    id: string;
    name: string;
  };
}

export interface TimeOffPolicy {
  id: string;
  timeOffTypeId: string;
  name: string;
}

export interface JobApplication {
  id: number;
  jobId: number;
  candidateId: number;
  status: string;
  appliedDate: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  percentComplete: number;
  status: string;
  dueDate?: string;
}

export interface TrainingRecord {
  id: string;
  employeeId: string;
  completed: string;
  notes?: string;
  cost?: string;
  credits?: string;
  hours?: string;
  type: {
    id: string;
    name: string;
  };
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  monitorFields: string[];
  format: 'json' | 'xml';
}

export interface ApiError {
  error: string;
  message: string;
  status?: number;
}

export interface TableRow {
  id: string;
  date?: string;
  [key: string]: unknown;
}

// Certification tracking types
export interface Certification {
  employeeId: string;
  employeeName: string;
  certificationCode: string;
  certificationName: string;
  category: 'azure' | 'data' | 'power-platform' | 'aws' | 'other';
  completedDate?: string;
  dueDate?: string;
  expiresDate?: string;
  status: 'active' | 'expiring_soon' | 'expired' | 'not_started';
  daysUntilDue?: number;
  daysUntilExpires?: number;
}

export interface AssessmentItem {
  employeeId: string;
  employeeName: string;
  department?: string;
  assessmentType: 'certification' | 'training' | 'goal';
  assessmentName: string;
  dueDate?: string;
  expiresDate?: string;
  status: 'upcoming' | 'due' | 'overdue' | 'completed';
  daysUntilDue?: number;
}

export interface CertificationSummary {
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
  notStarted: number;
  byCategory: Record<string, number>;
  byDepartment: Record<string, { total: number; compliant: number }>;
}

export interface EmployeeCertificationSummary {
  employeeId: string;
  employeeName: string;
  department?: string;
  certifications: Certification[];
  summary: {
    total: number;
    active: number;
    expiringSoon: number;
    expired: number;
    notStarted: number;
  };
}
