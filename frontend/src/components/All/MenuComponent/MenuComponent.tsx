import React, { FC } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from "clsx";
import { Menubar, MenubarMenu, MenubarTrigger } from "@radix-ui/react-menubar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@radix-ui/react-tooltip";

import { IProps } from "./menu.interfaces";
import css from "./menu.module.css";

const MenuComponent: FC<IProps> = ({ items, className }) => {
    const pathName = usePathname();

    return (
        <Menubar className={clsx(css.menu, css.menubar, className || "")}>
            {items.map((item, index) => (
                !item.disabled && (
                    <span key={`${item.path}-${item.index || index}`} className="relative">
                        <MenubarMenu>
                            {item.cb ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        console.log('MenuComponent onClick triggered');
                                        console.log('item.cb:', item.cb);
                                        console.log('typeof item.cb:', typeof item.cb);
                                        try {
                                            if (item.cb && typeof item.cb === 'function') {
                                                console.log('About to call item.cb()');
                                                item.cb();
                                                console.log('item.cb() completed');
                                            } else {
                                                console.error('Callback is not a function:', item.cb);
                                            }
                                        } catch (error) {
                                            console.error('Error executing callback:', error);
                                            console.error('Error stack:', error.stack);
                                        }
                                    }}
                                    className={clsx(
                                        css.menuTrigger,
                                        "transition-all duration-200 hover:scale-105 cursor-pointer bg-transparent border-none outline-none",
                                        item.path === pathName && css.active
                                    )}
                                >
                                    {typeof item.label === 'string' ? (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="relative px-2 py-0">
                                                        {item.label}
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{item.tooltip || item.label}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    ) : (
                                        <span className="relative px-2 py-0">
                                            {item.label}
                                        </span>
                                    )}
                                </button>
                            ) : (
                                <Link
                                    href={item.path}
                                    onClick={(e) => {
                                        // Добавляем небольшую задержку для предотвращения двойных кликов
                                        e.currentTarget.style.pointerEvents = 'none';
                                        setTimeout(() => {
                                            if (e.currentTarget) {
                                                e.currentTarget.style.pointerEvents = 'auto';
                                            }
                                        }, 300);
                                    }}
                                    className={clsx(
                                        "transition-all duration-200 hover:scale-105 cursor-pointer", // Добавляем cursor-pointer
                                        item.path === pathName && css.active
                                    )}
                                >
                                    {typeof item.label === 'string' ? (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <MenubarTrigger
                                                        className={clsx(
                                                            css.menuTrigger,
                                                            css.menubarTrigger
                                                        )}
                                                    >
                                                        <span className="relative px-2 py-0">
                                                            {item.label}
                                                        </span>
                                                    </MenubarTrigger>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{item.tooltip || item.label}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    ) : (
                                        <MenubarTrigger
                                            className={clsx(
                                                css.menuTrigger,
                                                "menubar-trigger focus:outline-none focus-visible:outline-none hover:outline-none ring-0 focus:ring-0"
                                            )}
                                        >
                                            <span className="relative px-2 py-0">
                                                {item.label}
                                            </span>
                                        </MenubarTrigger>
                                    )}
                                </Link>
                            )}
                        </MenubarMenu>
                    </span>
                )
            ))}
        </Menubar>
    );
};

export default MenuComponent;