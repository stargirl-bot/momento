import * as React from "react"
import { MainNav } from "@/components/MainNav"
import { cn } from "@/lib/utils"

export function AppShell({
  children,
  width = "default",
}: {
  children: React.ReactNode
  /** "wide" gives multi-column screens room next to the nav rail. */
  width?: "default" | "wide"
}) {
  return (
    <div className="flex min-h-screen bg-page text-ink-body">
      <MainNav />
      <main className="min-w-0 flex-1 px-6 py-8 sm:px-10">
        <div className={cn("mx-auto", width === "wide" ? "max-w-6xl" : "max-w-4xl")}>
          {children}
        </div>
      </main>
    </div>
  )
}
