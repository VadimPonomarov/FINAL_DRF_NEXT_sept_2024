"use client"

import * as React from "react"
import type {
  ToastActionElement,
  ToastProps,
  ToastVariant,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 3000 // 3 секунды по умолчанию для автоматического скрытия
const TOAST_DEBOUNCE_TIME = 500 // Время дебаунса для предотвращения дублирования

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type Action =
  | {
      type: "ADD_TOAST";
      toast: ToasterToast;
    }
  | {
      type: "UPDATE_TOAST";
      toast: Partial<ToasterToast>;
    }
  | {
      type: "DISMISS_TOAST";
      toastId?: ToasterToast["id"];
    }
  | {
      type: "REMOVE_TOAST";
      toastId?: ToasterToast["id"];
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()
const recentToasts = new Map<string, number>() // Для дедупликации

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id"> & {
  variant?: ToastVariant;
};

function toast({ ...props }: Toast) {
  // Создаем ключ для дедупликации на основе title и description
  const dedupeKey = `${props.title || ''}-${props.description || ''}`
  const now = Date.now()

  // Проверяем, был ли недавно показан такой же toast
  const lastShown = recentToasts.get(dedupeKey)
  if (lastShown && (now - lastShown) < TOAST_DEBOUNCE_TIME) {
    console.log('[Toast] Дублирующий toast заблокирован:', dedupeKey)
    return {
      id: '',
      dismiss: () => {},
      update: () => {},
    }
  }

  // Записываем время показа этого toast
  recentToasts.set(dedupeKey, now)

  const id = genId()

  // Устанавливаем duration по умолчанию, если не указан
  const duration = props.duration || TOAST_REMOVE_DELAY

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      duration,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  // Автоматически скрываем toast через указанное время
  setTimeout(() => {
    dismiss()
  }, duration)

  return {
    id: id,
    dismiss,
    update,
  }
}

const toastHelpers = {
  error: (message: string) =>
    toast({ variant: "destructive", title: "Error", description: message }),
  success: (message: string) =>
    toast({ variant: "default", title: "Success", description: message }),
  warning: (message: string) =>
    toast({ variant: "default", title: "Warning", description: message }),
}

type ToastFunction = {
  (props: Toast): {
    id: string;
    dismiss: () => void;
    update: (props: ToasterToast) => void;
  };
  error: (message: string) => void;
  success: (message: string) => void;
  warning: (message: string) => void;
}

const enhancedToast = Object.assign(toast, toastHelpers) as ToastFunction;

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast: enhancedToast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, enhancedToast as toast }
