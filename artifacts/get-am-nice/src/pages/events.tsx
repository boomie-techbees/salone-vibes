import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { MapPin, Calendar as CalendarIcon, Ticket, Plus, Upload, X, Sparkles, Loader2, Trash2, Pencil } from "lucide-react";

import { useListEvents, useSubmitEvent, useUpdateEvent, useDeleteEvent, getListEventsQueryKey } from "@workspace/api-client-react";
import type { Event } from "@workspace/api-client-react";
import { useUser } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

const submitEventSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().optional(),
  location: z.string().min(2, "Location is required"),
  address: z.string().optional(),
  eventDate: z.string().min(1, "Date is required"),
  venue: z.string().optional(),
  ticketUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type SubmitEventValues = z.infer<typeof submitEventSchema>;

type ExtractedFields = {
  title?: string | null;
  description?: string | null;
  date?: string | null;
  time?: string | null;
  venue?: string | null;
  street?: string | null;
  city?: string | null;
  country?: string | null;
  location?: string | null;
  ticketUrl?: string | null;
  artists?: string | null;
};

const MAX_IMAGE_PX = 1200;
const IMAGE_QUALITY = 0.85;

function resizeAndEncodeImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = img;
        const scale = w > MAX_IMAGE_PX ? MAX_IMAGE_PX / w : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
        const [header, base64] = dataUrl.split(",");
        const mimeType = header.replace("data:", "").replace(";base64", "");
        resolve({ base64, mimeType });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function toDateInputValue(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function FlyerUpload({
  onExtracted,
  onClear,
}: {
  onExtracted: (fields: ExtractedFields) => void;
  onClear: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.match(/^image\/(jpeg|jpg|png|webp|gif)$/)) {
        setError("Please upload a JPG or PNG image.");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("Image must be under 10MB.");
        return;
      }

      setError(null);
      setExtracted(false);
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      setIsExtracting(true);

      try {
        const { base64, mimeType } = await resizeAndEncodeImage(file);
        const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
        const res = await fetch(`${basePath}/api/events/extract-flyer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mimeType }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to analyse flyer");
        }

        const data: ExtractedFields = await res.json();
        onExtracted(data);
        setExtracted(true);
        toast({ title: "Flyer scanned!", description: "Details filled in below — review and edit before submitting." });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Could not extract details";
        setError(msg);
        toast({ variant: "destructive", title: "Scan failed", description: msg });
      } finally {
        setIsExtracting(false);
      }
    },
    [onExtracted, toast]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const clear = () => {
    setPreview(null);
    setExtracted(false);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onClear();
  };

  if (preview) {
    return (
      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 overflow-hidden">
        <div className="flex items-start gap-3 p-3">
          <img
            src={preview}
            alt="Event flyer preview"
            className="w-20 h-20 object-cover rounded-lg shrink-0 border border-border/50"
          />
          <div className="flex-1 min-w-0">
            {isExtracting ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Reading your flyer…</span>
              </div>
            ) : extracted ? (
              <div className="flex items-center gap-1.5 text-sm text-primary font-medium mt-1">
                <Sparkles className="w-4 h-4" />
                <span>Details extracted — check the form below</span>
              </div>
            ) : error ? (
              <p className="text-sm text-destructive mt-1">{error}</p>
            ) : null}
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground" onClick={clear}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-colors cursor-pointer group"
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        className="hidden"
        onChange={handleInputChange}
      />
      <div className="flex flex-col items-center justify-center py-5 px-4 text-center gap-2">
        <div className="rounded-full bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
          <Upload className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Upload a flyer to auto-fill the form</p>
          <p className="text-xs text-muted-foreground mt-0.5">JPG or PNG · Drag & drop or click to browse</p>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}

function SubmitEventDialog({ trigger, eventToEdit, onClose }: { trigger?: React.ReactNode; eventToEdit?: Event; onClose?: () => void }) {
  const isEditing = !!eventToEdit;
  const [open, setOpen] = useState(isEditing);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const submitMutation = useSubmitEvent();
  const updateMutation = useUpdateEvent();

  const form = useForm<SubmitEventValues>({
    resolver: zodResolver(submitEventSchema),
    defaultValues: isEditing ? {
      title: eventToEdit.title,
      description: eventToEdit.description ?? "",
      location: eventToEdit.location,
      address: eventToEdit.city ?? "",
      eventDate: String(eventToEdit.eventDate).slice(0, 10),
      venue: eventToEdit.venue ?? "",
      ticketUrl: eventToEdit.ticketUrl ?? "",
    } : {
      title: "",
      description: "",
      location: "",
      address: "",
      eventDate: "",
      venue: "",
      ticketUrl: "",
    },
  });

  const handleExtracted = useCallback(
    (data: ExtractedFields) => {
      const filled = new Set<string>();

      const set = (field: keyof SubmitEventValues, value: string | null | undefined) => {
        if (value) {
          form.setValue(field, value, { shouldDirty: true });
          filled.add(field);
        }
      };

      set("title", data.title);
      set("description", data.artists ? `${data.artists}${data.description ? ` · ${data.description}` : ""}` : data.description);
      set("venue", data.venue);
      set("eventDate", toDateInputValue(data.date));
      set("ticketUrl", data.ticketUrl);

      const line1 = data.street || "";
      const line2 = [data.city, data.country].filter(Boolean).join(", ");
      const addrClean = [line1, line2].filter(Boolean).join("\n");
      if (addrClean) {
        form.setValue("address", addrClean, { shouldDirty: true });
        filled.add("address");
      }

      const loc = data.location || [data.street, line2].filter(Boolean).join(", ") || data.venue || "";
      if (loc) {
        form.setValue("location", loc, { shouldDirty: true });
        filled.add("location");
      }

      setAutoFilledFields(filled);
    },
    [form]
  );

  const handleClear = useCallback(() => {
    form.reset();
    setAutoFilledFields(new Set());
  }, [form]);

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const onSubmit = (data: SubmitEventValues) => {
    const { address, ...rest } = data;
    const body = { ...rest, city: address || undefined };

    if (isEditing) {
      updateMutation.mutate(
        { id: eventToEdit.id, data: body },
        {
          onSuccess: () => {
            toast({ title: "Event Updated!", description: "Your changes have been saved." });
            queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
            handleClose();
          },
          onError: () => {
            toast({ variant: "destructive", title: "Update Failed", description: "There was a problem saving your changes. Please try again." });
          },
        }
      );
    } else {
      submitMutation.mutate(
        { data: body },
        {
          onSuccess: () => {
            toast({ title: "Event Submitted!", description: "Your event has been added to the community calendar." });
            setOpen(false);
            form.reset();
            setAutoFilledFields(new Set());
            queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
          },
          onError: () => {
            toast({ variant: "destructive", title: "Submission Failed", description: "There was a problem submitting your event. Please try again." });
          },
        }
      );
    }
  };

  const isPending = submitMutation.isPending || updateMutation.isPending;

  const isAutoFilled = (field: string) => autoFilledFields.has(field);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else setOpen(true); }}>
      {!isEditing && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" className="border-primary/30 hover:bg-primary/10 text-primary whitespace-nowrap">
              <Plus className="w-4 h-4 mr-1" /> Add Event
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-clash text-2xl">{isEditing ? "Edit Event" : "Submit an Event"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details below. Changes are saved immediately."
              : "Know about a Salone event? Upload a flyer to auto-fill the details, or fill in the form manually."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          <FlyerUpload onExtracted={handleExtracted} onClear={handleClear} />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Event Title *
                      {isAutoFilled("title") && <AutoBadge />}
                    </FormLabel>
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
                      <FormLabel className="flex items-center gap-2">
                        Date *
                        {isAutoFilled("eventDate") && <AutoBadge />}
                      </FormLabel>
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
                      <FormLabel className="flex items-center gap-2">
                        Venue
                        {isAutoFilled("venue") && <AutoBadge />}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. National Stadium" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Address
                      {isAutoFilled("address") && <AutoBadge />}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={"123 Main St\nFreetown, Sierra Leone"}
                        className="resize-none h-16 leading-snug"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Location Display *
                      {isAutoFilled("location") && <AutoBadge />}
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Freetown, Sierra Leone" {...field} />
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
                    <FormLabel className="flex items-center gap-2">
                      Ticket URL
                      {isAutoFilled("ticketUrl") && <AutoBadge />}
                    </FormLabel>
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
                    <FormLabel className="flex items-center gap-2">
                      Description / Artists
                      {isAutoFilled("description") && <AutoBadge />}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Artists, lineup, or event details…"
                        className="resize-none h-20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-2 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                >
                  {isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {isEditing ? "Saving…" : "Submitting…"}</>
                  ) : (
                    isEditing ? "Save Changes" : "Submit Event"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AutoBadge() {
  return (
    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal gap-1 bg-primary/10 text-primary border-0">
      <Sparkles className="w-2.5 h-2.5" />
      Auto-filled
    </Badge>
  );
}

function EditEventButton({ event }: { event: Event }) {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
        onClick={() => setEditing(true)}
      >
        <Pencil className="w-4 h-4" />
      </Button>
      {editing && (
        <SubmitEventDialog eventToEdit={event} onClose={() => setEditing(false)} />
      )}
    </>
  );
}

function DeleteEventButton({ eventId, eventTitle }: { eventId: number; eventTitle: string }) {
  const { toast } = useToast();
  const deleteMutation = useDeleteEvent();

  const handleDelete = () => {
    deleteMutation.mutate({ id: eventId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
        toast({ title: "Event deleted", description: `"${eventTitle}" has been removed.` });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Delete failed", description: "Could not delete this event. Please try again." });
      },
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this event?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove <span className="font-medium text-foreground">"{eventTitle}"</span> from the community calendar. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Event
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function Events() {
  const { user } = useUser();
  const currentClerkId = user?.id ?? null;
  const isAdminUser = user?.publicMetadata?.role === "admin";
  const [locationFilter, setLocationFilter] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");

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
            <Card key={i} className="animate-pulse h-[300px]" />
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
            <Card key={event.id} className="overflow-hidden hover:shadow-md transition-all border-border/60 hover:border-primary/40 flex flex-col">
              <div className="bg-primary/5 p-6 border-b border-border/50 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-xl" />
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="text-primary font-bold uppercase tracking-wider text-sm mb-1">
                      {format(new Date(String(event.eventDate).slice(0, 10) + "T12:00:00"), "MMM dd, yyyy")}
                    </span>
                    <h3 className="font-clash text-2xl font-bold text-foreground leading-tight line-clamp-2">
                      {event.title}
                    </h3>
                  </div>
                  {(isAdminUser || (currentClerkId && currentClerkId === event.submittedBy)) && (
                    <div className="shrink-0 pt-0.5 flex gap-1">
                      <EditEventButton event={event} />
                      <DeleteEventButton eventId={event.id} eventTitle={event.title} />
                    </div>
                  )}
                </div>
              </div>

              <CardContent className="p-6 flex-1 flex flex-col gap-4">
                <div className="flex items-start gap-3 text-muted-foreground">
                  <MapPin className="w-5 h-5 shrink-0 mt-0.5 text-secondary" />
                  <div className="text-sm">
                    {(() => {
                      const storedAddress = (event.city || "").trim();
                      const addressLines = storedAddress
                        ? storedAddress.split("\n").map((l) => l.trim()).filter(Boolean)
                        : [event.location || ""].filter(Boolean);
                      const mapsQuery = [event.venue, storedAddress.replace(/\n/g, ", "), event.country]
                        .filter(Boolean).join(", ") || event.location || "";
                      const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(mapsQuery)}`;
                      const hasAddress = mapsQuery.length > 0;
                      const content = (
                        <>
                          <p className="font-medium text-foreground group-hover/map:text-primary transition-colors">{event.venue || "Venue TBA"}</p>
                          {addressLines.map((line, i) => (
                            <p key={i} className="group-hover/map:text-primary transition-colors underline-offset-2 group-hover/map:underline">{line}</p>
                          ))}
                        </>
                      );
                      return hasAddress ? (
                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="group/map">{content}</a>
                      ) : (
                        <div>{content}</div>
                      );
                    })()}
                  </div>
                </div>
                {event.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3 mt-2">{event.description}</p>
                )}
              </CardContent>

              <CardFooter className="p-6 pt-0 mt-auto">
                {event.ticketUrl && (
                  <Button asChild className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-bold group-hover:shadow-md transition-all">
                    <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer">
                      <Ticket className="w-4 h-4 mr-2" /> Get Tickets
                    </a>
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
