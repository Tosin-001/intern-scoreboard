// ============================================================================
// Hand-written types matching supabase/migrations/0001_init_schema.sql.
//
// Once the Supabase project is live, replace this file by running:
//   npm run supabase:types
// which generates exact types from the live schema. Keep this file as a
// fallback/reference until then.
// ============================================================================

export type Status = "Excellent" | "Good" | "Average" | "Needs Improvement";

export interface Admin {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export interface Intern {
  id: string;
  full_name: string;
  email: string;
  department: string;
  score: number;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScoreHistoryEntry {
  id: string;
  intern_id: string;
  old_score: number;
  new_score: number;
  updated_by: string | null;
  updated_at: string;
}

/** Row shape returned by the `public.leaderboard` view. */
export interface LeaderboardEntry {
  id: string;
  full_name: string;
  email: string;
  department: string;
  score: number;
  rank: number;
  status: Status;
}

// ----------------------------------------------------------------------------
// Minimal Supabase `Database` type so createClient<Database>() gets inference
// without needing the CLI-generated file yet.
// ----------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      admins: {
        Row: Admin;
        Insert: Partial<Admin> & Pick<Admin, "id" | "email">;
        Update: Partial<Admin>;
      };
      interns: {
        Row: Intern;
        Insert: Partial<Intern> &
          Pick<Intern, "full_name" | "email" | "department">;
        Update: Partial<Intern>;
      };
      score_history: {
        Row: ScoreHistoryEntry;
        Insert: never; // written only by the DB trigger, never by app code
        Update: never;
      };
    };
    Views: {
      leaderboard: {
        Row: LeaderboardEntry;
      };
    };
  };
}
