import { FC } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface IProps {
  children: React.ReactNode;
}

const SimpleAlert: FC<IProps> = ({ children }) => {
  return (
    <div className={"w-screen h-screen flex items-center justify-center"}>
      <div className="bg-white rounded-xl shadow-lg p-4">
        <Alert>
          <AlertDescription className={"flex flex-col text-center"}>
            {children}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
};

export default SimpleAlert;
