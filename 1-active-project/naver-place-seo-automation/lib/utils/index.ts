import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 클래스명 병합 유틸리티
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

