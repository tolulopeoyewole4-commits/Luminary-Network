import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { videos: true } } },
  });
  return NextResponse.json({ projects });
}

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  description: z.string().max(500).optional().default(""),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const project = await prisma.project.create({
    data: { title: parsed.data.title, description: parsed.data.description },
  });
  return NextResponse.json({ project }, { status: 201 });
}
