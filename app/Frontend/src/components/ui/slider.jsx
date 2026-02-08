import * as React from "react"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef(({ className, min, max, step, value, onValueChange, ...props }, ref) => {
  const handleChange = (e) => {
    if (onValueChange) {
      onValueChange([parseFloat(e.target.value)])
    }
  }

  // Handle both array value (Radix style) and single value (native style)
  const val = Array.isArray(value) ? value[0] : value

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={val}
      onChange={handleChange}
      className={cn(
        "flex h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Slider.displayName = "Slider"

export { Slider }
