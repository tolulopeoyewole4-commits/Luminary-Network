import Link from "next/link";

type LogoProps = {
  href?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl md:text-5xl",
};

export function Logo({ href = "/", size = "md" }: LogoProps) {
  const content = (
    <span className={`font-display font-semibold tracking-tight text-foreground ${sizeClasses[size]}`}>
      Luminary{" "}
      <span className="text-accent">AI</span>
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="inline-block h-2.5 w-2.5 rounded-full bg-highlight shadow-[0_0_0_4px_rgba(201,162,39,0.18)]"
      />
      {content}
    </Link>
  );
}
