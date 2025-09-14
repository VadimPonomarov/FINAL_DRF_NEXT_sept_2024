import { useEffect, useState } from "react";
import {useSearchParams, useRouter, usePathname} from "next/navigation";
import { Input } from "@/components/ui/input.tsx";

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
      <div className="flex items-center gap-2">
        <span onClick={handleReset} className="text-xs cursor-pointer paginator-reset">💥</span>
        <div className="relative flex items-center">
          <Input
              type="number"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleFocus}
              className="w-[70px] border-none text-xs focus:border-none paginator-input"
              placeholder="Skip"
              style={{ color: 'white' }}
          />
          <div className="absolute right-0 flex flex-col h-full">
            <button
              type="button"
              onClick={handleIncrement}
              className="h-1/2 px-1"
              style={{ color: 'white' }}
            >
              ▲
            </button>
            <button
              type="button"
              onClick={handleDecrement}
              className="h-1/2 px-1"
              style={{ color: 'white' }}
            >
              ▼
            </button>
          </div>
        </div>
      </div>
  );
};

export default SearchParamSkipSelector;
