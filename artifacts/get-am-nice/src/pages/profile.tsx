import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth, useUser, Show } from "@clerk/react";
import { Link } from "wouter";
import { Loader2, LogOut, Settings, Lock } from "lucide-react";
import { format } from "date-fns";

import {
  useGetProfile,
  useUpdateProfile,
  getGetProfileQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardFooter } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const profileSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50),
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function Profile() {
  const { signOut } = useAuth();
  const { user: clerkUser } = useUser();
  const { toast } = useToast();

  const { data: profile, isLoading } = useGetProfile({
    query: { queryKey: getGetProfileQueryKey() },
  });

  const updateMutation = useUpdateProfile();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: "" },
  });

  const initializedForId = useRef<number | null>(null);

  useEffect(() => {
    if (profile && initializedForId.current !== profile.id) {
      initializedForId.current = profile.id;
      form.reset({
        displayName:
          profile.displayName ||
          clerkUser?.username ||
          clerkUser?.firstName ||
          "",
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
        },
      },
    );
  };

  const googleAccount = clerkUser?.externalAccounts?.find((a) =>
    String(a.provider).toLowerCase().includes("google"),
  );

  const email =
    profile?.email ||
    clerkUser?.primaryEmailAddress?.emailAddress ||
    googleAccount?.emailAddress ||
    "Not provided";

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Card className="animate-pulse">
          <div className="h-32 bg-primary/10" />
          <div className="h-64 p-6" />
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto mt-8 text-center">
        <p className="text-muted-foreground">
          Could not load profile. Please try refreshing.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-4 md:mt-8 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-primary" />
        <h1 className="font-clash text-4xl font-bold text-foreground">
          Settings
        </h1>
      </div>

      <Card className="overflow-hidden border-2 border-border/50 shadow-md">
        <div className="h-28 bg-primary/10 border-b border-border/50 relative">
          <div className="absolute -bottom-10 left-6">
            <Avatar className="h-20 w-20 border-4 border-card shadow-sm bg-card">
              <AvatarImage src={clerkUser?.imageUrl} />
              <AvatarFallback className="bg-secondary text-secondary-foreground text-xl">
                {profile.displayName?.charAt(0) ||
                  clerkUser?.firstName?.charAt(0) ||
                  "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div className="pt-14 px-6 pb-6 space-y-6">
          <div>
            <p className="font-clash text-2xl font-bold">
              {profile.displayName ||
                clerkUser?.username ||
                clerkUser?.firstName ||
                "User"}
            </p>
            <p className="text-sm text-muted-foreground">
              Member since {format(new Date(profile.createdAt), "MMMM yyyy")}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="How should we call you?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={
                    updateMutation.isPending || !form.formState.isDirty
                  }
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                >
                  {updateMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>

          <div className="border-t border-border/50 pt-6 space-y-4">
            <h3 className="font-medium text-base">Account Information</h3>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Email
                </span>
                <p className="text-foreground">{email}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Sign-in method
                </span>
                <div className="flex items-center gap-2 mt-1">
                  {googleAccount ? (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1.5 text-sm font-normal py-1 px-2.5"
                    >
                      <GoogleIcon />
                      Signed in with Google
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-sm font-normal py-1 px-2.5"
                    >
                      Email &amp; Password
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <CardFooter className="bg-muted/50 px-6 py-4 border-t border-border/50">
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

function ProfileSignInPrompt() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 max-w-lg mx-auto">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <Lock className="w-9 h-9 text-primary/60" />
      </div>
      <h2 className="font-clash text-3xl font-bold mb-3">Your settings</h2>
      <p className="text-muted-foreground mb-8 leading-relaxed">
        Sign in to manage your profile, display name, and account details.
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

export function ProfilePage() {
  return (
    <>
      <Show when="signed-in">
        <Profile />
      </Show>
      <Show when="signed-out">
        <ProfileSignInPrompt />
      </Show>
    </>
  );
}
