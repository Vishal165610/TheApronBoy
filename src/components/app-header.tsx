import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { HelpCircle, ShoppingBag, UserRound, ChevronDown, LogOut } from "lucide-react";
import type { User } from "firebase/auth";
import { signOutUser } from "@/lib/firebase";

export function AppHeader({ user, displayName }: { user: User; displayName?: string }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    await signOutUser();
    navigate({ to: "/auth" });
  }

  return (
    <header className="sticky top-0 z-20 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-foreground/5 bg-background/70 px-4 py-3 backdrop-blur-md sm:px-6">
      {/* Left: Help */}
      <div className="flex items-center">
        <button
          type="button"
          className="clay-chip flex items-center gap-2 px-3 py-2 text-sm font-medium text-foreground/80 transition hover:text-foreground sm:px-4"
        >
          <HelpCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Help</span>
        </button>
      </div>

      {/* Center: Branding */}
      <div className="flex items-center justify-center">
        <img
          src="/logo-black.png"
          alt="The Apron Boy"
          className="h-7 w-auto object-contain sm:h-8"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      {/* Right: Purchases + Profile */}
      <div className="flex items-center justify-end gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/profile" })}
          aria-label="My purchases"
          className="clay-btn-ghost flex h-10 w-10 items-center justify-center rounded-full text-foreground/70 transition hover:text-foreground"
        >
          <ShoppingBag className="h-4 w-4" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="clay flex h-10 items-center gap-1.5 rounded-full pl-1 pr-2.5 text-foreground/80"
          >
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--sky-soft)]">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserRound className="h-4 w-4" />
              )}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {menuOpen && (
            <div className="clay absolute right-0 top-[calc(100%+0.5rem)] w-56 p-2">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-semibold text-foreground">
                  {displayName || user.displayName || "Student"}
                </p>
                <p className="truncate text-xs text-foreground/50">{user.email}</p>
              </div>
              <div className="my-1 h-px bg-foreground/10" />
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate({ to: "/profile" });
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground/80 transition hover:bg-foreground/5"
              >
                <UserRound className="h-4 w-4" />
                View profile
              </button>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground/80 transition hover:bg-foreground/5"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}