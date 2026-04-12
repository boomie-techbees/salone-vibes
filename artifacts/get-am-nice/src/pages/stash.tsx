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
  const deleteMutation = useDeleteLexiconEntry();

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

  const handleDelete = () => {
    if (confirm(`Remove "${entry.term}" from your lexicon?`)) {
      deleteMutation.mutate(
        { id: entry.id },
        {
          onSuccess: () => {
            toast({ title: "Entry removed" });
            setOpen(false);
            queryClient.invalidateQueries({
              queryKey: getListLexiconQueryKey(),
            });
          },
          onError: () => {
            toast({ variant: "destructive", title: "Failed to remove entry" });
          },
        },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary"
        >
          <PenLine className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-clash text-2xl flex items-center justify-between">
            <span>Edit "{entry.term}"</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
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

function LexiconEntryCard({ entry }: { entry: LexiconEntry }) {
  return (
    <Card className="flex flex-col h-full overflow-hidden hover:shadow-md transition-all border-border/60 hover:border-primary/30">
      <CardHeader className="bg-primary/5 pb-4 border-b border-border/50">
        <div className="flex justify-between items-start gap-2">
          <div>
            <CardTitle className="font-clash text-2xl text-primary">
              {entry.term}
            </CardTitle>
            <div className="flex flex-wrap gap-2 mt-2 text-xs font-medium">
              {entry.partOfSpeech && (
                <span className="text-secondary italic">
                  {entry.partOfSpeech}
                </span>
              )}
              {entry.pronunciation && (
                <span className="text-muted-foreground font-mono">
                  /{entry.pronunciation}/
                </span>
              )}
            </div>
          </div>
          <EditLexiconEntryDialog entry={entry} />
        </div>
      </CardHeader>
      <CardContent className="p-5 flex-1 flex flex-col gap-4">
        <p className="text-foreground leading-relaxed">{entry.definition}</p>
        {entry.usageExamples && entry.usageExamples.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Usage Examples
            </h4>
            <ul className="space-y-2">
              {entry.usageExamples.map((example: string, i: number) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-foreground/90 leading-relaxed"
                >
                  <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{example}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {entry.notes && (
          <div className="mt-auto pt-4 border-t border-border/50">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
              My Notes
            </h4>
            <p className="text-sm italic text-foreground/80">{entry.notes}</p>
          </div>
        )}
      </CardContent>
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
            <li
              key={song.id}
              className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border/40 group"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {song.songTitle}
                </p>
                <p className="text-sm text-primary font-medium">
                  {song.artistName}
                </p>
                {song.note && (
                  <p className="text-sm text-muted-foreground mt-1 italic">
                    {song.note}
                  </p>
                )}
              </div>
              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => openEdit(song)}
                >
                  <PenLine className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => deleteMutation.mutate({ id: song.id })}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </li>
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
            Visit an artist page and hit "Save to Stash".
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
      {stashed.map((entry) => {
        const artist = entry.artist;
        const initials = artist.name
          .split(" ")
          .map((w: string) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();

        return (
          <div
            key={entry.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/40 group"
          >
            <Link href={`/artists/${artist.id}`} className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 flex-shrink-0">
                {artist.photoUrl ? (
                  <img
                    src={artist.photoUrl}
                    alt={artist.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="font-clash text-sm font-bold text-primary/60">
                      {initials}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{artist.name}</p>
                {artist.vibeTags && artist.vibeTags.length > 0 && (
                  <p className="text-xs text-muted-foreground truncate">
                    {artist.vibeTags.slice(0, 3).join(" · ")}
                  </p>
                )}
              </div>
            </Link>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              disabled={unstashMutation.isPending}
              onClick={() => unstashMutation.mutate({ artistId: artist.id })}
              aria-label="Remove from Stash"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        );
      })}
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

function Section({
  icon: Icon,
  title,
  count,
  children,
  dragHandle,
}: {
  icon: ElementType;
  title: string;
  count?: number;
  children: ReactNode;
  dragHandle?: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        {dragHandle}
        <Icon className="w-5 h-5 text-primary" />
        <h2 className="font-clash text-xl font-bold">{title}</h2>
        {count !== undefined && (
          <Badge variant="secondary" className="rounded-full text-xs">
            {count}
          </Badge>
        )}
      </div>
      {children}
    </section>
  );
}

function SortableStashSection({
  id,
  icon,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-60")}
    >
      <Section
        icon={icon}
        title={title}
        count={count}
        dragHandle={
          <button
            type="button"
            className="touch-none shrink-0 cursor-grab rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
            aria-label="Drag to reorder section"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>
        }
      >
        {children}
      </Section>
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
