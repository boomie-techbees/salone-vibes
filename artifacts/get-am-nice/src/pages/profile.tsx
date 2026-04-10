import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth, useUser, Show, RedirectToSignIn } from "@clerk/react";
import { Loader2, LogOut, Settings, Music2, Plus, PenLine, Trash2 } from "lucide-react";
import { format } from "date-fns";

import {
  useGetProfile, useUpdateProfile, getGetProfileQueryKey,
  useListSongs, useCreateSong, useUpdateSong, useDeleteSong, getListSongsQueryKey,
} from "@workspace/api-client-react";
import type { Song } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const profileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters").max(50),
});

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
          <DialogTitle className="font-clash text-xl">{song ? "Edit Song" : "Add a Song"}</DialogTitle>
          <DialogDescription>
            {song ? "Update the details for this song." : "Save a Salone tune to your personal playlist."}
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
                  <FormLabel>Personal Note <span className="text-muted-foreground">(optional)</span></FormLabel>
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
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving} className="bg-primary text-primary-foreground font-bold">
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

function MySalonPlaylist() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSong, setEditSong] = useState<Song | null>(null);

  const { data: songs = [], isLoading } = useListSongs({
    query: { queryKey: getListSongsQueryKey() },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListSongsQueryKey() });

  const createMutation = useCreateSong({
    mutation: {
      onSuccess: () => { invalidate(); setDialogOpen(false); toast({ title: "Song added!" }); },
      onError: () => toast({ title: "Failed to add song", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateSong({
    mutation: {
      onSuccess: () => { invalidate(); setDialogOpen(false); toast({ title: "Song updated!" }); },
      onError: () => toast({ title: "Failed to update song", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteSong({
    mutation: {
      onSuccess: () => { invalidate(); toast({ title: "Song removed." }); },
      onError: () => toast({ title: "Failed to remove song", variant: "destructive" }),
    },
  });

  const handleSave = (data: SongFormValues) => {
    if (editSong) {
      updateMutation.mutate({ id: editSong.id, data: { ...data, note: data.note || null } });
    } else {
      createMutation.mutate({ data: { ...data, note: data.note || null } });
    }
  };

  const openAdd = () => { setEditSong(null); setDialogOpen(true); };
  const openEdit = (song: Song) => { setEditSong(song); setDialogOpen(true); };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <Card className="border-2 border-border/50 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-3">
            <Music2 className="w-6 h-6 text-primary" />
            <div>
              <CardTitle className="font-clash text-2xl">Songs I Love</CardTitle>
              <CardDescription>Your personal Salone playlist</CardDescription>
            </div>
          </div>
          <Button size="sm" onClick={openAdd} className="bg-primary text-primary-foreground font-bold gap-1">
            <Plus className="w-4 h-4" />
            Add Song
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : songs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Music2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No songs saved yet.</p>
              <p className="text-sm mt-1">Add your favourite Salone tunes above!</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {songs.map((song) => (
                <li key={song.id} className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border/40 group">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{song.songTitle}</p>
                    <p className="text-sm text-primary font-medium">{song.artistName}</p>
                    {song.note && (
                      <p className="text-sm text-muted-foreground mt-1 italic">{song.note}</p>
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
        </CardContent>
      </Card>

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

export function Profile() {
  const { signOut } = useAuth();
  const { user: clerkUser } = useUser();
  const { toast } = useToast();
  
  const { data: profile, isLoading } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() }
  });
  
  const updateMutation = useUpdateProfile();
  
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
    },
  });

  const initializedForId = useRef<number | null>(null);

  useEffect(() => {
    if (profile && initializedForId.current !== profile.id) {
      initializedForId.current = profile.id;
      form.reset({
        displayName: profile.displayName || clerkUser?.username || clerkUser?.firstName || "",
      });
    }
  }, [profile, clerkUser, form]);

  const onSubmit = (data: z.infer<typeof profileSchema>) => {
    updateMutation.mutate(
      { data },
      {
        onSuccess: (updatedProfile) => {
          toast({
            title: "Profile updated",
            description: "Your display name has been updated.",
          });
          queryClient.setQueryData(getGetProfileQueryKey(), updatedProfile);
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Update failed",
            description: "There was a problem updating your profile.",
          });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Card className="animate-pulse">
          <CardHeader className="h-32 bg-primary/10"></CardHeader>
          <CardContent className="h-64"></CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto mt-8 text-center">
        <p className="text-muted-foreground">Could not load profile. Please try refreshing.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-4 md:mt-8 space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-8 h-8 text-primary" />
        <h1 className="font-clash text-4xl font-bold text-foreground">
          Settings
        </h1>
      </div>

      <Card className="overflow-hidden border-2 border-border/50 shadow-md">
        <div className="h-32 bg-primary/10 border-b border-border/50 relative">
          <div className="absolute -bottom-12 left-8">
            <Avatar className="h-24 w-24 border-4 border-card shadow-sm bg-card">
              <AvatarImage src={clerkUser?.imageUrl} />
              <AvatarFallback className="bg-secondary text-secondary-foreground text-2xl">
                {profile.displayName?.charAt(0) || clerkUser?.firstName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        
        <CardHeader className="pt-16 pb-4">
          <CardTitle className="font-clash text-2xl">
            {profile.displayName || clerkUser?.username || clerkUser?.firstName || "User"}
          </CardTitle>
          <CardDescription>
            Member since {format(new Date(profile.createdAt), "MMMM yyyy")}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="How should we call you?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end pt-2">
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending || !form.formState.isDirty}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                >
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>

          <div className="pt-6 border-t border-border/50">
            <h3 className="font-medium text-lg mb-4">Account Information</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Email</span>
                <p className="text-foreground">{profile.email || clerkUser?.primaryEmailAddress?.emailAddress || "Not provided"}</p>
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="bg-muted/50 p-6 border-t border-border/50">
          <Button 
            variant="outline" 
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => signOut()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </CardFooter>
      </Card>

      <MySalonPlaylist />
    </div>
  );
}

export function ProfilePage() {
  return (
    <>
      <Show when="signed-in">
        <Profile />
      </Show>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
    </>
  );
}
