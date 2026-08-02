import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NewProjectForm } from "@/components/NewProjectForm";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { videos: true } } },
  });

  return (
    <div className="space-y-10">
      <section className="text-center space-y-4 py-6">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-fuchsia-400 via-white to-cyan-300 bg-clip-text text-transparent">
          Turn ideas into video
        </h1>
        <p className="text-white/60 max-w-2xl mx-auto">
          Create videos from text, edit short clips, and convert full scripts
          into films — all rendered right here. Start by creating a project.
        </p>
      </section>

      <section className="grid gap-8 md:grid-cols-[360px_1fr]">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="font-semibold text-lg mb-4">New project</h2>
          <NewProjectForm />
        </div>

        <div>
          <h2 className="font-semibold text-lg mb-4">
            Your projects{" "}
            <span className="text-white/40">({projects.length})</span>
          </h2>
          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/15 p-10 text-center text-white/50">
              No projects yet. Create your first project to start generating
              videos.
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="block rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-white/30 hover:bg-white/10"
                  >
                    <div className="font-semibold">{project.title}</div>
                    {project.description && (
                      <p className="mt-1 text-sm text-white/50 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    <div className="mt-3 text-xs text-white/40">
                      {project._count.videos} video
                      {project._count.videos === 1 ? "" : "s"}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
