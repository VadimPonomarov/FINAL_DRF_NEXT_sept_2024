import styles from "@/app/(main)/users/(details)/UserCard/index.module.css";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,} from "@/components/ui/card.tsx";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar.tsx";
import clsx from "clsx";
import { IUser } from "@/common/interfaces/users.interfaces";
import { IRecipesResponse } from "@/common/interfaces/recipe.interfaces";
import { FC } from "react";

interface IProps {
  user: IUser;
  recipes: IRecipesResponse;
}

const UserDetailsComponent: FC<IProps> = ({ user }) => {
  return (
    <div className="flex justify-center items-center w-full h-full">
      <Card
        className={clsx(
          styles.card,
          "w-[400px] mx-auto max-h-[calc(100vh-80px)] overflow-auto",
        )}
      >
        <div className="m-4 p-2 text-left">
          <Avatar>
            <AvatarImage src={user.image} alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </div>
        <CardHeader>
          <CardTitle>
            {user.id}: {user.firstName} {user.lastName}
          </CardTitle>
          <CardDescription>Age: {user.age}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{user.phone}</p>
          <p>{user.role}</p>
        </CardContent>
        <CardFooter>
          <p className="text-small">{user.email}</p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default UserDetailsComponent;

