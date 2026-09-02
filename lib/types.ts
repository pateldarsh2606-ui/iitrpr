export interface Profile {
  id: string;
  full_name: string;
  department: string;
  entry_number: string;
  bio: string | null;
  avatar_path?: string | null;
  favorite_music?: string | null;
  favorite_movie?: string | null;
  interests?: string[];
  vibe?: string | null;
  ideal_prom?: string | null;
  created_at: string;
}

export interface Crush {
  id: string;
  chooser_id: string;
  crush_id: string;
  created_at: string;
}

export interface CrushRequest {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  responded_at: string | null;
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

export const VIBES = ['Chill', 'Adventurous', 'Funny', 'Creative', 'Competitive', 'Introvert-ish', 'Social', 'Chaotic'] as const;
