"use client";
import React, { FC, useEffect, useState } from "react";
import ComboBox from "@/components/All/ComboBox/ComboBox";
import { IUser, IUsersResponse } from "@/common/interfaces/users.interfaces";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IItem } from "@/components/All/ComboBox/interfaces";
import { IDummyAuth } from "@/common/interfaces/dummy.interfaces";
import { UseFormReset } from "react-hook-form";

interface IProps {
    reset?: UseFormReset<IDummyAuth>;
}

const UsersComboBox: FC<IProps> = ({ reset }) => {
    const [users, setUsers] = useState<IItem[]>([]);
    
    const { data } = useQuery<IUsersResponse>({
        queryKey: ["users"],
        queryFn: async () => {
            const response = await fetch("https://dummyjson.com/users");
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        },
        staleTime: Infinity,
    });

    const queryClient = useQueryClient();

    const onSelect = (id: number) => {
        const userData = queryClient.getQueryData<IUsersResponse>(["users"]);
        if (userData && reset) {
            const user = userData.users.find(user => user.id === id);
            if (user) {
                reset({
                    username: user.username,
                    password: user.password,
                    expiresInMins: 30
                });
            }
        }
    };

    useEffect(() => {
        if (data?.users) {
            setUsers(
                data.users
                    .map((item: IUser) => ({
                        id: item.id,
                        label: [item.firstName, item.lastName].join(" "),
                        value: [item.firstName, item.lastName].join(" "),
                    }))
                    .sort((a, b) => (a.label > b.label ? 1 : -1))
            );
        }
    }, [data]);

    return <ComboBox items={users} onSelect={onSelect} />;
};

export default UsersComboBox;