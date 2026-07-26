export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  biography: string | null;
  creator_type: string | null;
  preferred_tone: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectType = "video" | "document" | "course" | "mixed";
export type ProjectStatus = "active" | "archived";

export type Project = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  project_type: ProjectType;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          biography?: string | null;
          creator_type?: string | null;
          preferred_tone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          biography?: string | null;
          creator_type?: string | null;
          preferred_tone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: Project;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          project_type?: ProjectType;
          status?: ProjectStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          project_type?: ProjectType;
          status?: ProjectStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      project_type: ProjectType;
      project_status: ProjectStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
