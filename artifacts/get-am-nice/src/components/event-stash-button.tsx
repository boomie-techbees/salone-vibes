import { Link } from "wouter";
import { useAuth } from "@clerk/react";
import { Archive, CheckCheck, Loader2 } from "lucide-react";
import {
  useListStashedEvents,
  useStashEvent,
  useUnstashEvent,
  getListStashedEventsQueryKey,
} from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type EventStashButtonProps = {
  eventId: number;
  /** Icon-only control for tight layouts (e.g. home preview cards). */
  compact?: boolean;
  className?: string;
};

export function EventStashButton({ eventId, compact, className }: EventStashButtonProps) {
  const { isSignedIn } = useAuth();
  const { toast } = useToast();

  const { data: stashed = [], isLoading: stashLoading } = useListStashedEvents({
    query: { queryKey: getListStashedEventsQueryKey(), enabled: !!isSignedIn },
  });

  const isSaved = stashed.some((s) => s.eventId === eventId);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListStashedEventsQueryKey() });

  const stashMutation = useStashEvent({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Stashed!" });
      },
      onError: () =>
        toast({ variant: "destructive", title: "Couldn't save to Stash" }),
    },
  });

  const unstashMutation = useUnstashEvent({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Removed from Stash" });
      },
      onError: () =>
        toast({ variant: "destructive", title: "Couldn't remove from Stash" }),
    },
  });

  if (!isSignedIn) {
    return (
      <Button
        asChild
        variant="outline"
        size={compact ? "icon" : "sm"}
        className={cn(compact ? "h-9 w-9 rounded-full shrink-0" : "rounded-full gap-2", className)}
      >
        <Link href="/sign-in" title="Sign in to stash events">
          <Archive className="w-4 h-4" />
          {!compact && "Stash It"}
        </Link>
      </Button>
    );
  }

  const isPending = stashMutation.isPending || unstashMutation.isPending;

  if (isSaved) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant={compact ? "secondary" : "secondary"}
            size={compact ? "icon" : "sm"}
            className={cn(
              compact ? "h-9 w-9 rounded-full shrink-0" : "rounded-full gap-2",
              className,
            )}
            disabled={isPending || stashLoading}
            title="Stashed — tap to remove"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4 text-primary" />
            )}
            {!compact && "Stashed"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this event from your stash?</AlertDialogTitle>
            <AlertDialogDescription>
              You can open the event again and tap Stash It anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
              onClick={() => unstashMutation.mutate({ eventId })}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Button
      variant="outline"
      size={compact ? "icon" : "sm"}
      className={cn(
        compact
          ? "h-9 w-9 rounded-full shrink-0 border-primary/40 hover:border-primary hover:bg-primary/5"
          : "rounded-full gap-2 border-primary/40 hover:border-primary hover:bg-primary/5",
        className,
      )}
      disabled={isPending || stashLoading}
      title="Save to My Stash"
      onClick={() => stashMutation.mutate({ data: { eventId } })}
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Archive className="w-4 h-4" />
      )}
      {!compact && "Stash It"}
    </Button>
  );
}
