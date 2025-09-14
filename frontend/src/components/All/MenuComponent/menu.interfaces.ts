import { ReactNode } from "react";
import { AuthProvider } from "@/common/constants/constants";

export interface IMenuItem {
    path: string;
    label: string | ReactNode;
    disabled?: boolean;
    cb?: () => void;
    index: number;
    provider?: AuthProvider; // Опциональное поле для указания провайдера
    tooltip?: string; // Текст всплывающей подсказки
}

export interface IProps {
    children?: React.ReactNode;
    items: IMenuItem[];
    className?: string;
}
