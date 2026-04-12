import { useGetTermOfTheDay, getGetTermOfTheDayQueryKey, useGetUpcomingEventsPreview, getGetUpcomingEventsPreviewQueryKey } from "@workspace/api-client-react";
import { Show, useAuth } from "@clerk/react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AiGeneratedContentNote } from "@/components/ai-generated-content-note";
import { BookA, Calendar, ArrowRight, Loader2, Music } from "lucide-react";
import { format } from "date-fns";
import { eventDetailHref } from "@/lib/event-maps";
import { EventStashButton } from "@/components/event-stash-button";

export function Home() {
  return (
    <div className="flex flex-col gap-8 pb-16">
      <Show when="signed-out">
        <section className="bg-primary text-primary-foreground -mx-4 -mt-4 px-4 py-16 md:px-8 md:-mx-8 md:-mt-8 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent mix-blend-overlay"></div>
          <div className="max-w-3xl mx-auto relative z-10 text-center space-y-6">
            <h1 className="font-clash text-5xl md:text-7xl font-bold tracking-tight">
              Get Am Nice.
            </h1>
            <p className="text-xl md:text-2xl font-medium text-primary-foreground/90 max-w-2xl mx-auto leading-relaxed">
              Your cultural plug to Salone music, slang, and lifestyle. Connect with the culture, wherever you are.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/sign-up" className="w-full sm:w-auto px-8 py-3 bg-accent text-accent-foreground font-bold rounded-full hover:bg-accent/90 transition-colors shadow-lg text-lg">
                Build Your Stash
              </Link>
              <Link href="/dictionary" className="w-full sm:w-auto px-8 py-3 bg-primary-foreground/10 text-primary-foreground font-bold rounded-full hover:bg-primary-foreground/20 transition-colors border-2 border-primary-foreground/20 text-lg">
                Browse Dictionary
              </Link>
            </div>
          </div>
        </section>
      </Show>

      <Show when="signed-in">
        <section className="mb-4">
          <h1 className="font-clash text-3xl font-bold tracking-tight mb-2">Welcome Back.</h1>
          <p className="text-muted-foreground text-lg">What's happening in the culture today?</p>
        </section>
      </Show>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-clash text-2xl font-bold flex items-center gap-2">
              <BookA className="text-accent" /> Word of the Day
            </h2>
            <Link href="/dictionary" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              View Lexicon <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <TermOfTheDayCard />
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-clash text-2xl font-bold flex items-center gap-2">
              <Calendar className="text-secondary" /> Upcoming Events
            </h2>
            <Link href="/events" className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
              All Events <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <UpcomingEventsPreview />
        </section>
      </div>

      <section className="bg-secondary text-secondary-foreground rounded-3xl p-8 relative overflow-hidden mt-4">
        <div className="absolute -right-8 -bottom-8 opacity-20">
          <Music className="w-48 h-48" />
        </div>
        <div className="relative z-10">
          <h2 className="font-clash text-3xl font-bold mb-4">Discover Salone Artists</h2>
          <p className="text-lg mb-6 max-w-md text-secondary-foreground/90">
            From Freetown to the world. Explore the artists pushing Sierra Leonean music forward.
          </p>
          <Link href="/artists" className="inline-flex items-center justify-center px-6 py-3 bg-white text-secondary font-bold rounded-full hover:bg-gray-100 transition-colors shadow-sm">
            Explore Artists
          </Link>
        </div>
      </section>
    </div>
  );
}

function TermOfTheDayCard() {
  const { data: term, isLoading } = useGetTermOfTheDay({
    query: { queryKey: getGetTermOfTheDayQueryKey() }
  });

  if (isLoading) {
    return (
      <Card className="border-2 border-border/50 bg-card/50 shadow-sm animate-pulse">
        <CardContent className="p-8 flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!term) {
    return (
      <Card className="border-2 border-border/50 bg-card/50 shadow-sm">
        <CardContent className="p-8 text-center text-muted-foreground">
          No term available today. Check back later!
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent shadow-sm overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-4 -mt-4"></div>
      <CardHeader className="pb-2">
        <div className="flex items-baseline gap-3 mb-1">
          <CardTitle className="text-4xl font-clash text-primary">{term.term}</CardTitle>
          {term.pronunciation && (
            <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
              {term.pronunciation}
            </span>
          )}
        </div>
        {term.partOfSpeech && (
          <CardDescription className="font-medium text-primary/70 italic">
            {term.partOfSpeech}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4 relative z-10">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">Definition</h4>
          <p className="text-lg leading-relaxed">{term.definition}</p>
        </div>
        {term.culturalContext && (
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-1">Cultural Context</h4>
            <p className="text-muted-foreground leading-relaxed">{term.culturalContext}</p>
          </div>
        )}
        <div className="pt-4 space-y-3">
          <div className="flex justify-end">
            <Link href="/dictionary">
              <Button variant="outline" className="rounded-full border-primary/20 hover:bg-primary/10 hover:text-primary">
                Look up another word
              </Button>
            </Link>
          </div>
          <AiGeneratedContentNote className="border-t border-border/30 pt-3" />
        </div>
      </CardContent>
    </Card>
  );
}

function UpcomingEventsPreview() {
  const { isSignedIn } = useAuth();
  const { data: events, isLoading } = useGetUpcomingEventsPreview({
    query: { queryKey: getGetUpcomingEventsPreviewQueryKey() }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 flex gap-4 h-[100px]"></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Card className="border-2 border-border/50 border-dashed">
        <CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
          <Calendar className="w-8 h-8 opacity-50" />
          <p>No upcoming events found.</p>
          <Link href={isSignedIn ? "/events" : "/sign-in"}>
            <Button variant="link" className="text-primary mt-2">
              {isSignedIn ? "Submit an event" : "Sign in to submit an event"}
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div key={event.id} className="relative">
          <Link
            href={eventDetailHref(event.id)}
            className="block text-inherit no-underline rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={`${event.title} — view event details`}
          >
            <Card className="overflow-hidden hover:shadow-md transition-shadow group border-border/50 cursor-pointer rounded-xl">
              <CardContent className="p-0 flex">
                <div className="bg-secondary/10 w-24 flex flex-col items-center justify-center p-2 text-center border-r border-border/50">
                  <span className="text-xs font-bold text-secondary uppercase tracking-widest">
                    {format(new Date(String(event.eventDate).slice(0, 10) + "T12:00:00"), "MMM")}
                  </span>
                  <span className="text-2xl font-clash font-bold text-secondary">
                    {format(new Date(String(event.eventDate).slice(0, 10) + "T12:00:00"), "dd")}
                  </span>
                </div>
                <div className="p-4 flex-1 pr-14">
                  <h3 className="font-bold text-lg leading-tight mb-1 group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    {event.venue && `${event.venue}, `}{event.city || event.location}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <div
            className="absolute top-2 right-2 z-10"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <EventStashButton eventId={event.id} compact />
          </div>
        </div>
      ))}
    </div>
  );
}
