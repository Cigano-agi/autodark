import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props }, ref) => {
        const baseStyles = `
      inline-flex items-center justify-center font-medium 
      transition-all duration-200 ease-out
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
      disabled:pointer-events-none disabled:opacity-50
    `;

        const variants = {
            primary: `
        bg-base-black text-base-white 
        hover:bg-base-gray800 hover:-translate-y-0.5 hover:shadow-md
        active:translate-y-0 active:shadow-sm
        focus-visible:ring-base-gray600
        dark:bg-base-white dark:text-base-black 
        dark:hover:bg-base-gray100
      `,
            secondary: `
        bg-base-gray100 text-base-gray700
        hover:bg-base-gray200 hover:-translate-y-0.5
        active:translate-y-0
        focus-visible:ring-base-gray400
        dark:bg-base-gray800 dark:text-base-gray100
        dark:hover:bg-base-gray700
      `,
            outline: `
        border-2 border-base-gray300 bg-transparent text-base-gray700
        hover:border-base-gray400 hover:bg-base-gray50 hover:-translate-y-0.5
        active:translate-y-0
        focus-visible:ring-base-gray400
        dark:border-base-gray600 dark:text-base-gray200
        dark:hover:border-base-gray500 dark:hover:bg-base-gray800
      `,
            ghost: `
        bg-transparent text-base-gray700
        hover:bg-base-gray100
        active:bg-base-gray200
        focus-visible:ring-base-gray400
        dark:text-base-gray200
        dark:hover:bg-base-gray800
        dark:active:bg-base-gray700
      `,
            destructive: `
        bg-base-negative text-base-white
        hover:bg-base-negativeDark hover:-translate-y-0.5 hover:shadow-md
        active:translate-y-0 active:shadow-sm
        focus-visible:ring-base-negative
      `,
        };

        const sizes = {
            sm: 'h-8 px-3 text-xs rounded',
            md: 'h-10 px-4 text-sm rounded-md',
            lg: 'h-12 px-6 text-base rounded-lg',
        };

        return (
            <button
                ref={ref}
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                disabled={disabled || loading}
                {...props}
            >
                {loading ? (
                    <>
                        <svg
                            className="mr-2 h-4 w-4 animate-spin"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                        Loading...
                    </>
                ) : (
                    children
                )}
            </button>
        );
    }
);

Button.displayName = 'Button';

export { Button };
