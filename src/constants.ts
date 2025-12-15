// Constants for BambooHR MCP Server

export const API_VERSION = 'v1';
export const CHARACTER_LIMIT = 50000;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Pagination constants
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;

// Response format enum
export enum ResponseFormat {
  JSON = 'json',
  MARKDOWN = 'markdown'
}

// Time off status constants
export const TIME_OFF_STATUSES = ['approved', 'denied', 'superceded', 'requested', 'canceled'] as const;

// Goal status constants
export const GOAL_STATUSES = ['in_progress', 'completed', 'on_hold'] as const;

export const FIELD_NAMES = {
  // Basic fields
  FIRST_NAME: 'firstName',
  LAST_NAME: 'lastName',
  EMAIL: 'email',
  PHONE: 'phone',
  MOBILE_PHONE: 'mobilePhone',
  
  // Job information
  JOB_TITLE: 'jobTitle',
  DEPARTMENT: 'department',
  DIVISION: 'division',
  LOCATION: 'location',
  SUPERVISOR: 'supervisor',
  
  // Employment
  HIRE_DATE: 'hireDate',
  TERMINATION_DATE: 'terminationDate',
  STATUS: 'status',
  EMPLOYEE_NUMBER: 'employeeNumber',
  
  // Personal
  DATE_OF_BIRTH: 'dateOfBirth',
  ADDRESS1: 'address1',
  ADDRESS2: 'address2',
  CITY: 'city',
  STATE: 'state',
  ZIP_CODE: 'zipcode',
  COUNTRY: 'country',
  
  // Compensation
  PAY_RATE: 'payRate',
  PAY_TYPE: 'payType',
  PAY_FREQUENCY: 'payFrequency'
} as const;

export const TABLE_NAMES = {
  JOB_INFO: 'jobInfo',
  EMPLOYMENT_STATUS: 'employmentStatus',
  COMPENSATION: 'compensation',
  CUSTOM: 'customTable'
} as const;
