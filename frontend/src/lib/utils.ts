import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Debounce: delays invoking `fn` until after `delay` ms have elapsed
export function debounce<F extends (...args: any[]) => any>(
  fn: F,
  delay = 300
) {
  let timer: ReturnType<typeof setTimeout> | null = null
  return function(this: unknown, ...args: Parameters<F>): void {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

// Throttle: ensures `fn` is called at most once every `limit` ms
export function throttle<F extends (...args: any[]) => any>(
  fn: F,
  limit = 300
) {
  let inThrottle = false
  return function(this: unknown, ...args: Parameters<F>): void {
    if (!inThrottle) {
      fn.apply(this, args)
      inThrottle = true
      setTimeout(() => { inThrottle = false }, limit)
    }
  }
}
