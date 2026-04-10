import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { MapPin, Calendar as CalendarIcon, Ticket, Plus, Check } from "lucide-react";

import { useListEvents, useSubmitEvent, getListEventsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

const submitEventSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().optional(),
  location: z.string().min(2, "Location is required"),
  city: z.string().optional(),
  country: z.string().optional(),
  eventDate: z.string().min(1, "Date is required"),
  venue: z.string().optional(),
  ticketUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
});

type SubmitEventValues = z.infer<typeof submitEventSchema>;

export function Events() {
  const [locationFilter, setLocationFilter] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");

  // Simple debounce for filter
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilter(locationFilter), 500);
    return () => clearTimeout(timer);
  }, [locationFilter]);

  const { data: events, isLoading } = useListEvents(
    debouncedFilter ? { location: debouncedFilter } : {},
    { query: { queryKey: getListEventsQueryKey(debouncedFilter ? { location: debouncedFilter } : {}) } }
  );

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-clash text-4xl font-bold text-foreground mb-2">Salone Events</h1>
          <p className="text-muted-foreground text-lg">Find the best parties, concerts, and cultural gatherings.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Input 
            placeholder="Filter by city..." 
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="w-full md:w-48 bg-card border-primary/20 focus-visible:ring-primary"
          />
          <SubmitEventDialog />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse h-[300px]"></Card>
          ))}
        </div>
      ) : !events || events.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent p-12 text-center flex flex-col items-center justify-center">
          <CalendarIcon className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-clash font-bold mb-2">No events found</h3>
          <p className="text-muted-foreground mb-6">There are no upcoming events matching your criteria.</p>
          <SubmitEventDialog trigger={<Button>Submit an Event</Button>} />
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id} className="overflow-hidden hover:shadow-md transition-all border-border/60 hover:border-primary/40 group flex flex-col">
              <div className="bg-primary/5 p-6 border-b border-border/50 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-colors"></div>
                <div className="flex flex-col">
                  <span className="text-primary font-bold uppercase tracking-wider text-sm mb-1">
                    {format(new Date(event.eventDate), "MMM dd, yyyy")}
                  </span>
                  <h3 className="font-clash text-2xl font-bold text-foreground leading-tight line-clamp-2">
                    {event.title}
                  </h3>
                </div>
              </div>
              
              <CardContent className="p-6 flex-1 flex flex-col gap-4">
                <div className="flex items-start gap-3 text-muted-foreground">
                  <MapPin className="w-5 h-5 shrink-0 mt-0.5 text-secondary" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">{event.venue || "Venue TBA"}</p>
                    <p>{[event.city, event.country].filter(Boolean).join(", ") || event.location}</p>
                  </div>
                </div>
                
                {event.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3 mt-2">
                    {event.description}
                  </p>
                )}
              </CardContent>
              
              <CardFooter className="p-6 pt-0 mt-auto">
                {event.ticketUrl ? (
                  <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold group-hover:shadow-md transition-all">
                    <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer">
                      <Ticket className="w-4 h-4 mr-2" /> Get Tickets
                    </a>
                  </Button>
                ) : (
                  <Button variant="outline" disabled className="w-full">
                    Tickets Unavailable
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SubmitEventDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const submitMutation = useSubmitEvent();

  const form = useForm<SubmitEventValues>({
    resolver: zodResolver(submitEventSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      city: "",
      country: "",
      eventDate: "",
      venue: "",
      ticketUrl: "",
    },
  });

  const onSubmit = (data: SubmitEventValues) => {
    submitMutation.mutate({ data }, {
      onSuccess: () => {
        toast({
          title: "Event Submitted!",
          description: "Your event has been submitted and will appear once approved.",
        });
        setOpen(false);
        form.reset();
        // Invalidate events list
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Submission Failed",
          description: "There was a problem submitting your event. Please try again.",
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="border-primary/30 hover:bg-primary/10 text-primary whitespace-nowrap">
            <Plus className="w-4 h-4 mr-1" /> Add Event
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-clash text-2xl">Submit an Event</DialogTitle>
          <DialogDescription>
            Know about a Salone event? Share it with the community.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Freetown Music Festival" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="eventDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="venue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venue</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. National Stadium" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Freetown" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Sierra Leone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Display String *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Freetown, SL" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="ticketUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ticket URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." type="url" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tell us more about the event..." 
                        className="resize-none h-24"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                >
                  {submitMutation.isPending ? "Submitting..." : "Submit Event"}
                </Button>
              </div>
            </form>
          </Form>
      </DialogContent>
    </Dialog>
  );
}
