"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cn } from "@/lib/utils"
import {
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface DialogWithCustomOverlayProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {
  overlayClassName?: string;
  children: React.ReactNode;
}

export const DialogWithCustomOverlay = ({
  overlayClassName,
  children,
  ...props
}: DialogWithCustomOverlayProps) => {
  // Находим DialogContent среди дочерних элементов
  const childrenArray = React.Children.toArray(children);

  // Создаем новый DialogContent с кастомным Overlay
  const modifiedChildren = childrenArray.map(child => {
    if (React.isValidElement(child) && child.type === DialogPrimitive.Content) {
      // Создаем кастомный Overlay
      const customOverlay = (
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            overlayClassName
          )}
        />
      );

      // Оборачиваем контент в Portal с кастомным Overlay
      return (
        <DialogPrimitive.Portal key={child.key}>
          {customOverlay}
          {child}
        </DialogPrimitive.Portal>
      );
    }
    return child;
  });

  return (
    <DialogPrimitive.Root {...props}>
      {modifiedChildren}
    </DialogPrimitive.Root>
  );
};

export const {
  Trigger: DialogTrigger,
  Content: DialogContent,
  Close: DialogClose,
} = DialogPrimitive;

export {
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
