import * as React from 'react';
import { cn } from '@/lib/utils';

// Container
export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const containerSizes = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full',
};

const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
    ({ className, size = 'lg', ...props }, ref) => (
        <div
            ref={ref}
            className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', containerSizes[size], className)}
            {...props}
        />
    )
);

Container.displayName = 'Container';

// Stack
export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
    direction?: 'vertical' | 'horizontal';
    gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
    align?: 'start' | 'center' | 'end' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around';
}

const gapClasses = {
    0: 'gap-0',
    1: 'gap-1',
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    5: 'gap-5',
    6: 'gap-6',
    8: 'gap-8',
    10: 'gap-10',
    12: 'gap-12',
};

const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
};

const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
};

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
    (
        {
            className,
            direction = 'vertical',
            gap = 4,
            align = 'stretch',
            justify = 'start',
            ...props
        },
        ref
    ) => (
        <div
            ref={ref}
            className={cn(
                'flex',
                direction === 'vertical' ? 'flex-col' : 'flex-row',
                gapClasses[gap],
                alignClasses[align],
                justifyClasses[justify],
                className
            )}
            {...props}
        />
    )
);

Stack.displayName = 'Stack';

// Grid
export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
    columns?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
    gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
}

const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    12: 'grid-cols-12',
};

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
    ({ className, columns = 3, gap = 4, ...props }, ref) => (
        <div
            ref={ref}
            className={cn('grid', columnClasses[columns], gapClasses[gap], className)}
            {...props}
        />
    )
);

Grid.displayName = 'Grid';

// Box (generic container with padding/margin shortcuts)
export interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
    padding?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 10 | 12;
}

const paddingClasses = {
    0: 'p-0',
    1: 'p-1',
    2: 'p-2',
    3: 'p-3',
    4: 'p-4',
    5: 'p-5',
    6: 'p-6',
    8: 'p-8',
    10: 'p-10',
    12: 'p-12',
};

const Box = React.forwardRef<HTMLDivElement, BoxProps>(
    ({ className, padding = 0, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(paddingClasses[padding], className)}
            {...props}
        />
    )
);

Box.displayName = 'Box';

export { Container, Stack, Grid, Box };
