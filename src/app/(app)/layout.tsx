import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut, FileText, LayoutDashboard } from "lucide-react";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-52 border-r flex flex-col shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b">
          <FileText className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm tracking-tight">Docs Editor</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 text-sm px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
        </nav>

        {/* Footer */}
        <div className="px-2 py-3 border-t space-y-1">
          <p className="text-xs text-muted-foreground px-3 truncate" title={user.email}>
            {user.email}
          </p>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 text-sm px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
