'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'terracotta';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Button({
  className,
  variant = 'primary',
  size = 'md',
  isLoading,
  leftIcon,
  rightIcon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-charcoal text-white hover:bg-deep-sage shadow-lg',
    outline: 'border border-border-light text-muted hover:text-charcoal hover:border-charcoal',
    ghost: 'text-muted hover:text-charcoal hover:bg-hanji-white',
    terracotta: 'bg-terracotta text-white hover:bg-terracotta/90 shadow-lg',
  };

  const sizes = {
    sm: 'py-2 px-4 text-sm',
    md: 'py-3 px-6 text-sm',
    lg: 'py-4 px-8 text-base',
    xl: 'py-6 px-10 text-xl font-serif',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-sm transition-all font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}
