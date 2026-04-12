import { useState, useEffect, type ElementType, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link } from "wouter";
import { Show, useAuth } from "@clerk/react";
import {
  BookOpen,
  ChevronRight,
  PenLine,
  Trash2,
  Music2,
  Plus,
  Loader2,
  Archive,
  Star,
  Mic2,
  Lock,
  GripVertical,
  ChevronDown,
} from "lucide-react";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  useListLexicon,
  useUpdateLexiconEntry,
  useDeleteLexiconEntry,
  getListLexiconQueryKey,
  useListSongs,
  useCreateSong,
  useUpdateSong,
  useDeleteSong,
  getListSongsQueryKey,
  useListStashedArtists,
  useUnstashArtist,
  getListStashedArtistsQueryKey,
  useGetProfile,
  getGetProfileQueryKey,
  useUpdateStashSectionOrder,
} from "@workspace/api-client-react";
import type {
  LexiconEntry,
  Song,
  StashedArtistEntry,
  UserProfileStashSectionOrderItem,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// ─── Lexicon ────────────────────────────────────────────────────────────────

const editEntrySchema = z.object({
  definition: z.string().min(1, "Definition required"),
  culturalContext: z.string().min(1, "Context required"),
  usageExamplesText: z.string().optional(),
  notes: z.string().optional(),
});

function EditLexiconEntryDialog({ entry }: { entry: LexiconEntry }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const updateMutation = useUpdateLexiconEntry();

  const form = useForm<z.infer<typeof editEntrySchema>>({
    resolver: zodResolver(editEntrySchema),
    defaultValues: {
      definition: entry.definition || "",
      culturalContext: entry.culturalContext || "",
      usageExamplesText: (entry.usageExamples ?? []).join("\n"),
      notes: entry.notes || "",
    },
  });

  const onSubmit = (data: z.infer<typeof editEntrySchema>) => {
    const usageExamples = (data.usageExamplesText ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    updateMutation.mutate(
      { id: entry.id, data: { ...data, usageExamples } },
      {
        onSuccess: () => {
          toast({ title: "Entry updated" });
          setOpen(false);
          queryClient.invalidateQueries({ queryKey: getListLexiconQueryKey() });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Failed to update entry" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
          aria-label={`Edit ${entry.term}`}
        >
          <PenLine className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-clash text-2xl">
            Edit "{entry.term}"
          </DialogTitle>
          <DialogDescription>
            Correct any AI errors or add your own personal notes.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="definition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Definition</FormLabel>
                  <FormControl>
                    <Textarea className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="culturalContext"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cultural Context</FormLabel>
                  <FormControl>
                    <Textarea className="resize-none h-24" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="usageExamplesText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usage Examples</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="One example per line"
                      className="resize-none h-28 text-sm"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    One example per line
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add your own notes, memory aids, etc..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteLexiconEntryButton({ entry }: { entry: LexiconEntry }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const deleteMutation = useDeleteLexiconEntry({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLexiconQueryKey() });
        toast({ title: "Removed from lexicon" });
        setOpen(false);
      },
      onError: () =>
        toast({
          variant: "destructive",
          title: "Failed to remove entry",
        }),
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          aria-label={`Remove ${entry.term} from lexicon`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove &ldquo;{entry.term}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the word from your lexicon. You can look it up again and
            stash it later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate({ id: entry.id })}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Remove"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function LexiconEntryCard({ entry }: { entry: LexiconEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden border-border/60 transition-shadow hover:border-primary/30 hover:shadow-md">
      <CardHeader className="p-3 sm:p-4 space-y-0">
        <div className="flex items-start gap-2">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-start gap-2 rounded-md text-left outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            <ChevronDown
              className={cn(
                "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                expanded && "rotate-180",
              )}
            />
            <div className="min-w-0">
              <CardTitle className="font-clash text-lg leading-tight text-primary">
                {entry.term}
              </CardTitle>
              <p className="mt-0.5 text-xs font-medium italic text-muted-foreground">
                {entry.partOfSpeech?.trim() || "—"}
              </p>
            </div>
          </button>
          <div className="flex shrink-0 items-center gap-0.5">
            <EditLexiconEntryDialog entry={entry} />
            <DeleteLexiconEntryButton entry={entry} />
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4 border-t border-border/50 px-3 pb-4 pt-3 sm:px-4">
          {entry.pronunciation && (
            <p className="text-xs font-mono text-muted-foreground">
              /{entry.pronunciation}/
            </p>
          )}
          <p className="text-sm leading-relaxed text-foreground">
            {entry.definition}
          </p>
          {entry.culturalContext && (
            <div>
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Cultural context
              </h4>
              <p className="text-sm text-foreground/90">{entry.culturalContext}</p>
            </div>
          )}
          {entry.usageExamples && entry.usageExamples.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Usage examples
              </h4>
              <ul className="space-y-2">
                {entry.usageExamples.map((example: string, i: number) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-foreground/90 leading-relaxed"
                  >
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{example}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {entry.notes && (
            <div className="border-t border-border/40 pt-3">
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                My notes
              </h4>
              <p className="text-sm italic text-foreground/80">{entry.notes}</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function MyLexicon() {
  const { data: entries, isLoading } = useListLexicon({
    query: { queryKey: getListLexiconQueryKey() },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse h-48" />
        ))}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-transparent">
        <CardContent className="p-10 text-center flex flex-col items-center justify-center">
          <BookOpen className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-xl font-clash font-bold mb-2">
            Your lexicon is empty
          </h3>
          <p className="text-muted-foreground text-sm max-w-xs mb-5">
            Look up words on the Dictionary tab and save them here.
          </p>
          <Link href="/dictionary">
            <Button variant="outline" className="rounded-full">
              Go to Dictionary
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {entries.map((entry) => (
        <LexiconEntryCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

// ─── Songs ──────────────────────────────────────────────────────────────────

const songSchema = z.object({
  songTitle: z.string().min(1, "Song title is required").max(200),
  artistName: z.string().min(1, "Artist name is required").max(200),
  note: z.string().max(500).optional(),
});
type SongFormValues = z.infer<typeof songSchema>;

function SongDialog({
  open,
  onOpenChange,
  song,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  song?: Song | null;
  onSave: (data: SongFormValues) => void;
  isSaving: boolean;
}) {
  const form = useForm<SongFormValues>({
    resolver: zodResolver(songSchema),
    defaultValues: {
      songTitle: song?.songTitle ?? "",
      artistName: song?.artistName ?? "",
      note: song?.note ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      songTitle: song?.songTitle ?? "",
      artistName: song?.artistName ?? "",
      note: song?.note ?? "",
    });
  }, [song, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-clash text-xl">
            {song ? "Edit Song" : "Add a Song"}
          </DialogTitle>
          <DialogDescription>
            {song
              ? "Update the details for this song."
              : "Save a Salone tune to your personal playlist."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="songTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Song Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Salone Lover" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="artistName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Artist Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Drizilik" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Personal Note{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Why do you love this song?"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-primary text-primary-foreground font-bold"
              >
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {song ? "Save Changes" : "Add Song"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function SongStashRow({
  song,
  onEdit,
  deleteSong,
  deletePending,
}: {
  song: Song;
  onEdit: () => void;
  deleteSong: (id: number) => void;
  deletePending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="overflow-hidden rounded-lg border border-border/40 bg-muted/50">
      <div className="flex items-start gap-2 p-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-2 rounded-md text-left outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <ChevronDown
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180",
            )}
          />
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{song.songTitle}</p>
            <p className="text-sm font-medium text-primary">{song.artistName}</p>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onEdit}
            aria-label={`Edit ${song.songTitle}`}
          >
            <PenLine className="w-4 h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Remove ${song.songTitle}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this song?</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{song.songTitle}&rdquo; by {song.artistName} will be removed
                  from Songs I Love. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={deletePending}
                  onClick={() => deleteSong(song.id)}
                >
                  {deletePending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Remove"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border/40 px-3 pb-3 pt-2">
          {song.note?.trim() ? (
            <p className="text-sm italic text-muted-foreground">{song.note}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No note yet — edit to add one.</p>
          )}
        </div>
      )}
    </li>
  );
}

function SongsILove() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSong, setEditSong] = useState<Song | null>(null);

  const { data: songs = [], isLoading } = useListSongs({
    query: { queryKey: getListSongsQueryKey() },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });

  const createMutation = useCreateSong({
    mutation: {
      onSuccess: () => {
        invalidate();
        setDialogOpen(false);
        toast({ title: "Song added!" });
      },
      onError: () =>
        toast({ title: "Failed to add song", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateSong({
    mutation: {
      onSuccess: () => {
        invalidate();
        setDialogOpen(false);
        toast({ title: "Song updated!" });
      },
      onError: () =>
        toast({ title: "Failed to update song", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteSong({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Song removed." });
      },
      onError: () =>
        toast({ title: "Failed to remove song", variant: "destructive" }),
    },
  });

  const handleSave = (data: SongFormValues) => {
    if (editSong) {
      updateMutation.mutate({
        id: editSong.id,
        data: { ...data, note: data.note || null },
      });
    } else {
      createMutation.mutate({ data: { ...data, note: data.note || null } });
    }
  };

  const openAdd = () => {
    setEditSong(null);
    setDialogOpen(true);
  };
  const openEdit = (song: Song) => {
    setEditSong(song);
    setDialogOpen(true);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-muted/60 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Your personal Salone playlist
        </p>
        <Button
          size="sm"
          onClick={openAdd}
          className="bg-primary text-primary-foreground font-bold gap-1 rounded-full"
        >
          <Plus className="w-4 h-4" />
          Add Song
        </Button>
      </div>

      {songs.length === 0 ? (
        <Card className="border-dashed border-2 bg-transparent">
          <CardContent className="p-10 text-center flex flex-col items-center">
            <Music2 className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-xl font-clash font-bold mb-2">
              No songs saved yet
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs mb-5">
              Add your favourite Salone tunes above!
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {songs.map((song) => (
            <SongStashRow
              key={song.id}
              song={song}
              onEdit={() => openEdit(song)}
              deleteSong={(id) => deleteMutation.mutate({ id })}
              deletePending={deleteMutation.isPending}
            />
          ))}
        </ul>
      )}

      <SongDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        song={editSong}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </>
  );
}

// ─── My Artists ──────────────────────────────────────────────────────────────

function StashedArtistCard({
  entry,
  unstash,
  unstashPending,
}: {
  entry: StashedArtistEntry;
  unstash: (artistId: number) => void;
  unstashPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const artist = entry.artist;
  const initials = artist.name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="overflow-hidden rounded-xl border border-border/40 bg-muted/50">
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse details" : "Expand details"}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>
        <Link
          href={`/artists/${artist.id}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20">
            {artist.photoUrl ? (
              <img
                src={artist.photoUrl}
                alt={artist.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="font-clash text-sm font-bold text-primary/60">
                  {initials}
                </span>
              </div>
            )}
          </div>
          <div className="min-w-0 text-left">
            <p className="truncate font-semibold">{artist.name}</p>
            {!expanded &&
              artist.vibeTags &&
              artist.vibeTags.length > 0 && (
                <p className="truncate text-xs text-muted-foreground">
                  {artist.vibeTags.slice(0, 2).join(" · ")}
                  {artist.vibeTags.length > 2 ? "…" : ""}
                </p>
              )}
          </div>
        </Link>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Remove ${artist.name} from stash`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove {artist.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                They will be removed from My Artists. You can open their page and
                tap Stash It again anytime.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={unstashPending}
                onClick={() => unstash(artist.id)}
              >
                {unstashPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Remove"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {expanded && (
        <div className="border-t border-border/40 px-3 pb-3 pt-2">
          {artist.vibeTags && artist.vibeTags.length > 0 ? (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {artist.vibeTags.join(" · ")}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">No vibe tags yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

function MyArtists() {
  const { toast } = useToast();
  const { data: stashed = [], isLoading } = useListStashedArtists({
    query: { queryKey: getListStashedArtistsQueryKey() },
  });

  const unstashMutation = useUnstashArtist({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListStashedArtistsQueryKey(),
        });
        toast({ title: "Removed from Stash" });
      },
      onError: () =>
        toast({ variant: "destructive", title: "Couldn't remove artist" }),
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-muted/60 animate-pulse" />
        ))}
      </div>
    );
  }

  if (stashed.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-transparent">
        <CardContent className="p-10 text-center flex flex-col items-center">
          <Mic2 className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-xl font-clash font-bold mb-2">No artists saved yet</h3>
          <p className="text-muted-foreground text-sm max-w-xs mb-5">
            Visit an artist page and tap Stash It.
          </p>
          <Link href="/artists">
            <Button variant="outline" className="rounded-full">
              Browse Artists
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {stashed.map((entry) => (
        <StashedArtistCard
          key={entry.id}
          entry={entry}
          unstash={(artistId) => unstashMutation.mutate({ artistId })}
          unstashPending={unstashMutation.isPending}
        />
      ))}
    </div>
  );
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

const DEFAULT_STASH_SECTION_ORDER: UserProfileStashSectionOrderItem[] = [
  "lexicon",
  "artists",
  "songs",
];

function normalizeStashSectionOrder(
  raw: UserProfileStashSectionOrderItem[] | null | undefined,
): UserProfileStashSectionOrderItem[] {
  if (!raw || raw.length !== 3) return [...DEFAULT_STASH_SECTION_ORDER];
  const set = new Set(raw);
  if (set.size !== 3) return [...DEFAULT_STASH_SECTION_ORDER];
  for (const v of DEFAULT_STASH_SECTION_ORDER) {
    if (!set.has(v)) return [...DEFAULT_STASH_SECTION_ORDER];
  }
  return raw;
}

function SortableStashSection({
  id,
  icon: Icon,
  title,
  count,
  children,
}: {
  id: UserProfileStashSectionOrderItem;
  icon: ElementType;
  title: string;
  count?: number;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [sectionOpen, setSectionOpen] = useState(true);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-60")}
    >
      <section className="space-y-4">
        <Collapsible open={sectionOpen} onOpenChange={setSectionOpen}>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              className="touch-none shrink-0 cursor-grab rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
              aria-label="Drag to reorder section"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5" />
            </button>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 pl-1 pr-2 text-left hover:bg-muted/60 transition-colors"
              >
                <Icon className="h-5 w-5 shrink-0 text-primary" />
                <h2 className="font-clash text-xl font-bold">{title}</h2>
                {count !== undefined && (
                  <Badge variant="secondary" className="rounded-full text-xs">
                    {count}
                  </Badge>
                )}
                <ChevronDown
                  className={cn(
                    "ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    sectionOpen && "rotate-180",
                  )}
                />
              </button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="space-y-4 pt-1 data-[state=closed]:animate-none">
            {children}
          </CollapsibleContent>
        </Collapsible>
      </section>
    </div>
  );
}

// ─── Signed-out prompt ───────────────────────────────────────────────────────

function SignInPrompt() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <Lock className="w-9 h-9 text-primary/60" />
      </div>
      <h2 className="font-clash text-3xl font-bold mb-3">Your Stash</h2>
      <p className="text-muted-foreground max-w-sm mb-8 leading-relaxed">
        Sign in to save words to your lexicon, build your playlist, and follow
        your favourite artists.
      </p>
      <div className="flex gap-3">
        <Link href="/sign-in">
          <Button variant="outline" className="rounded-full px-6">
            Log in
          </Button>
        </Link>
        <Link href="/sign-up">
          <Button className="rounded-full px-6">Sign up free</Button>
        </Link>
      </div>
    </div>
  );
}

// ─── Stash page ──────────────────────────────────────────────────────────────

function StashContent() {
  const { toast } = useToast();
  const { data: profile } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() },
  });
  const { data: lexiconEntries } = useListLexicon({
    query: { queryKey: getListLexiconQueryKey() },
  });
  const { data: songs } = useListSongs({
    query: { queryKey: getListSongsQueryKey() },
  });

  const order = normalizeStashSectionOrder(profile?.stashSectionOrder ?? null);

  const updateSectionOrder = useUpdateStashSectionOrder({
    mutation: {
      onSuccess: (user) => {
        queryClient.setQueryData(getGetProfileQueryKey(), user);
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Couldn't save section order",
          description: "Try again in a moment.",
        });
      },
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as UserProfileStashSectionOrderItem);
    const newIndex = order.indexOf(over.id as UserProfileStashSectionOrderItem);
    if (oldIndex < 0 || newIndex < 0) return;
    const newOrder = arrayMove(order, oldIndex, newIndex);
    updateSectionOrder.mutate({ data: { order: newOrder } });
  }

  return (
    <div className="space-y-10 pb-10 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Archive className="w-8 h-8 text-primary" />
        <div>
          <h1 className="font-clash text-3xl md:text-4xl font-bold">
            My Stash
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Your saved words, artists, and songs
          </p>
          <p className="text-muted-foreground text-xs mt-1.5">
            Drag the grip beside a heading to reorder sections. Order is saved
            to your account.
          </p>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={order} strategy={verticalListSortingStrategy}>
          {order.map((sectionId, index) => (
            <div
              key={sectionId}
              className={cn(index > 0 && "border-t border-border/40 pt-10")}
            >
              {sectionId === "lexicon" && (
                <SortableStashSection
                  id={sectionId}
                  icon={BookOpen}
                  title="My Lexicon"
                  count={lexiconEntries?.length}
                >
                  <MyLexicon />
                </SortableStashSection>
              )}
              {sectionId === "artists" && (
                <SortableStashSection id={sectionId} icon={Mic2} title="My Artists">
                  <MyArtists />
                </SortableStashSection>
              )}
              {sectionId === "songs" && (
                <SortableStashSection
                  id={sectionId}
                  icon={Star}
                  title="Songs I Love"
                  count={songs?.length}
                >
                  <SongsILove />
                </SortableStashSection>
              )}
            </div>
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

export function Stash() {
  const { isSignedIn } = useAuth();

  return (
    <>
      <Show when="signed-in">
        <StashContent />
      </Show>
      <Show when="signed-out">
        <SignInPrompt />
      </Show>
    </>
  );
}
