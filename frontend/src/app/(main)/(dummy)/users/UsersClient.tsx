"use client";
import {FC} from "react";
import {IUser, IUsersResponse} from "@/shared/types/users.interfaces.ts";
import {UserCard} from "@/app/(main)/(dummy)/users/(details)/UserCard/UserCard";
import InfiniteScroll from "@/components/All/InfiniteScroll/InfiniteScroll";
import {PaginationComponent} from "@/components/All/PaginationComponent/PaginationComponent";
import UniversalFilter from "@/components/All/UniversalFilter/FilterInput";
import DialogModal from "@/components/All/DialogModal/DialogModal";
import {useSearchParams} from "next/navigation";
import {motion} from "framer-motion";

import {useUsers} from "./useUsers.ts";

interface IProps {
    initialData: IUsersResponse;
}

const UsersClient: FC<IProps> = ({initialData}) => {
    console.log('[UsersClient] Rendering with initialData:', initialData?.total || 'Error');

    const baseUrl = "/users";
    const searchParams = useSearchParams();
    const limit = searchParams.get("limit");
    const skip = searchParams.get("skip");

    // Добавляем key для перерендеринга при изменении параметров URL
    const urlKey = `${limit}-${skip}`;
    console.log('[UsersClient] URL key:', urlKey);

    const {filteredUsers, handleNextPage, isFetchingNextPage, hasNextPage, total, filterUsers} = useUsers({
        initialData,
    });

    return (
        <>
            <div className={"fixed top-[80px] z-50"}>
                <PaginationComponent total={total} baseUrl={baseUrl}/>
            </div>
            <div className="w-screen flex items-center justify-center">
                <DialogModal>
                    <UniversalFilter<IUser>
                        queryKey={["users", limit, skip]}
                        filterKeys={[
                            "id",
                            "username",
                            "firstName",
                            "lastName",
                            "email",
                            "age",
                            "gender",
                            "role",
                            "phone",
                        ]}
                        cb={filterUsers}
                        targetArrayKey="users"
                    />
                </DialogModal>
            </div>
            <InfiniteScroll key={urlKey} isLoading={isFetchingNextPage} hasMore={!!hasNextPage} next={handleNextPage}>
                <motion.div className={"flex flex-wrap gap-8 justify-center"}
                            initial={{opacity: 0, scale: 0.5}}
                            animate={{opacity: 1, scale: 1}}
                            transition={{
                                duration: 0.8,
                                delay: 0.5,
                                ease: [0, 0.71, 0.2, 1.01],
                            }}>
                    {filteredUsers.sort((a, b) => a.id > b.id ? 1 : -1).map((user: IUser) => (
                        <div key={user.id}>
                            <UserCard item={user}/>
                        </div>
                    ))}
                </motion.div>
            </InfiniteScroll>
        </>
    );
};

export default UsersClient;

