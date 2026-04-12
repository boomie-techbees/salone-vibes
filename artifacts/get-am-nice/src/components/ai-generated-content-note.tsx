import { cn } from "@/lib/utils";

type AiGeneratedContentNoteProps = {
  className?: string;
  /** Short reminder for submit flows (e.g. event form after flyer scan). */
  variant?: "default" | "confirm";
};

export function AiGeneratedContentNote({
  className,
  variant = "default",
}: AiGeneratedContentNoteProps) {
  if (variant === "confirm") {
    return (
      <div
        className={cn("text-xs text-muted-foreground/75 leading-relaxed", className)}
        role="note"
      >
        <p className="text-balance">
          Please confirm details before submitting — AI-filled fields may contain errors.
        </p>
      </div>
    );
  }

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
