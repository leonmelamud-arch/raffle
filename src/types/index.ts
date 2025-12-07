export interface Session {
  id: string;
  created_at: string;
  is_active: boolean;
}

export interface Participant {
  id: string;
  name: string;
  last_name: string;
  display_name: string;
  session_id?: string;
}

