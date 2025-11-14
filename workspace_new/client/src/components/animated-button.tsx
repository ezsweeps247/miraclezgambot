import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface AnimatedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  className?: string;
  animation?: 'pulse' | 'bounce' | 'glow' | 'scale' | 'none';
}

export function AnimatedButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  className,
  animation = 'scale'
}: AnimatedButtonProps) {
  const baseClasses = "transition-all duration-200 ease-in-out transform";
  
  const variantClasses = {
    primary: "bg-casino-neon hover:bg-casino-neon/80 text-casino-dark font-bold",
    secondary: "bg-casino-accent hover:bg-casino-accent/80 text-white",
    ghost: "bg-transparent hover:bg-casino-neon/10 text-casino-neon",
    destructive: "bg-casino-red hover:bg-casino-red/80 text-white"
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-[8px]",
    md: "px-4 py-2 text-[10px]",
    lg: "px-6 py-3 text-[10px]"
  };

  const animationClasses = {
    pulse: loading ? "animate-pulse" : "hover:animate-pulse",
    bounce: "hover:animate-bounce",
    glow: "pulse-glow",
    scale: "micro-button",
    none: ""
  };

  const disabledClasses = disabled || loading 
    ? "opacity-50 cursor-not-allowed" 
    : "cursor-pointer";

  return (
    <Button
      onClick={disabled || loading ? undefined : onClick}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        animationClasses[animation],
        disabledClasses,
        className
      )}
      disabled={disabled || loading}
    >
      <div className="flex items-center gap-2">
        {loading && (
          <div style={{width: '3.5px', height: '3.5px'}} className="border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {Icon && !loading && (
          <Icon className={cn(
            "transition-transform duration-200",
            animation === 'bounce' && "hover:animate-bounce",
            size === 'sm' ? "w-4 h-4" style={{width: '3.5px', height: '3.5px'}} : size === 'md' ? "w-5 h-5" style={{width: '3.5px', height: '3.5px'}} : "w-6 h-6" style={{width: '3.5px', height: '3.5px'}}
          )} />
        )}
        {children}
      </div>
    </Button>
  );
}