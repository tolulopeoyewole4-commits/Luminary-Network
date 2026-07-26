import Link from "next/link";

import { EmptyState } from "@/components/ui/EmptyState";
import type { Course } from "@/types/database";

export function CourseList({
  projectId,
  courses,
}: {
  projectId: string;
  courses: Course[];
}) {
  if (courses.length === 0) {
    return (
      <EmptyState
        title="No courses yet"
        description="Generate a course outline from extracted document sections. Everything stays editable."
        action={
          <Link href={`/projects/${projectId}/courses/new`} className="btn-primary">
            Generate course
          </Link>
        }
      />
    );
  }

  return (
    <ul className="space-y-3">
      {courses.map((course) => (
        <li key={course.id}>
          <Link
            href={`/projects/${projectId}/courses/${course.id}`}
            className="surface-card block px-5 py-4 transition hover:bg-white"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-semibold">{course.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted">
                  {course.description || "No description yet."}
                </p>
              </div>
              <span className="rounded-lg bg-white/80 px-2.5 py-1 text-xs font-semibold capitalize text-muted ring-1 ring-[var(--border)]">
                {course.status} · {course.difficulty_level}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
