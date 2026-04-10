import { Link, useLocation } from "wouter";
import { Show, useUser } from "@clerk/react";
import { Home, BookA, Mic2, Calendar, User, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Navbar() {
  const [location] = useLocation();
  const { user } = useUser();

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/dictionary", label: "Dictionary", icon: BookA },
    { href: "/artists", label: "Artists", icon: Mic2 },
    { href: "/events", label: "Events", icon: Calendar },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-primary text-primary-foreground z-50 flex items-center justify-between px-4 md:px-8 shadow-md">
      <div className="flex items-center gap-6 h-full">
        <Link href="/" className="font-clash font-bold text-xl tracking-tight hidden md:block">
          Get Am Nice
        </Link>
        <Link href="/" className="font-clash font-bold text-xl tracking-tight md:hidden">
          GAN
        </Link>
        
        <div className="hidden md:flex h-full items-center">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "h-full flex items-center px-4 font-medium transition-colors hover:bg-primary/90 relative",
                location === item.href && "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-accent"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Show when="signed-in">
          <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="hidden sm:inline-block font-medium text-sm">
              {user?.firstName || user?.username || "Profile"}
            </span>
            <Avatar className="h-8 w-8 border-2 border-primary-foreground/20">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                {user?.firstName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </Link>
        </Show>
        <Show when="signed-out">
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm font-medium hover:underline">
              Log in
            </Link>
            <Link href="/sign-up" className="text-sm font-medium bg-accent text-accent-foreground px-4 py-1.5 rounded-full hover:bg-accent/90 transition-colors shadow-sm">
              Sign up
            </Link>
          </div>
        </Show>
      </div>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around px-2 z-50 pb-safe">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full text-muted-foreground transition-colors",
              location === item.href && "text-primary"
            )}
          >
            <item.icon className={cn("h-5 w-5 mb-1 transition-transform", location === item.href && "scale-110 stroke-[2.5px]")} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
