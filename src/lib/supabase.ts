/**
 * Database Client for HypnoRaffle
 * Uses Supabase directly (no PostgREST fallback)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if Supabase is configured
const isSupabaseConfigured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!isSupabaseConfigured) {
  console.warn('[DB] Supabase not configured - check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Create Supabase client
const supabaseClient = isSupabaseConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    })
  : null;

if (isSupabaseConfigured) {
  console.log('[DB] Using Supabase as primary database');
}

// Response types (compatible with old code)
export interface PostgrestError {
  message: string;
  details: string;
  hint: string;
  code: string;
}

export interface PostgrestResponse<T> {
  data: T | null;
  error: PostgrestError | null;
}

/**
 * Simple wrapper around Supabase client
 */
class DatabaseClient {
  private supabase: SupabaseClient | null;

  constructor() {
    this.supabase = supabaseClient;
  }

  /**
   * Access a table
   */
  from<T = unknown>(table: string) {
    if (!this.supabase) {
      throw new Error('Supabase not configured');
    }
    return this.supabase.from(table);
  }

  /**
   * Call a stored procedure (RPC)
   */
  async rpc<T = unknown>(
    functionName: string,
    params?: Record<string, unknown>
  ): Promise<PostgrestResponse<T>> {
    if (!this.supabase) {
      return { 
        data: null, 
        error: { message: 'Supabase not configured', details: '', hint: '', code: 'NOT_CONFIGURED' } 
      };
    }

    try {
      const { data, error } = await this.supabase.rpc(functionName, params);
      if (error) {
        console.error(`[DB] RPC ${functionName} failed:`, error.message);
        return { 
          data: null, 
          error: { message: error.message, details: '', hint: '', code: error.code || 'RPC_ERROR' } 
        };
      }
      return { data: data as T, error: null };
    } catch (err) {
      console.error(`[DB] RPC ${functionName} error:`, err);
      return { 
        data: null, 
        error: { message: err instanceof Error ? err.message : 'Unknown error', details: '', hint: '', code: 'RPC_ERROR' } 
      };
    }
  }

  /**
   * Get the raw Supabase client (for auth, storage, etc.)
   */
  getSupabaseClient(): SupabaseClient | null {
    return this.supabase;
  }

  /**
   * Check if Supabase is configured
   */
  isConfigured(): boolean {
    return !!this.supabase;
  }
}

// Create singleton instance
const databaseClient = new DatabaseClient();

// Export the database client
export const db = databaseClient;
export const supabase = databaseClient;

// Export raw Supabase client for auth features
export const supabaseAuth = supabaseClient;

// For components that import from '@/lib/supabase', this maintains compatibility
export default databaseClient;
