import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react"; // Добавляем импорт иконки

import styles from "./index.module.css";
import useUniversalFilter from "./useUniversalFilter";

interface UniversalFilterProps<T> {
    queryKey: Array<string>;
    filterKeys: Array<keyof T>;
    cb: (filterParams: { [key in keyof T]?: string }) => void;
    targetArrayKey: string;
    showFilterIcon?: boolean;
}

const UniversalFilter = <T extends object>({
    queryKey,
    filterKeys,
    cb,
    targetArrayKey,
    showFilterIcon = true
}: UniversalFilterProps<T>) => {
    const [isOpen, setIsOpen] = useState(false);
    const {inputValues, handleInputChange, handleFocus, handleReset} =
        useUniversalFilter<T>({
            queryKey,
            filterKeys,
            targetArrayKey,
            cb
        });

    return (
        <div className="w-full h-full">
            {showFilterIcon && (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute top-4 right-4 z-[90]"
                >
                    <Filter className="w-6 h-6" /> {/* Используем импортированную иконку */}
                </button>
            )}
            <div className={styles.container} style={{ backgroundColor: 'var(--background)' }}>
                {filterKeys.map(key => (
                    <div key={String(key)} className={styles.inputContainer}>
                        <label htmlFor={String(key)} className={styles.label}>
                            {String(key).replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </label>
                        <Input
                            id={String(key)}
                            value={inputValues[key] || ""}
                            onChange={e => handleInputChange(key, e.target.value)}
                            onFocus={handleFocus}
                            placeholder={`Enter ${String(key).replace(/([A-Z])/g, ' $1').toLowerCase()}...`}
                            className={styles.input}
                        />
                    </div>
                ))}
                <Button onClick={handleReset} className={styles.button}>
                    Reset Filters
                </Button>
            </div>
        </div>
    );
};

export default UniversalFilter;