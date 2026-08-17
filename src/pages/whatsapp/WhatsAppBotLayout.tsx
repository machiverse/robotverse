import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  MessageSquare,
  BookOpen,
  Megaphone,
  Settings as SettingsIcon,
  Menu,
  X,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/whatsapp-bot", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/whatsapp-bot/conversations", label: "Conversations", icon: MessageSquare },
  { to: "/whatsapp-bot/knowledge-base", label: "Knowledge Base", icon: BookOpen },
  { to: "/whatsapp-bot/broadcast", label: "Broadcast", icon: Megaphone },
  { to: "/whatsapp-bot/settings", label: "Settings", icon: SettingsIcon },
];

export const WHATSAPP_BOT_VERSION = "v1.0.0";

const WhatsAppBotLayout = () => {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { user, loading } = useAuth();
  const { isAdmin, isLoading } = useIsAdmin();

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 p-8">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
          <Bot className="mx-auto mb-3 h-10 w-10 text-primary" />
          <h1 className="text-xl font-semibold">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The WhatsApp Bot console is restricted to RobotVerse administrators.
          </p>
          <Button asChild className="mt-4">
            <a href="/dashboard">Back to dashboard</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-muted">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-foreground text-muted-foreground transition-transform duration-300 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-3 border-b border-border/50 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold leading-tight text-primary-foreground">RobotVerse</p>
            <p className="text-xs text-[#25D366]">WhatsApp Bot</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[#25D366] text-primary-foreground shadow"
                    : "hover:bg-[#25D366]/15 hover:text-primary-foreground",
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-normal">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border/50 px-5 py-4 text-xs text-muted-foreground">
          <p>{WHATSAPP_BOT_VERSION}</p>
          <p className="mt-1">Powered by RobotVerse</p>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-30 bg-foreground/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3 lg:px-8">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="truncate text-sm font-semibold text-muted-foreground">
            {NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))?.label ?? "WhatsApp Bot"}
          </h1>
          <span className="ml-auto hidden rounded-full bg-[#25D366]/10 px-3 py-1 text-xs font-medium text-[#128C7E] sm:block">
            +91 7639 841 220
          </span>
        </header>
        <main className="min-w-0 flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default WhatsAppBotLayout;
