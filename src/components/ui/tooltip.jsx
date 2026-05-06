import React from "react"
import { cn } from "@/lib/utils"

const TooltipProvider = ({ children }) => <>{children}</>

const Tooltip = ({ children }) => <div className="relative group inline-block">{children}</div>

const TooltipTrigger = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("", className)} {...props} />
))
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef(({ className, side = "top", sideOffset = 4, ...props }, ref) => {
    const sideClasses = {
        top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
        bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
        left: "right-full top-1/2 -translate-y-1/2 mr-2",
        right: "left-full top-1/2 -translate-y-1/2 ml-2",
    }

    return (
        <div
            ref={ref}
            data-side={side}
            className={cn(
                "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
                "absolute hidden group-hover:block w-max",
                sideClasses[side] || sideClasses.top,
                className
            )}
            {...props}
        />
    )
})
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
