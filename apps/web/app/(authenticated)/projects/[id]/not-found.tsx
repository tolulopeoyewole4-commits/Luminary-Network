import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <div className="surface-card mx-auto max-w-lg px-6 py-8 text-center">
      <h1 className="font-display text-3xl font-semibold">Project not found</h1>
      <p className="mt-3 text-sm text-muted">
        This project does not exist or you do not have access to it.
      </p>
      <Link href="/projects" className="btn-primary mt-6 inline-flex">
        Back to projects
      </Link>
    </div>
  );
}
