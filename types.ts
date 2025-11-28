
export enum LeadStatus {
  New = 'Novo',
  Contacted = 'Contactado',
  FollowUp = 'Follow-up',
  Qualified = 'Qualificado',
  Unqualified = 'Desqualificado'
}

export interface Note {
  id: string;
  content: string;
  date: string;
}

export interface Task {
  id: string;
  content: string;
  dueDate: string;
  isCompleted: boolean;
}

export interface Lead {
  id: string;
  companyName: string;
  industry: string;
  location: string;
  summary: string;
  reasonWhy: string;
  potentialNeeds: string[];
  keyContacts: string[];
  status: LeadStatus;
  isSaved?: boolean;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  notes?: Note[];
  tasks?: Task[];
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'warning' | 'info' | 'success';
  leadId?: string;
}
