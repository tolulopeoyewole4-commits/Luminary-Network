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

export type SourceFileType = "pdf" | "docx" | "txt" | "mp4" | "mov";
export type SourceProcessingStatus =
  | "uploading"
  | "uploaded"
  | "processing"
  | "ready"
  | "failed";

export type SourceFile = {
  id: string;
  user_id: string;
  project_id: string;
  original_filename: string;
  internal_storage_path: string;
  file_type: SourceFileType;
  mime_type: string;
  file_size: number;
  processing_status: SourceProcessingStatus;
  page_count: number | null;
  video_duration_seconds: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentSection = {
  id: string;
  source_file_id: string;
  user_id: string;
  section_title: string;
  section_number: number;
  page_start: number | null;
  page_end: number | null;
  extracted_text: string;
  token_count: number;
  created_at: string;
};

export type ProcessingJobType =
  | "document_extract"
  | "video_transcribe"
  | "clip_detect"
  | "video_export";

export type ProcessingJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type ProcessingJob = {
  id: string;
  user_id: string;
  project_id: string;
  source_file_id: string | null;
  job_type: ProcessingJobType;
  status: ProcessingJobStatus;
  progress_percentage: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseDifficulty = "beginner" | "intermediate" | "advanced";
export type CourseStatus = "draft" | "ready" | "archived";

export type CourseSourceReference = {
  sectionId: string;
  sectionTitle: string;
  sectionNumber: number;
  pageStart: number | null;
  pageEnd: number | null;
};

export type Course = {
  id: string;
  user_id: string;
  project_id: string;
  source_file_id: string | null;
  title: string;
  description: string | null;
  target_audience: string | null;
  course_objective: string | null;
  duration_label: string | null;
  difficulty_level: CourseDifficulty;
  learning_outcomes: string[];
  quiz_suggestions: string[];
  source_references: CourseSourceReference[];
  status: CourseStatus;
  created_at: string;
  updated_at: string;
};

export type CourseModule = {
  id: string;
  user_id: string;
  course_id: string;
  title: string;
  description: string | null;
  position: number;
  source_references: CourseSourceReference[];
  created_at: string;
  updated_at: string;
};

export type CourseLesson = {
  id: string;
  user_id: string;
  module_id: string;
  title: string;
  learning_objectives: string[];
  lesson_content: string;
  position: number;
  source_references: CourseSourceReference[];
  created_at: string;
  updated_at: string;
};

export type GeneratedContentType =
  | "linkedin_post"
  | "instagram_caption"
  | "x_thread"
  | "youtube_script"
  | "tiktok_script"
  | "newsletter"
  | "blog_outline"
  | "social_post"
  | "video_script"
  | "blog"
  | "devotional"
  | "course_outline"
  | "lesson"
  | "quiz"
  | "workbook"
  | "title"
  | "description"
  | "hashtags";

export type GenerationStatus = "draft" | "ready" | "archived";

export type GeneratedContent = {
  id: string;
  user_id: string;
  project_id: string;
  source_file_id: string | null;
  content_type: GeneratedContentType;
  title: string;
  body: string;
  tone: string | null;
  length_label: string | null;
  target_audience: string | null;
  call_to_action: string | null;
  platform: string | null;
  generation_status: GenerationStatus;
  source_references: CourseSourceReference[];
  duplicated_from_id: string | null;
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
      source_files: {
        Row: SourceFile;
        Insert: {
          id?: string;
          user_id: string;
          project_id: string;
          original_filename: string;
          internal_storage_path: string;
          file_type: SourceFileType;
          mime_type: string;
          file_size: number;
          processing_status?: SourceProcessingStatus;
          page_count?: number | null;
          video_duration_seconds?: number | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          original_filename?: string;
          internal_storage_path?: string;
          file_type?: SourceFileType;
          mime_type?: string;
          file_size?: number;
          processing_status?: SourceProcessingStatus;
          page_count?: number | null;
          video_duration_seconds?: number | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      document_sections: {
        Row: DocumentSection;
        Insert: {
          id?: string;
          source_file_id: string;
          user_id: string;
          section_title: string;
          section_number: number;
          page_start?: number | null;
          page_end?: number | null;
          extracted_text?: string;
          token_count?: number;
          created_at?: string;
        };
        Update: {
          section_title?: string;
          section_number?: number;
          page_start?: number | null;
          page_end?: number | null;
          extracted_text?: string;
          token_count?: number;
        };
        Relationships: [];
      };
      processing_jobs: {
        Row: ProcessingJob;
        Insert: {
          id?: string;
          user_id: string;
          project_id: string;
          source_file_id?: string | null;
          job_type: ProcessingJobType;
          status?: ProcessingJobStatus;
          progress_percentage?: number;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: ProcessingJobStatus;
          progress_percentage?: number;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      courses: {
        Row: Course;
        Insert: {
          id?: string;
          user_id: string;
          project_id: string;
          source_file_id?: string | null;
          title: string;
          description?: string | null;
          target_audience?: string | null;
          course_objective?: string | null;
          duration_label?: string | null;
          difficulty_level?: CourseDifficulty;
          learning_outcomes?: string[];
          quiz_suggestions?: string[];
          source_references?: CourseSourceReference[];
          status?: CourseStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          target_audience?: string | null;
          course_objective?: string | null;
          duration_label?: string | null;
          difficulty_level?: CourseDifficulty;
          learning_outcomes?: string[];
          quiz_suggestions?: string[];
          source_references?: CourseSourceReference[];
          status?: CourseStatus;
        };
        Relationships: [];
      };
      course_modules: {
        Row: CourseModule;
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          title: string;
          description?: string | null;
          position: number;
          source_references?: CourseSourceReference[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          position?: number;
          source_references?: CourseSourceReference[];
        };
        Relationships: [];
      };
      course_lessons: {
        Row: CourseLesson;
        Insert: {
          id?: string;
          user_id: string;
          module_id: string;
          title: string;
          learning_objectives?: string[];
          lesson_content?: string;
          position: number;
          source_references?: CourseSourceReference[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          learning_objectives?: string[];
          lesson_content?: string;
          position?: number;
          source_references?: CourseSourceReference[];
        };
        Relationships: [];
      };
      generated_content: {
        Row: GeneratedContent;
        Insert: {
          id?: string;
          user_id: string;
          project_id: string;
          source_file_id?: string | null;
          content_type: GeneratedContentType;
          title: string;
          body?: string;
          tone?: string | null;
          length_label?: string | null;
          target_audience?: string | null;
          call_to_action?: string | null;
          platform?: string | null;
          generation_status?: GenerationStatus;
          source_references?: CourseSourceReference[];
          duplicated_from_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          body?: string;
          tone?: string | null;
          length_label?: string | null;
          target_audience?: string | null;
          call_to_action?: string | null;
          platform?: string | null;
          generation_status?: GenerationStatus;
          source_references?: CourseSourceReference[];
          duplicated_from_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      project_type: ProjectType;
      project_status: ProjectStatus;
      source_file_type: SourceFileType;
      source_processing_status: SourceProcessingStatus;
      processing_job_type: ProcessingJobType;
      processing_job_status: ProcessingJobStatus;
      course_difficulty: CourseDifficulty;
      course_status: CourseStatus;
      generated_content_type: GeneratedContentType;
      generation_status: GenerationStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
