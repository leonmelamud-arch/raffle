/**
 * TypeScript type definitions for HypnoRaffle
 */

export interface Participant {
  id: string;
  session_id?: string;
  name: string;
  last_name: string;
  display_name: string;
  email?: string;
  won?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Session {
  id: string;
  name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QrRef {
  id: string;
  session_id?: string;
  short_code: string;
  slug?: string;
  name?: string;
  description?: string;
  target_url?: string;
  category?: string;
  is_active?: boolean;
  expires_at?: string;
  scan_count?: number;
  created_at: string;
}

// Type for creating a new participant (without auto-generated fields)
export type NewParticipant = Pick<Participant, 'name' | 'last_name' | 'display_name'> & Partial<Pick<Participant, 'email' | 'session_id'>>;

// Type for updating a participant
export type ParticipantUpdate = Partial<Pick<Participant, 'name' | 'last_name' | 'display_name' | 'email' | 'won'>>;

// Response from create_session_with_qr RPC
export interface CreateSessionResponse {
  session_id: string;
  short_code: string;
}

