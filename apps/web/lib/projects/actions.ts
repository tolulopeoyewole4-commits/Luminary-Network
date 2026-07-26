"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { ProjectActionState } from "@/lib/projects/types";
import {
  hasProjectFieldErrors,
  normalizeProjectForm,
  validateProjectForm,
} from "@/lib/projects/validation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function createProjectAction(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const input = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    projectType: String(formData.get("projectType") ?? ""),
  };

  const fieldErrors = validateProjectForm(input);
  if (hasProjectFieldErrors(fieldErrors)) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const normalized = normalizeProjectForm(input);
  if (!normalized) {
    return { ok: false, message: "Invalid project details." };
  }

  const { supabase, user } = await requireUser();

  const maxProjects = Number(process.env.MAX_PROJECTS_PER_USER ?? "10");
  if (Number.isFinite(maxProjects) && maxProjects > 0) {
    const { count, error: countError } = await supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");

    if (countError) {
      console.error("Failed to count projects", countError.message);
      return {
        ok: false,
        message: "Unable to create the project. Please try again.",
      };
    }

    if ((count ?? 0) >= maxProjects) {
      return {
        ok: false,
        message: `You can have up to ${maxProjects} active projects. Archive or delete one to continue.`,
      };
    }
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      name: normalized.name,
      description: normalized.description,
      project_type: normalized.projectType,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Failed to create project", error?.message);
    return {
      ok: false,
      message:
        error?.message?.includes("projects_name")
          ? "Project name is invalid."
          : "Unable to create the project. Please try again.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  redirect(`/projects/${data.id}`);
}

export async function updateProjectAction(
  projectId: string,
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const input = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    projectType: String(formData.get("projectType") ?? ""),
  };

  const fieldErrors = validateProjectForm(input);
  if (hasProjectFieldErrors(fieldErrors)) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  const normalized = normalizeProjectForm(input);
  if (!normalized) {
    return { ok: false, message: "Invalid project details." };
  }

  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("projects")
    .update({
      name: normalized.name,
      description: normalized.description,
      project_type: normalized.projectType,
    })
    .eq("id", projectId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to update project", error.message);
    return {
      ok: false,
      message: "Unable to save changes. Please try again.",
    };
  }

  if (!data) {
    return {
      ok: false,
      message: "Project not found or you do not have access.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function archiveProjectAction(
  projectId: string,
): Promise<ProjectActionState> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("projects")
    .update({ status: "archived" })
    .eq("id", projectId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to archive project", error.message);
    return { ok: false, message: "Unable to archive this project." };
  }

  if (!data) {
    return {
      ok: false,
      message: "Project not found or you do not have access.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { ok: true, message: "Project archived." };
}

export async function restoreProjectAction(
  projectId: string,
): Promise<ProjectActionState> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("projects")
    .update({ status: "active" })
    .eq("id", projectId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to restore project", error.message);
    return { ok: false, message: "Unable to restore this project." };
  }

  if (!data) {
    return {
      ok: false,
      message: "Project not found or you do not have access.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { ok: true, message: "Project restored." };
}

export async function deleteProjectAction(
  projectId: string,
): Promise<ProjectActionState> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Failed to delete project", error.message);
    return { ok: false, message: "Unable to delete this project." };
  }

  if (!data) {
    return {
      ok: false,
      message: "Project not found or you do not have access.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  redirect("/projects");
}
