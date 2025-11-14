import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-[8px] font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-[3px] [&_svg]:shrink-0 transform hover:scale-105 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-b from-purple-900 to-purple-600 text-white hover:from-purple-800 hover:to-purple-500 shadow-lg hover:shadow-purple-500/50 hover:shadow-xl",
        destructive:
          "bg-gradient-to-b from-red-700 to-red-500 text-white hover:from-red-600 hover:to-red-400 shadow-lg hover:shadow-xl",
        outline:
          "border-2 border-purple-500 bg-gradient-to-b from-purple-900/30 to-purple-700/30 text-purple-300 hover:from-purple-800 hover:to-purple-600 hover:text-white hover:border-purple-400 shadow-lg hover:shadow-purple-500/50 hover:shadow-xl",
        secondary:
          "bg-gradient-to-b from-purple-950 to-purple-800 text-white hover:from-purple-900 hover:to-purple-700 shadow-lg hover:shadow-purple-500/50 hover:shadow-xl",
        ghost: "bg-gradient-to-b from-purple-950/50 to-purple-800/50 text-purple-300 hover:from-purple-900/70 hover:to-purple-700/70 hover:text-purple-200 hover:shadow-lg hover:shadow-purple-500/30",
        link: "bg-gradient-to-b from-transparent to-transparent text-purple-400 underline-offset-4 hover:from-purple-900/30 hover:to-purple-700/30 hover:text-purple-300 hover:no-underline px-0",
        golden: "bg-gradient-to-b from-purple-900 to-purple-600 text-white hover:from-purple-800 hover:to-purple-500 shadow-lg hover:shadow-purple-400/50 hover:shadow-xl font-bold",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 rounded-lg px-4",
        lg: "h-14 rounded-lg px-8",
        xs: "h-8 rounded-md px-3 py-1 text-[8px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
