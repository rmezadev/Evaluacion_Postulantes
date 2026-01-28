
export enum UserRole {
  ADMIN = 'ADMIN',
  POSTULANTE = 'POSTULANTE'
}

export enum EvaluationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED'
}

export interface Applicant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  downloadLink: string;
  startTime?: number; // Timestamp
  endTime?: number;   // Timestamp
  submissionLink?: string;
  status: EvaluationStatus;
  isSuspended?: boolean; // Propiedad para control de acceso
}

export interface UserSession {
  role: UserRole;
  email: string;
  applicantId?: string;
}

export const EVALUATION_DURATION_MS = 45 * 60 * 1000; // 45 minutes
