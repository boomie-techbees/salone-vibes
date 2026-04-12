import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Search, Loader2, Save, BookOpen, ChevronRight } from "lucide-react";
import { useAuth } from "@clerk/react";
import { Link } from "wouter";

import {
  useDictionaryLookup,
  useCreateLexiconEntry,
  getListLexiconQueryKey,
} from "@workspace/api-client-react";
import type { DictionaryEntry } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { AiGeneratedContentNote } from "@/components/ai-generated-content-note";

const lookupSchema = z.object({
  term: z.string().min(1, "Please enter a word or phrase"),
});

export function Dictionary() {
  const [result, setResult] = useState<DictionaryEntry | null>(null);
  const { toast } = useToast();
  const { isSignedIn } = useAuth();

  const lookupMutation = useDictionaryLookup();
  const createEntryMutation = useCreateLexiconEntry();

  const form = useForm<z.infer<typeof lookupSchema>>({
    resolver: zodResolver(lookupSchema),
    defaultValues: { term: "" },
  });

  const onSubmit = (data: z.infer<typeof lookupSchema>) => {
    lookupMutation.mutate(
      { data },
      {
        onSuccess: (data) => setResult(data),
        onError: () => {
          toast({
            variant: "destructive",
            title: "Lookup failed",
            description: "Couldn't find the term. Try another spelling or phrase.",
          });
        },
      },
    );
  };

  const handleSaveToLexicon = () => {
    if (!result) return;
    createEntryMutation.mutate(
      { data: { ...result, notes: "" } },
      {
        onSuccess: () => {
          toast({
            title: "Saved to Lexicon",
            description: `"${result.term}" is in your Stash.`,
          });
          queryClient.invalidateQueries({ queryKey: getListLexiconQueryKey() });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Failed to save",
            description: "There was a problem saving to your lexicon.",
          });
        },
      },
    );
  };

  return (
    <div className="space-y-8 pb-8 max-w-4xl mx-auto">
      <div className="text-center space-y-4 mb-8">
        <h1 className="font-clash text-4xl md:text-5xl font-bold text-foreground">
          Salone Dictionary
        </h1>
        <div className="text-muted-foreground text-lg max-w-2xl mx-auto space-y-1.5 px-4 sm:px-0">
          <p className="text-balance">
            Look up Krio words and phrases, and learn cultural context.
          </p>
          <p className="text-balance">
            Save favourites to your{" "}
            <Link href="/stash" className="text-primary underline underline-offset-2">
              Stash
            </Link>
            .
          </p>
        </div>
      </div>

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
                {lookupMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Search"
                )}
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
                    <li
                      key={i}
                      className="flex items-start gap-2 text-foreground/90 leading-relaxed"
                    >
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

      <AiGeneratedContentNote className="max-w-2xl mx-auto text-center border-t border-border/30 pt-6 mt-2" />
    </div>
  );
}
