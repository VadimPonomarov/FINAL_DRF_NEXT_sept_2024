"use client";
import {useEffect, useState} from "react";
import {usePathname, useRouter, useSearchParams} from "next/navigation";
import { useTranslation } from '@/contexts/I18nContext';

const SearchParamLimitSelector = () => {
    const t = useTranslation();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [inputValue, setInputValue] = useState(searchParams.get("limit") || "30");
    const pathName = usePathname();

    const handleLimitChange = (value: string) => {
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set("limit", value);
        router.replace(`${pathName}?${newParams.toString()}`);
    };

    const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setInputValue(event.target.value);
        handleLimitChange(event.target.value);
    };

    const handleReset = () => {
        setInputValue("30");
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set("limit", "30");
        router.replace(`${pathName}?${newParams.toString()}`);
    };

    useEffect(() => {
        const handleParamsChange = () => {
            const limit = searchParams.get("limit");
            setInputValue(limit !== null ? limit : "30");
        };

        handleParamsChange();
        window.addEventListener("popstate", handleParamsChange);

        return () => {
            window.removeEventListener("popstate", handleParamsChange);
        };
    }, [searchParams]);

    useEffect(() => {
        const limit = searchParams.get("limit");
        setInputValue(limit !== null ? limit : "30");
    }, [searchParams]);

    return (
        <div className="flex items-center gap-3">
            <span onClick={handleReset} className="text-lg cursor-pointer hover:scale-110 transition-transform duration-200 paginator-reset" title="Reset to default">💥</span>
            <div className="relative">
                <select
                    value={inputValue}
                    onChange={handleSelectChange}
                    className="w-[60px] h-8 bg-transparent text-foreground border-none rounded-none text-xs px-2 focus:outline-none transition-all duration-200 hover:bg-accent hover:text-accent-foreground cursor-pointer paginator-input paginator-select"
                >
                    <option value="0" className="bg-background text-foreground">{t('autoria.all') || 'All'}</option>
                    <option value="10" className="bg-background text-foreground">10</option>
                    <option value="20" className="bg-background text-foreground">20</option>
                    <option value="30" className="bg-background text-foreground">30</option>
                    <option value="40" className="bg-background text-foreground">40</option>
                    <option value="50" className="bg-background text-foreground">50</option>
                </select>
            </div>
        </div>
    );
};

export default SearchParamLimitSelector;









