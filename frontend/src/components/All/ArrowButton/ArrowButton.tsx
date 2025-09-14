"use client"
import { FC } from 'react';
import {ArrowRightIcon} from "lucide-react";
import {useRouter} from "next/navigation";

interface IconButtonProps {
    url: string;
}

const IconButton: FC<IconButtonProps> = ({ url }) => {
    const router = useRouter();

    const handleClick = () => {
        router.push(url);
    };

    return (
        <button
            onClick={handleClick}
            className="p-1 bg-blue-500 hover:bg-blue-700 text-white rounded-full"
        >
            <ArrowRightIcon className="w-6 h-6" />
        </button>
    );
};

export default IconButton;


