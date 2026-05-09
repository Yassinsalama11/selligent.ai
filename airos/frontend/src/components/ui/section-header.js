import * as React from "react"
import { cn } from "@/lib/utils"

export function SectionHeader({ title, description, className, children, ...props }) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4", className)} {...props}>
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
          {children}
        </div>
      )}
    </div>
  )
}
