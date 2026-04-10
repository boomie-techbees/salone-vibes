import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Search, Loader2, Save, BookOpen, ChevronRight, PenLine, Trash2, X } from "lucide-react";
import { Show, useAuth } from "@clerk/react";

import {
  useDictionaryLookup,
  useListLexicon,
  useCreateLexiconEntry,
  useUpdateLexiconEntry,
  useDeleteLexiconEntry,
  getListLexiconQueryKey
} from "@workspace/api-client-react";
import type { DictionaryEntry, LexiconEntry } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";

const lookupSchema = z.object({
  term: z.string().min(1, "Please enter a word or phrase"),
});

export function Dictionary() {
  const [activeTab, setActiveTab] = useState<"lookup" | "lexicon">("lookup");
  const { isSignedIn } = useAuth();

  return (
    <div className="space-y-8 pb-8 max-w-4xl mx-auto">
      <div className="text-center space-y-4 mb-8">
        <h1 className="font-clash text-4xl md:text-5xl font-bold text-foreground">
          Salone Dictionary
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Look up Krio slang, learn the cultural context, and build your own personal lexicon.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { if (v === "lookup" || v === "lexicon") setActiveTab(v); }} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 bg-card border border-border/50 h-14 p-1">
          <TabsTrigger value="lookup" className="text-base font-medium h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
            Lookup
          </TabsTrigger>
          <TabsTrigger 
            value="lexicon" 
            disabled={!isSignedIn}
            className="text-base font-medium h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
          >
            My Lexicon {isSignedIn ? "" : "(Sign in)"}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="lookup" className="mt-0">
          <LookupTab onSaved={() => setActiveTab("lexicon")} />
        </TabsContent>
        <TabsContent value="lexicon" className="mt-0">
          <Show when="signed-in">
            <LexiconTab />
          </Show>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LookupTab({ onSaved }: { onSaved: () => void }) {
  const [result, setResult] = useState<DictionaryEntry | null>(null);
  const { toast } = useToast();
  const lookupMutation = useDictionaryLookup();
  const createEntryMutation = useCreateLexiconEntry();
  const { isSignedIn } = useAuth();

  const form = useForm<z.infer<typeof lookupSchema>>({
    resolver: zodResolver(lookupSchema),
    defaultValues: {
      term: "",
    },
  });

  const onSubmit = (data: z.infer<typeof lookupSchema>) => {
    lookupMutation.mutate(
      { data },
      {
        onSuccess: (data) => {
          setResult(data);
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Lookup failed",
            description: "Couldn't find the term. Try another spelling or phrase.",
          });
        }
      }
    );
  };

  const handleSaveToLexicon = () => {
    if (!result) return;

    createEntryMutation.mutate(
      { data: { ...result, notes: "" } },
      {
        onSuccess: () => {
          toast({
            title: "Added to Lexicon",
            description: `"${result.term}" is now in your personal dictionary.`,
          });
          queryClient.invalidateQueries({ queryKey: getListLexiconQueryKey() });
          onSaved();
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Failed to save",
            description: "There was a problem saving to your lexicon.",
          });
        }
      }
    );
  };

  return (
    <div className="space-y-8">
      <Card className="border-2 border-primary/20 shadow-md">
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-3">
              <FormField
                control={form.control}
                name="term"
                render={({ field }) => (
                  <FormItem className="flex-1 space-y-0">
                    <FormControl>
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input 
                          placeholder="Search for a Krio word or phrase..." 
                          className="pl-12 py-6 text-lg bg-card/50"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                size="lg" 
                className="h-auto px-8 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold text-lg rounded-xl"
                disabled={lookupMutation.isPending}
              >
                {lookupMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {lookupMutation.isPending && (
        <Card className="animate-pulse border-border/50">
          <CardContent className="p-8 h-64 flex flex-col justify-center items-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Consulting the culture...</p>
          </CardContent>
        </Card>
      )}

      {result && !lookupMutation.isPending && (
        <Card className="border-border overflow-hidden border-2 border-primary/10 shadow-lg">
          <div className="bg-primary/5 p-8 border-b border-border/50">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-4xl md:text-5xl font-clash font-bold text-primary mb-2">
                  {result.term}
                </h2>
                <div className="flex flex-wrap gap-2 text-sm font-medium">
                  {result.partOfSpeech && (
                    <span className="px-3 py-1 bg-secondary/10 text-secondary rounded-full italic">
                      {result.partOfSpeech}
                    </span>
                  )}
                  {result.pronunciation && (
                    <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full font-mono">
                      /{result.pronunciation}/
                    </span>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                {isSignedIn ? (
                  <Button 
                    onClick={handleSaveToLexicon} 
                    disabled={createEntryMutation.isPending}
                    className="rounded-full shadow-sm bg-accent text-accent-foreground hover:bg-accent/90 font-bold"
                  >
                    {createEntryMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save to Lexicon
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="rounded-full">
                    <Link href="/sign-in">Sign in to save</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          <CardContent className="p-8 space-y-8">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Definition
              </h3>
              <p className="text-xl text-foreground leading-relaxed">
                {result.definition}
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  Cultural Context
                </h3>
                <p className="text-foreground/90 leading-relaxed bg-accent/5 p-4 rounded-xl border border-accent/10">
                  {result.culturalContext}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">
                  Usage Examples
                </h3>
                <ul className="space-y-3">
                  {result.usageExamples.map((example: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-foreground/90 leading-relaxed">
                      <ChevronRight className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span>{example}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LexiconTab() {
  const { data: entries, isLoading } = useListLexicon({
    query: { queryKey: getListLexiconQueryKey() }
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse h-48"></Card>
        ))}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-transparent">
        <CardContent className="p-12 text-center flex flex-col items-center justify-center">
          <BookOpen className="w-16 h-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-2xl font-clash font-bold mb-2">Your lexicon is empty</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Look up some words and save them here to build your personal Salone dictionary.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {entries.map(entry => (
        <LexiconEntryCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

function LexiconEntryCard({ entry }: { entry: LexiconEntry }) {
  return (
    <Card className="flex flex-col h-full overflow-hidden hover:shadow-md transition-all border-border/60 hover:border-primary/30 group">
      <CardHeader className="bg-primary/5 pb-4 border-b border-border/50">
        <div className="flex justify-between items-start gap-2">
          <div>
            <CardTitle className="font-clash text-2xl text-primary">{entry.term}</CardTitle>
            <div className="flex flex-wrap gap-2 mt-2 text-xs font-medium">
              {entry.partOfSpeech && (
                <span className="text-secondary italic">{entry.partOfSpeech}</span>
              )}
              {entry.pronunciation && (
                <span className="text-muted-foreground font-mono">/{entry.pronunciation}/</span>
              )}
            </div>
          </div>
          <EditLexiconEntryDialog entry={entry} />
        </div>
      </CardHeader>
      <CardContent className="p-5 flex-1 flex flex-col gap-4">
        <div>
          <p className="text-foreground leading-relaxed">{entry.definition}</p>
        </div>
        
        {entry.notes && (
          <div className="mt-auto pt-4 border-t border-border/50">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">My Notes</h4>
            <p className="text-sm italic text-foreground/80">{entry.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const editEntrySchema = z.object({
  definition: z.string().min(1, "Definition required"),
  culturalContext: z.string().min(1, "Context required"),
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
      notes: entry.notes || "",
    },
  });

  const onSubmit = (data: z.infer<typeof editEntrySchema>) => {
    updateMutation.mutate(
      { id: entry.id, data },
      {
        onSuccess: () => {
          toast({ title: "Entry updated successfully" });
          setOpen(false);
          queryClient.invalidateQueries({ queryKey: getListLexiconQueryKey() });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Failed to update entry" });
        }
      }
    );
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to remove "${entry.term}" from your lexicon?`)) {
      deleteMutation.mutate(
        { id: entry.id },
        {
          onSuccess: () => {
            toast({ title: "Entry removed" });
            setOpen(false);
            queryClient.invalidateQueries({ queryKey: getListLexiconQueryKey() });
          },
          onError: () => {
            toast({ variant: "destructive", title: "Failed to remove entry" });
          }
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
          <PenLine className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-clash text-2xl flex items-center justify-between">
            <span>Edit "{entry.term}"</span>
            <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add your own notes, memory aids, etc..." className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
