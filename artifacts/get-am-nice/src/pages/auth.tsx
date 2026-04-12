import { SignIn, SignUp } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Keeps the Clerk card aligned with headings; rootBox centers the widget when it uses internal flex. */
const clerkAuthAppearance = {
  elements: {
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground",
    card: "shadow-xl border border-border/50",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    rootBox: "w-full flex justify-center",
  },
} as const;

export function SignInPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] py-8 flex-none w-[min(100%,28rem)]">
      <div className="text-center mb-8">
        <h1 className="font-clash text-4xl font-bold text-primary mb-2">Welcome Back</h1>
        <p className="text-muted-foreground">Sign in to access your saved lexicon and more.</p>
      </div>
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        appearance={clerkAuthAppearance}
      />
    </div>
  );
}

export function SignUpPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] py-8 flex-none w-[min(100%,28rem)]">
      <div className="text-center mb-8">
        <h1 className="font-clash text-4xl font-bold text-primary mb-2">Join Salone Vibes</h1>
        <p className="text-muted-foreground">Create an account to save words to your lexicon.</p>
      </div>
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        appearance={clerkAuthAppearance}
      />
    </div>
  );
}
