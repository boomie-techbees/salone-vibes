import { useState } from "react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Pencil, Check, X, Loader2, Plus, ExternalLink, Tag, Trash2, Archive, CheckCheck } from "lucide-react";
import { useAuth } from "@clerk/react";
import { useIsAdmin } from "@/hooks/use-is-admin";
import {
  useGetArtist,
  useUpdateArtist,
  useListStashedArtists,
  useStashArtist,
  useUnstashArtist,
  getListArtistsQueryKey,
  getGetArtistQueryKey,
  getListStashedArtistsQueryKey,
} from "@workspace/api-client-react";
import type { Artist, ArtistLink } from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { AiGeneratedContentNote } from "@/components/ai-generated-content-note";
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

function ArtistPhoto({ artist }: { artist: Artist }) {
  const initials = artist.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 flex-shrink-0">
      {artist.photoUrl ? (
        <img
          src={artist.photoUrl}
          alt={artist.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="font-clash text-5xl font-bold text-primary/60">
            {initials}
          </span>
        </div>
      )}
    </div>
  );
}

function BioEditor({
  artistId,
  bio,
  canEdit,
}: {
  artistId: number;
  bio: string | null | undefined;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bio ?? "");
  const { toast } = useToast();

  const update = useUpdateArtist({
    mutation: {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetArtistQueryKey(artistId), updated);
        queryClient.invalidateQueries({ queryKey: getListArtistsQueryKey() });
        setEditing(false);
        toast({ title: "Bio updated" });
      },
      onError: () => {
        toast({ title: "Failed to update bio", variant: "destructive" });
      },
    },
  });

  if (!canEdit) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {bio || "No bio yet."}
        </p>
        <AiGeneratedContentNote />
      </div>
    );
  }

  function handleSave() {
    update.mutate({ id: artistId, data: { bio: draft } });
  }

  function handleCancel() {
    setDraft(bio ?? "");
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          className="resize-none text-sm"
          disabled={update.isPending}
          autoFocus
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            className="rounded-full gap-1.5"
            onClick={handleSave}
            disabled={update.isPending}
          >
            {update.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full gap-1.5"
            onClick={handleCancel}
            disabled={update.isPending}
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <p className="text-sm text-muted-foreground flex-1 leading-relaxed">
          {bio || "No bio yet."}
        </p>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 mt-0.5"
          onClick={() => {
            setDraft(bio ?? "");
            setEditing(true);
          }}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </div>
      <AiGeneratedContentNote />
    </div>
  );
}

function VibeTagsEditor({
  artistId,
  vibeTags,
  canEdit,
}: {
  artistId: number;
  vibeTags: string[] | null | undefined;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [tags, setTags] = useState<string[]>(vibeTags ?? []);
  const [input, setInput] = useState("");
  const { toast } = useToast();

  const update = useUpdateArtist({
    mutation: {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetArtistQueryKey(artistId), updated);
        queryClient.invalidateQueries({ queryKey: getListArtistsQueryKey() });
        setEditing(false);
        toast({ title: "Vibe tags updated" });
      },
      onError: () => {
        toast({ title: "Failed to update tags", variant: "destructive" });
      },
    },
  });

  if (!canEdit) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Vibe &amp; Genre</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(vibeTags ?? []).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="rounded-full text-xs gap-1"
            >
              {tag}
            </Badge>
          ))}
          {(!vibeTags || vibeTags.length === 0) && (
            <span className="text-xs text-muted-foreground">No tags yet.</span>
          )}
        </div>
      </div>
    );
  }

  function addTag() {
    const t = input.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setInput("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function handleSave() {
    update.mutate({ id: artistId, data: { vibeTags: tags } });
  }

  function handleCancel() {
    setTags(vibeTags ?? []);
    setInput("");
    setEditing(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Tag className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Vibe &amp; Genre</span>
        {!editing && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => {
              setTags(vibeTags ?? []);
              setEditing(true);
            }}
          >
            <Pencil className="w-3 h-3" />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(editing ? tags : vibeTags ?? []).map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="rounded-full text-xs gap-1"
          >
            {tag}
            {editing && (
              <button
                onClick={() => removeTag(tag)}
                className="ml-0.5 hover:text-destructive"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </Badge>
        ))}
        {!editing && (!vibeTags || vibeTags.length === 0) && (
          <span className="text-xs text-muted-foreground">No tags yet.</span>
        )}
      </div>

      {editing && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add a tag (press Enter)"
              className="h-8 text-sm"
              disabled={update.isPending}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={addTag}
              disabled={!input.trim() || update.isPending}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="rounded-full gap-1.5"
              onClick={handleSave}
              disabled={update.isPending}
            >
              {update.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full"
              onClick={handleCancel}
              disabled={update.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function LinksEditor({
  artistId,
  links,
  canEdit,
}: {
  artistId: number;
  links: ArtistLink[] | null | undefined;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ArtistLink[]>(links ?? []);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(
    null,
  );
  const { toast } = useToast();

  const update = useUpdateArtist({
    mutation: {
      onSuccess: (updated) => {
        queryClient.setQueryData(getGetArtistQueryKey(artistId), updated);
        queryClient.invalidateQueries({ queryKey: getListArtistsQueryKey() });
        setEditing(false);
        toast({ title: "Links updated" });
      },
      onError: () => {
        toast({ title: "Failed to update links", variant: "destructive" });
      },
    },
  });

  if (!canEdit) {
    const displayLinks = links ?? [];
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Links</span>
        </div>
        <div className="space-y-1.5">
          {displayLinks.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              {link.label}
            </a>
          ))}
          {displayLinks.length === 0 && (
            <span className="text-xs text-muted-foreground">No links yet.</span>
          )}
        </div>
      </div>
    );
  }

  function addLink() {
    if (!label.trim() || !url.trim()) return;
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    setDraft([...draft, { label: label.trim(), url: fullUrl }]);
    setLabel("");
    setUrl("");
  }

  function removeLink(i: number) {
    setDraft(draft.filter((_, idx) => idx !== i));
  }

  function handleSave() {
    update.mutate({ id: artistId, data: { links: draft } });
  }

  function handleCancel() {
    setDraft(links ?? []);
    setLabel("");
    setUrl("");
    setEditing(false);
  }

  const displayLinks = editing ? draft : (links ?? []);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <ExternalLink className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Links</span>
        {!editing && (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => {
              setDraft(links ?? []);
              setEditing(true);
            }}
          >
            <Pencil className="w-3 h-3" />
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        {displayLinks.map((link, i) => (
          <div key={i} className="flex items-center gap-2">
            {editing ? (
              <>
                <span className="text-sm flex-1">
                  <span className="font-medium">{link.label}</span>
                  <span className="text-muted-foreground ml-2 text-xs truncate">
                    {link.url}
                  </span>
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-destructive"
                  onClick={() => setPendingRemoveIndex(i)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </>
            ) : (
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                {link.label}
              </a>
            )}
          </div>
        ))}
        {displayLinks.length === 0 && !editing && (
          <span className="text-xs text-muted-foreground">No links yet.</span>
        )}
      </div>

      <AlertDialog
        open={pendingRemoveIndex !== null}
        onOpenChange={(o) => !o && setPendingRemoveIndex(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this link?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemoveIndex !== null && draft[pendingRemoveIndex]
                ? `Remove "${draft[pendingRemoveIndex].label}" from the list. You can add it again before saving, or save to update the artist.`
                : "Remove this link from the list?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingRemoveIndex !== null) removeLink(pendingRemoveIndex);
                setPendingRemoveIndex(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editing && (
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (e.g. Instagram)"
              className="h-8 text-sm"
              disabled={update.isPending}
            />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="URL"
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLink();
                }
              }}
              disabled={update.isPending}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={addLink}
            disabled={!label.trim() || !url.trim() || update.isPending}
            className="rounded-full gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Link
          </Button>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              className="rounded-full gap-1.5"
              onClick={handleSave}
              disabled={update.isPending}
            >
              {update.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full"
              onClick={handleCancel}
              disabled={update.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StashButton({ artistId }: { artistId: number }) {
  const { isSignedIn } = useAuth();
  const { toast } = useToast();

  const { data: stashed = [], isLoading: stashLoading } = useListStashedArtists({
    query: { queryKey: getListStashedArtistsQueryKey(), enabled: !!isSignedIn },
  });

  const isSaved = stashed.some((s) => s.artistId === artistId);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListStashedArtistsQueryKey() });

  const stashMutation = useStashArtist({
    mutation: {
      onSuccess: () => {
        invalidate();
        toast({ title: "Stashed!" });
      },
      onError: () =>
        toast({ variant: "destructive", title: "Couldn't save to Stash" }),
    },
  });

  const unstashMutation = useUnstashArtist({
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
      <Button asChild variant="outline" size="sm" className="rounded-full gap-2">
        <Link href="/sign-in">
          <Archive className="w-4 h-4" />
          Stash It
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
            variant="secondary"
            size="sm"
            className="rounded-full gap-2"
            disabled={isPending || stashLoading}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4 text-primary" />
            )}
            Stashed
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from your stash?</AlertDialogTitle>
            <AlertDialogDescription>
              You can open this page again and tap Stash It anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
              onClick={() => unstashMutation.mutate({ artistId })}
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
      size="sm"
      className="rounded-full gap-2 border-primary/40 hover:border-primary hover:bg-primary/5"
      disabled={isPending || stashLoading}
      onClick={() => stashMutation.mutate({ data: { artistId } })}
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Archive className="w-4 h-4" />
      )}
      Stash It
    </Button>
  );
}

export function ArtistDetail() {
  const [, params] = useRoute("/artists/:id");
  const id = Number(params?.id);
  const isAdmin = useIsAdmin();

  const { data: artist, isLoading, isError } = useGetArtist(id, {
    query: { queryKey: getGetArtistQueryKey(id), enabled: !!id && !isNaN(id) },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-5">
          <Skeleton className="w-32 h-32 md:w-40 md:h-40 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !artist) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive mb-4">Artist not found.</p>
        <Link href="/artists">
          <Button variant="outline" className="rounded-full">
            Back to Artists
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link href="/artists">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 rounded-full">
          <ArrowLeft className="w-4 h-4" />
          Artists
        </Button>
      </Link>

      <div className="flex gap-5 items-start">
        <ArtistPhoto artist={artist} />
        <div className="flex-1 min-w-0 space-y-3">
          <h1 className="font-clash text-3xl md:text-4xl font-bold leading-tight">
            {artist.name}
          </h1>
          <StashButton artistId={artist.id} />
        </div>
      </div>

      <div className="space-y-5 divide-y divide-border/40">
        <div className="pt-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Bio
          </h2>
          <BioEditor artistId={artist.id} bio={artist.bio} canEdit={isAdmin} />
        </div>

        <div className="pt-4">
          <VibeTagsEditor
            artistId={artist.id}
            vibeTags={artist.vibeTags}
            canEdit={isAdmin}
          />
        </div>

        <div className="pt-4">
          <LinksEditor artistId={artist.id} links={artist.links} canEdit={isAdmin} />
        </div>
      </div>
    </div>
  );
}
