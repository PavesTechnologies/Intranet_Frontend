import React, { useState, useRef, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef(({ className, value, onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => {
    // Ensure value is always an array
    const values = Array.isArray(value) ? value : [value || min]
    const trackRef = useRef(null)
    const [isDragging, setIsDragging] = useState(null) // null, 0 (min handle), or 1 (max handle)

    // Calculate percentage for a given value
    const getPercentage = useCallback((val) => {
        return ((val - min) / (max - min)) * 100
    }, [min, max])

    // Convert pointer position to value
    const getValueFromPointer = useCallback((clientX) => {
        if (!trackRef.current) return min

        const rect = trackRef.current.getBoundingClientRect()
        const percentage = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
        const rawValue = min + (percentage / 100) * (max - min)

        // Snap to step
        const steppedValue = Math.round(rawValue / step) * step
        // Clamp
        return Math.min(max, Math.max(min, steppedValue))
    }, [min, max, step])

    const handlePointerDown = (index, e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(index)
        e.target.setPointerCapture(e.pointerId)
    }

    const handlePointerMove = useCallback((e) => {
        if (isDragging === null) return

        const newValue = getValueFromPointer(e.clientX)
        const newValues = [...values]

        // If range slider (2 thumbs)
        if (values.length === 2) {
            // Prevent crossover
            if (isDragging === 0) {
                newValues[0] = Math.min(newValue, newValues[1])
            } else {
                newValues[1] = Math.max(newValue, newValues[0])
            }
        } else {
            newValues[0] = newValue
        }

        if (onValueChange) {
            onValueChange(newValues)
        }
    }, [isDragging, values, getValueFromPointer, onValueChange])

    const handlePointerUp = (e) => {
        if (isDragging !== null) {
            setIsDragging(null)
            e.target.releasePointerCapture(e.pointerId)
        }
    }

    // Styles for track
    const percentages = values.map(getPercentage)
    const start = values.length > 1 ? percentages[0] : 0
    const end = values.length > 1 ? percentages[1] : percentages[0]

    return (
        <div
            ref={ref}
            className={cn("relative flex w-full touch-none select-none items-center h-5 cursor-pointer", className)}
            {...props}
        >
            {/* Track background */}
            <div
                ref={trackRef}
                className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary"
            >
                {/* Active Range */}
                <div
                    className="absolute h-full bg-primary transition-all duration-75"
                    style={{ left: `${start}%`, width: `${end - start}%` }}
                />
            </div>

            {/* Thumbs */}
            {values.map((val, index) => (
                <div
                    key={index}
                    className={cn(
                        "absolute block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110",
                        isDragging === index ? "cursor-grabbing scale-110 shadow-md" : "cursor-grab"
                    )}
                    style={{ left: `calc(${percentages[index]}% - 10px)` }}
                    onPointerDown={(e) => handlePointerDown(index, e)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    // For accessibility
                    role="slider"
                    aria-valuenow={val}
                    aria-valuemin={min}
                    aria-valuemax={max}
                    tabIndex={0}
                />
            ))}
        </div>
    )
})
Slider.displayName = "Slider"

export { Slider }
