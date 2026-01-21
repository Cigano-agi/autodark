import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'elevated' | 'outlined';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = 'default', ...props }, ref) => {
        const baseStyles = `
      rounded-lg p-6
      transition-all duration-200
    `;

        const variants = {
            default: `
        bg-base-white
        dark:bg-base-gray800
      `,
            elevated: `
        bg-base-white shadow-lg
        hover:shadow-xl hover:-translate-y-1
        dark:bg-base-gray800 dark:shadow-black/20
      `,
            outlined: `
        bg-transparent border-2 border-base-gray200
        dark:border-base-gray700
      `,
        };

        return (
            <div
                ref={ref}
                className={cn(baseStyles, variants[variant], className)}
                {...props}
            />
        );
    }
);

Card.displayName = 'Card';

// Card Header
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> { }

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('mb-4', className)}
            {...props}
        />
    )
);

CardHeader.displayName = 'CardHeader';

// Card Title
export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> { }

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
    ({ className, ...props }, ref) => (
        <h3
            ref={ref}
            className={cn(
                'text-xl font-bold text-base-gray900 dark:text-base-white',
                className
            )}
            {...props}
        />
    )
);

CardTitle.displayName = 'CardTitle';

// Card Description
export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> { }

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
    ({ className, ...props }, ref) => (
        <p
            ref={ref}
            className={cn('text-sm text-base-gray500 dark:text-base-gray400', className)}
            {...props}
        />
    )
);

CardDescription.displayName = 'CardDescription';

// Card Content
export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> { }

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('', className)} {...props} />
    )
);

CardContent.displayName = 'CardContent';

// Card Footer
export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> { }

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('mt-4 flex items-center gap-2', className)}
            {...props}
        />
    )
);

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
