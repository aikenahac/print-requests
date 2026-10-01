import Link from "next/link"
import { Box, Layers3, LogOut, Plus, Settings2, Users } from "lucide-react"
import { logout } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export function AppShell({ username, admin, children }: { username: string; admin: boolean; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <Link href={admin ? "/admin" : "/"} className="flex items-center gap-3 font-semibold tracking-tight">
            <span className="grid size-9 place-items-center bg-primary text-primary-foreground"><Box className="size-5" /></span>
            <span>Print Queue <span className="text-xs font-normal text-muted-foreground">friends edition</span></span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">Signed in as <strong className="text-foreground">{username}</strong></span>
            <form action={logout}><Button type="submit" variant="ghost" size="sm"><LogOut /> Sign out</Button></form>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-6xl gap-8 px-5 py-8">
        <nav className="hidden w-44 shrink-0 space-y-1 md:block">
          {admin ? <><NavLink href="/admin" icon={<Layers3 />} label="Queue" /><NavLink href="/admin/users" icon={<Users />} label="Friends" /><NavLink href="/admin/filaments" icon={<Settings2 />} label="Filaments" /></> : <><NavLink href="/" icon={<Layers3 />} label="My requests" /><NavLink href="/requests/new" icon={<Plus />} label="New request" /><NavLink href="/change-password" icon={<Settings2 />} label="Password" /></>}
          <Separator className="my-4" />
        </nav>
        <main className="min-w-0 flex-1">
          <div className="mb-6 flex flex-wrap gap-2 md:hidden">
            {admin ? <><MobileLink href="/admin" label="Queue" /><MobileLink href="/admin/users" label="Friends" /><MobileLink href="/admin/filaments" label="Filaments" /></> : <><MobileLink href="/" label="My requests" /><MobileLink href="/requests/new" label="New request" /><MobileLink href="/change-password" label="Password" /></>}
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}

function NavLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return <Button variant="ghost" className="w-full justify-start" nativeButton={false} render={<Link href={href} />}>{icon}{label}</Button>
}

function MobileLink({ href, label }: { href: string; label: string }) {
  return <Button variant="outline" size="sm" nativeButton={false} render={<Link href={href} />}>{label}</Button>
}
