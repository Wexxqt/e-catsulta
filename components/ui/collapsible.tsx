"use client"

import * as React from "react"
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import { cn } from "@/lib/utils"

// Base Root component
const Collapsible = CollapsiblePrimitive.Root

// Trigger component
const CollapsibleTrigger = CollapsiblePrimitive.Trigger

// Content component with animation and forwarding ref
const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content>
>(({ className, ...props }, ref) => (
  <CollapsiblePrimitive.Content
    ref={ref}
    className={cn(
      "overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
      className
    )}
    {...props}
  />
))

CollapsibleContent.displayName = "CollapsibleContent"

// Export all parts as named exports
export {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
}
