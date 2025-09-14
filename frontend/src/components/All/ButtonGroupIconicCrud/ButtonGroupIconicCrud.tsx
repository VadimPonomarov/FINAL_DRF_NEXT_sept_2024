"use client";
import { FC } from "react";
import { PencilSquareIcon } from "@heroicons/react/16/solid";
import { PlusCircleIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IProps {
  orientation: "vertical" | "horizontal";
  onEditAction?: () => void;
  onDeleteAction?: () => void;
  onCreateAction?: () => void;
}

export const ButtonGroupIconicCrud: FC<IProps> = ({
  orientation,
  onEditAction,
  onDeleteAction,
  onCreateAction,
}) => {
  return (
    <div
      className={`flex ${orientation === "vertical" ? "flex-col" : "flex-row"} justify-center gap-2 align-middle`}
    >
      {onCreateAction && (
        <Button variant="default" className={"p-0"} onClick={onCreateAction}>
          <PlusCircleIcon />
        </Button>
      )}
      {onEditAction && (
        <Button variant="default" className={"p-0"} onClick={onEditAction}>
          <PencilSquareIcon />
        </Button>
      )}
      {onDeleteAction && (
        <Button variant="default" className={"p-0"} onClick={onDeleteAction}>
          <Trash2Icon />
        </Button>
      )}
    </div>
  );
};

export default ButtonGroupIconicCrud;
