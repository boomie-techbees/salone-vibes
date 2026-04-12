import { Link, useRoute } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, Calendar as CalendarIcon, MapPin, Ticket, Users } from "lucide-react";
import { useGetEvent, getGetEventQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getEventAddressLines, getEventMapsQuery, getEventMapsUrl } from "@/lib/event-maps";
import { EventStashButton } from "@/components/event-stash-button";

function formatEventSchedule(eventDate: string): { dateLine: string; timeLine: string } {
  const raw = String(eventDate);
  const ymd = raw.slice(0, 10);
  const datePart = new Date(`${ymd}T12:00:00`);
  const full = new Date(raw);
  const isLikelyDateOnly =
    !Number.isNaN(full.getTime()) &&
    full.getUTCHours() === 0 &&
    full.getUTCMinutes() === 0 &&
    full.getUTCSeconds() === 0;
  return {
    dateLine: format(datePart, "EEEE, MMMM d, yyyy"),
    timeLine: isLikelyDateOnly ? "Time to be announced" : format(full, "h:mm a"),
  };
}

export function EventDetail() {
  const [, params] = useRoute("/events/:id");
  const idRaw = params?.id;
  const id = idRaw ? Number(idRaw) : NaN;
  const validId = Number.isInteger(id) && id > 0;

  const { data: event, isLoading, isError, error } = useGetEvent(id, {
    query: {
      queryKey: getGetEventQueryKey(id),
      enabled: validId,
    },
  });

  if (!validId) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <BackLink />
        <Card className="border-destructive/30">
          <CardContent className="p-8 text-center text-muted-foreground">
            Invalid event link.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
        <div className="h-40 bg-muted animate-pulse rounded-xl" />
        <div className="h-32 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <BackLink />
        <Card className="border-border/60">
          <CardContent className="p-8 text-center space-y-3">
            <p className="text-muted-foreground">
              {error ? "This event is no longer available or could not be loaded." : "Could not load this event."}
            </p>
            <Button asChild variant="outline">
              <Link href="/events">Back to events</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { dateLine, timeLine } = formatEventSchedule(event.eventDate);
  const mapsQuery = getEventMapsQuery(event);
  const mapsUrl = getEventMapsUrl(event);
  const addressLines = getEventAddressLines(event);
  const hasMapsLink = mapsQuery.length > 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex flex-wrap items-center gap-3">
        <BackLink />
        <div className="ml-auto shrink-0">
          <EventStashButton eventId={event.id} />
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-primary/5 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative space-y-3">
          <p className="text-primary font-bold uppercase tracking-wider text-sm flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            {dateLine}
          </p>
          <h1 className="font-clash text-3xl md:text-4xl font-bold text-foreground leading-tight">
            {event.title}
          </h1>
          <p className="text-base text-muted-foreground">{timeLine}</p>
        </div>
      </div>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardContent className="p-6 md:p-8 space-y-8">
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-secondary" />
              Location
            </h2>
            {hasMapsLink ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-col gap-0.5 text-foreground underline-offset-4 hover:underline hover:text-primary transition-colors"
              >
                <span className="font-medium text-lg">{event.venue || "Venue to be announced"}</span>
                {addressLines.map((line, i) => (
                  <span key={i} className="text-base font-normal">
                    {line}
                  </span>
                ))}
                <span className="text-sm text-primary mt-1">Open in Google Maps →</span>
              </a>
            ) : (
              <p className="text-muted-foreground">Location not listed.</p>
            )}
          </section>

          {(event.performingArtists?.trim() || event.description?.trim()) && (
            <section className="space-y-4">
              {event.performingArtists?.trim() ? (
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-secondary" />
                    Artists
                  </h2>
                  <p className="text-base leading-relaxed whitespace-pre-wrap">{event.performingArtists.trim()}</p>
                </div>
              ) : null}
              {event.description?.trim() ? (
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">About</h2>
                  <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {event.description.trim()}
                  </p>
                </div>
              ) : null}
            </section>
          )}

          {!event.performingArtists?.trim() && !event.description?.trim() ? (
            <p className="text-sm text-muted-foreground">No description added for this event yet.</p>
          ) : null}

          {event.ticketUrl ? (
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 font-bold"
            >
              <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer">
                <Ticket className="w-4 h-4 mr-2" />
                Get tickets
              </a>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/events"
      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
    >
      <ArrowLeft className="w-4 h-4" />
      Back to events
    </Link>
  );
}
