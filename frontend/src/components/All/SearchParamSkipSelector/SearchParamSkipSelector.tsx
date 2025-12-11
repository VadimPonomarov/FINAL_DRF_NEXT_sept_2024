import { useEffect, useState } from "react";
import {useSearchParams, useRouter, usePathname} from "next/navigation";
import { Input } from "@/components/ui/input";

const SearchParamSkipSelector = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [inputValue, setInputValue] = useState(searchParams.get("skip") || "0");
  const pathName = usePathname()

  const handleSkipChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("skip", value);
    router.replace(`${pathName}?${newParams.toString()}`);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    handleSkipChange(event.target.value);
  };

  const handleReset = () => {
    setInputValue("0");
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("skip", "0");
    router.replace(`${pathName}?${newParams.toString()}`);
  };

  useEffect(() => {
    const handleParamsChange = () => {
      const skip = searchParams.get("skip") || "0";
      setInputValue(skip);
    };

    handleParamsChange();
    window.addEventListener("popstate", handleParamsChange);

    return () => {
      window.removeEventListener("popstate", handleParamsChange);
    };
  }, [searchParams]);

  useEffect(() => {
    const skip = searchParams.get("skip") || "0";
    setInputValue(skip);
  }, [searchParams]);

  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const handleIncrement = () => {
    const newValue = (parseInt(inputValue) + 1).toString();
    setInputValue(newValue);
    handleSkipChange(newValue);
  };

  const handleDecrement = () => {
    if (parseInt(inputValue) > 0) {
      const newValue = (parseInt(inputValue) - 1).toString();
      setInputValue(newValue);
      handleSkipChange(newValue);
    }
  };

  return (
      <div className="flex items-center gap-3">
        <span onClick={handleReset} className="text-lg cursor-pointer hover:scale-110 transition-transform duration-200 paginator-reset" title="Reset to 0">💥</span>
        <div className="relative flex items-center">
          <Input
              type="number"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleFocus}
              className="w-[60px] h-8 bg-transparent text-foreground border-none rounded-none text-xs px-2 pr-6 focus:outline-none transition-all duration-200 hover:bg-accent hover:text-accent-foreground paginator-input [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
              placeholder="Skip"
          />
          <div className="absolute right-0 top-0 h-full flex flex-col">
            <button
              type="button"
              onClick={handleIncrement}
              className="w-4 h-4 flex items-center justify-center text-xs text-muted-foreground hover:text-foreground bg-transparent hover:bg-accent transition-all duration-150"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={handleDecrement}
              className="w-4 h-4 flex items-center justify-center text-xs text-muted-foreground hover:text-foreground bg-transparent hover:bg-accent transition-all duration-150"
            >
              ▼
            </button>
          </div>
        </div>
      </div>
  );
};

export default SearchParamSkipSelector;
