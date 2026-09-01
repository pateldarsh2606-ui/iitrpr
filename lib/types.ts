export interface Profile {
  id: string;
  full_name: string;
  department: string;
  entry_number: string;
  bio: string | null;
  created_at: string;
}

export interface Crush {
  id: string;
  chooser_id: string;
  crush_id: string;
  created_at: string;
}

export interface Match {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Metallurgical & Materials Engineering',
  'Chemical Engineering',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Artificial Intelligence & Data Engineering',
  'Digital Agriculture',
  'Engineering Physics',
  'Engineering Science',
  'Integrated Circuit Design & Technology',
  'Mathematics & Computing',
] as const;

export const MAX_CRUSHES = 3;
