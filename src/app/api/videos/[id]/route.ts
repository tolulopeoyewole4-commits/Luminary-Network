import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/videos/[id]">,
) {
  const { id } = await ctx.params;
  const video = await prisma.video.findUnique({
    where: { id },
    include: {
      scenes: { orderBy: { index: "asc" } },
      project: true,
    },
  });
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }
  return NextResponse.json({ video });
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/videos/[id]">,
) {
  const { id } = await ctx.params;
  await prisma.video.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
