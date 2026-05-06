import React, { useState, createContext, useContext, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, Check } from "lucide-react"

const SelectContext = createContext({
    open: false,
    setOpen: () => { },
    value: "",
    onValueChange: () => { },
    labels: {}, // Map values to labels for display
    addLabel: () => { }
})

const Select = ({ children, value, onValueChange, defaultValue }) => {
    const [open, setOpen] = useState(false)
    const [selectedValue, setSelectedValue] = useState(value || defaultValue)
    const [labels, setLabels] = useState({})

    // Sync controlled value
    useEffect(() => {
        if (value !== undefined) setSelectedValue(value)
    }, [value])

    const handleValueChange = (val) => {
        setSelectedValue(val)
        if (onValueChange) onValueChange(val)
        setOpen(false)
    }

    const addLabel = (val, label) => {
        setLabels(prev => ({ ...prev, [val]: label }))
    }

    const containerRef = useRef(null)

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    return (
        <SelectContext.Provider value={{ open, setOpen, value: selectedValue, onValueChange: handleValueChange, labels, addLabel }}>
            <div ref={containerRef} className="relative inline-block w-full text-left">{children}</div>
        </SelectContext.Provider>
    )
}

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
    const { open, setOpen } = useContext(SelectContext)
    return (
        <button
            ref={ref}
            type="button" // Prevent form submission
            onClick={() => setOpen(!open)}
            className={cn(
                "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        >
            {children}
            <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
        </button>
    )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue = ({ placeholder, className }) => {
    const { value, labels } = useContext(SelectContext)
    const display = labels[value] 

    return (
        <span className={cn("block truncate", className)}>
            {display || <span className="text-muted-foreground">{placeholder}</span>}
        </span>
    )
}

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => {
    const { open } = useContext(SelectContext)
    if (!open) return null

    return (
        <div
            ref={ref}
            className={cn(
                "absolute z-50 min-w-[8rem] overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 mt-1 w-full max-h-96",
                className
            )}
            {...props}
        >
            <div className="p-1">{children}</div>
        </div>
    )
})
SelectContent.displayName = "SelectContent"

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)} {...props} />
))
SelectLabel.displayName = "SelectLabel"

const SelectItem = React.forwardRef(({ className, children, value, ...props }, ref) => {
    const { onValueChange, value: selectedValue, addLabel } = useContext(SelectContext)

    // Register label
    useEffect(() => {
        if (value && children) {
            addLabel(value, children)
        }
    }, [value, children, addLabel])

    return (
        <div
            ref={ref}
            className={cn(
                "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                selectedValue === value && "bg-accent text-accent-foreground",
                className
            )}
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onValueChange(value)
            }}
            {...props}
        >
            <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                {selectedValue === value && <Check className="h-4 w-4" />}
            </span>
            <span className="truncate">{children}</span>
        </div>
    )
})
SelectItem.displayName = "SelectItem"

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("-mx-1 my-1 h-px bg-muted", className)} {...props} />
))
SelectSeparator.displayName = "SelectSeparator"

// Exports
const SelectGroup = ({ children }) => <div>{children}</div>

export {
    Select,
    SelectGroup,
    SelectValue,
    SelectTrigger,
    SelectContent,
    SelectLabel,
    SelectItem,
    SelectSeparator,
}
