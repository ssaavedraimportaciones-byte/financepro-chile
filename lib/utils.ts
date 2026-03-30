import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina clases de Tailwind de manera inteligente */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Genera un UUID simple (solo para frontend temporal) */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}
