import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth, useUser, Show, RedirectToSignIn } from "@clerk/react";
import { Loader2, LogOut, Settings, User } from "lucide-react";
import { format } from "date-fns";

import { useGetProfile, useUpdateProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const profileSchema = z.object({
  displayName: z.string().min(2, "Display name must be at least 2 characters").max(50),
});

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
