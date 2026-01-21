import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    inputSize?: 'sm' | 'md' | 'lg';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, helperText, inputSize = 'md', type = 'text', id, ...props }, ref) => {
        const inputId = id || `input-${React.useId()}`;

        const baseStyles = `
      w-full border bg-transparent
      transition-all duration-200 ease-out
      placeholder:text-base-gray400
      focus:outline-none focus:ring-2 focus:ring-offset-0
      disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-base-gray100
      dark:disabled:bg-base-gray800
    `;

        const stateStyles = error
            ? `
          border-base-negative text-base-negative
          focus:border-base-negative focus:ring-base-negative/20
        `
            : `
          border-base-gray300 text-base-gray700
          focus:border-base-accent focus:ring-base-accent/20
          dark:border-base-gray600 dark:text-base-gray100
          dark:focus:border-base-accent
        `;

        const sizes = {
            sm: 'h-8 px-3 text-xs rounded',
            md: 'h-10 px-4 text-sm rounded-md',
            lg: 'h-12 px-4 text-base rounded-lg',
        };

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="mb-1.5 block text-sm font-medium text-base-gray700 dark:text-base-gray200"
                    >
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    type={type}
                    className={cn(baseStyles, stateStyles, sizes[inputSize], className)}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
                    {...props}
                />
                {error && (
                    <p id={`${inputId}-error`} className="mt-1.5 text-xs text-base-negative">
                        {error}
                    </p>
                )}
                {helperText && !error && (
                    <p id={`${inputId}-helper`} className="mt-1.5 text-xs text-base-gray500">
                        {helperText}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export { Input };
