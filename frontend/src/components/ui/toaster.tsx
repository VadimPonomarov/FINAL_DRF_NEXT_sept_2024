"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1 relative">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
              {/* Прогресс-бар для таймаута */}
              <div className="absolute bottom-0 left-0 h-1 bg-white/20 w-full">
                <div
                  className={`h-full ${props.variant === 'destructive' ? 'bg-red-400' : 'bg-white'} animate-progress`}
                  style={{
                    animationDuration: `${props.duration || 3000}ms`,
                  }}
                />
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
