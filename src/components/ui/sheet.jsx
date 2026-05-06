import React from "react"
import { cn } from "@/lib/utils"

const Sheet = ({ open, onOpenChange, children }) => {
    // Basic state handling if needed, but usually controlled
    return <>{open && <div className="fixed inset-0 z-50 bg-black/80" onClick={() => onOpenChange(false)} />}{open && children}</>
}
const SheetContent = React.forwardRef(({ className, children, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
            className
        )}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking content
        {...props}
    >
        {children}
    </div>
))
SheetContent.displayName = "SheetContent"

const SheetHeader = ({ className, ...props }) => (
    <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />
)
SheetHeader.displayName = "SheetHeader"

const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-lg font-semibold text-foreground", className)} {...props} />
))
SheetTitle.displayName = "SheetTitle"

const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
SheetDescription.displayName = "SheetDescription"

export {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
}
