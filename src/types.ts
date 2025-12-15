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
