import { Link, useLocation } from "wouter";
import { Show, useUser } from "@clerk/react";
import { Home, BookA, Mic2, Calendar, Archive, User } from "lucide-react";
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
    { href: "/stash", label: "Stash", icon: Archive },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location === href || location.startsWith(href + "/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-primary text-primary-foreground z-50 flex items-center justify-between px-3 md:px-8 shadow-md">
      {/* Logo */}
      <Link href="/" className="font-clash font-bold text-xl tracking-tight shrink-0 flex items-center gap-2">
        <span className="hidden md:inline">Salone Vibes</span>
        <span className="md:hidden">SV</span>
        <span className="text-[10px] font-sans font-semibold tracking-widest uppercase bg-primary-foreground/15 text-primary-foreground/70 border border-primary-foreground/20 rounded px-1.5 py-0.5 leading-none">
          Beta
        </span>
      </Link>

      {/* Desktop nav links */}
      <div className="hidden md:flex h-full items-center">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "h-full flex items-center px-4 font-medium transition-colors hover:bg-primary/90 relative",
              isActive(item.href) &&
                "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-accent"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Mobile nav icons (inline, top bar only) */}
      <div className="flex md:hidden items-center gap-0.5">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-9 h-10 rounded-lg transition-colors",
              isActive(item.href)
                ? "bg-primary-foreground/15 text-primary-foreground"
                : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            )}
            aria-label={item.label}
          >
            <item.icon
              className={cn(
                "h-[18px] w-[18px] transition-transform",
                isActive(item.href) && "scale-110 stroke-[2.5px]"
              )}
            />
          </Link>
        ))}
      </div>

      {/* Auth area */}
      <div className="flex items-center gap-3 shrink-0">
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
          <div className="flex items-center gap-2">
            <Link href="/sign-in" className="text-sm font-medium hover:underline">
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="text-sm font-medium bg-accent text-accent-foreground px-3 py-1.5 rounded-full hover:bg-accent/90 transition-colors shadow-sm"
            >
              Sign up
            </Link>
          </div>
        </Show>
      </div>
    </nav>
  );
}
