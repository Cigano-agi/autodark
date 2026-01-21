import * as React from 'react';
import { cn } from '@/lib/utils';

type TypographyVariant =
    | 'display1'
    | 'display2'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6'
    | 'bodyLarge'
    | 'body'
    | 'bodySmall'
    | 'caption'
    | 'label';

type TypographyColor = 'default' | 'muted' | 'accent' | 'positive' | 'negative' | 'warning';

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
    variant?: TypographyVariant;
    color?: TypographyColor;
    as?: React.ElementType;
}

const variantStyles: Record<TypographyVariant, string> = {
    display1: 'text-[96px] leading-[112px] font-bold tracking-[-1.5px]',
    display2: 'text-[60px] leading-[72px] font-bold tracking-[-0.5px]',
    h1: 'text-5xl leading-[56px] font-bold tracking-[0px]',
    h2: 'text-[34px] leading-[42px] font-bold tracking-[0.25px]',
    h3: 'text-2xl leading-8 font-bold tracking-[0px]',
    h4: 'text-xl leading-7 font-bold tracking-[0.15px]',
    h5: 'text-lg leading-6 font-bold tracking-[0px]',
    h6: 'text-base leading-[22px] font-bold tracking-[0.15px]',
    bodyLarge: 'text-base leading-6 font-normal tracking-[0.5px]',
    body: 'text-sm leading-5 font-normal tracking-[0.25px]',
    bodySmall: 'text-xs leading-4 font-normal tracking-[0.4px]',
    caption: 'text-[11px] leading-[14px] font-normal tracking-[0.4px]',
    label: 'text-xs leading-4 font-medium tracking-[0.5px] uppercase',
};

const colorStyles: Record<TypographyColor, string> = {
    default: 'text-base-gray900 dark:text-base-white',
    muted: 'text-base-gray500 dark:text-base-gray400',
    accent: 'text-base-accent dark:text-base-accent',
    positive: 'text-base-positive',
    negative: 'text-base-negative',
    warning: 'text-base-warning',
};

const defaultElements: Record<TypographyVariant, React.ElementType> = {
    display1: 'h1',
    display2: 'h1',
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4',
    h5: 'h5',
    h6: 'h6',
    bodyLarge: 'p',
    body: 'p',
    bodySmall: 'p',
    caption: 'span',
    label: 'span',
};

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
    ({ className, variant = 'body', color = 'default', as, children, ...props }, ref) => {
        const Component = as || defaultElements[variant];

        return (
            <Component
                ref={ref}
                className={cn(variantStyles[variant], colorStyles[color], className)}
                {...props}
            >
                {children}
            </Component>
        );
    }
);

Typography.displayName = 'Typography';

export { Typography };
