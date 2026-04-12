import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
};

export const getHealthColor = (health: string): string => {
  switch (health) {
    case 'green':
      return 'bg-health-green';
    case 'yellow':
      return 'bg-health-yellow';
    case 'red':
      return 'bg-health-red';
    default:
      return 'bg-health-green';
  }
};
