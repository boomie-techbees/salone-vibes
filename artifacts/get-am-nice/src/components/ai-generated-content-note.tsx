import { cn } from "@/lib/utils";

export function AiGeneratedContentNote({ className }: { className?: string }) {
  return (
    <div
      className={cn("text-xs text-muted-foreground/75 leading-relaxed space-y-0.5", className)}
      role="note"
    >
      <p className="text-balance">AI-generated and may contain errors.</p>
      <p className="text-balance">Verify with native speakers when it matters.</p>
      <p className="text-balance">When in doubt, believe your Salone people.</p>
    </div>
  );
}
