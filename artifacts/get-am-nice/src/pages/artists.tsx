import { Music2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function Artists() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-24 h-24 bg-secondary/10 rounded-full flex items-center justify-center mb-6">
        <Music2 className="w-12 h-12 text-secondary" />
      </div>
      <h1 className="font-clash text-4xl font-bold text-foreground mb-4">
        Artists Directory
      </h1>
      <p className="text-xl text-muted-foreground max-w-md mb-8 leading-relaxed">
        We're building the most comprehensive database of Salone artists, from legendary pioneers to the freshest new voices.
      </p>
      <div className="p-6 bg-accent/10 border border-accent/20 rounded-2xl max-w-md w-full mb-8">
        <p className="font-medium text-accent-foreground">
          Coming soon. Get ready to discover your next favorite sound.
        </p>
      </div>
      <Link href="/">
        <Button variant="outline" className="rounded-full px-8">
          Return Home
        </Button>
      </Link>
    </div>
  );
}
