"use client";
import { FC } from "react";

interface ButtonGroupProps {
    orientation: "vertical" | "horizontal";
    children: React.ReactNode;
}

const ButtonGroup: FC<ButtonGroupProps> = ({ orientation, children }) => {
    return (
        <div className={`flex ${orientation === "vertical" ? "flex-col" : "flex-row"} justify-center gap-1`}>
            {children}
        </div>
    );
};

export default ButtonGroup;




