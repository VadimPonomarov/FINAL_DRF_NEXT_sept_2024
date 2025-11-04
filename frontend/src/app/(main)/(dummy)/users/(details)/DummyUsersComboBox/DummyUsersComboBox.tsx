"use client";
import React, { FC, useEffect, useState } from "react";
import { Select, SelectGroup, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectLabel, SelectSeparator } from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IItem } from "@/components/All/ComboBox/interfaces";
import { IDummyAuth } from "@/shared/types/dummy.interfaces";
import { UseFormReset } from "react-hook-form";
import { useI18n } from "@/contexts/I18nContext";

interface IDummyUser {
    id: number;
    email: string;
    username: string;
    password: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    full_name: string;
}

interface IDummyUsersResponse {
    results: IDummyUser[];
    count: number;
}

interface IProps {
    reset?: UseFormReset<IDummyAuth>;
}

const DummyUsersComboBox: FC<IProps> = ({ reset }) => {
    const { t } = useI18n();
    const [users, setUsers] = useState<IItem[]>([]);

    const { data, isLoading, error } = useQuery<IDummyUsersResponse>({
        queryKey: ["dummy-users"],
        queryFn: async () => {
            console.log('[DummyUsersComboBox] Fetching users...');
            const startTime = Date.now();

            const response = await fetch("/api/dummy/users");
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const result = await response.json();

            const endTime = Date.now();
            console.log(`[DummyUsersComboBox] Fetched ${result.data?.count || 0} users in ${endTime - startTime}ms`);

            return result.data; // API возвращает { success: true, data: { results: [], count: number } }
        },
        staleTime: 5 * 60 * 1000, // 5 минут
        retry: 1,
    });

    const queryClient = useQueryClient();

    const onSelect = (id: number) => {
        // Игнорируем клики по сепараторам (отрицательные ID)
        if (id < 0) {
            return;
        }

        const userData = queryClient.getQueryData<IDummyUsersResponse>(["dummy-users"]);
        if (userData && reset) {
            const user = userData.results.find(user => user.id === id);
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
        if (data?.results) {
            console.log('[DummyUsersComboBox] Processing users...', data.results.length);
            const startTime = Date.now();

            const activeUsers = data.results.filter(user => user.is_active);
            console.log('[DummyUsersComboBox] Active users:', activeUsers.length);

            // Простой список пользователей без группировки
            const items: IItem[] = activeUsers
                .sort((a, b) => a.full_name.localeCompare(b.full_name)) // Сортируем по полному имени
                .map(user => ({
                    id: user.id,
                    label: user.full_name,
                    value: user.full_name,
                }));

            setUsers(items);

            const endTime = Date.now();
            console.log(`[DummyUsersComboBox] Processed ${items.length} items in ${endTime - startTime}ms`);
        }
    }, [data]);

    if (isLoading) {
        return (
            <div className="w-full h-10 bg-gray-100 animate-pulse rounded-md flex items-center justify-center">
                <span className="text-gray-500 text-sm">Loading users...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-10 bg-red-50 border border-red-200 rounded-md flex items-center justify-center">
                <span className="text-red-600 text-sm">Error loading users</span>
            </div>
        );
    }

    return (
        <Select onValueChange={(v) => onSelect(parseInt(v, 10))}>
            <SelectTrigger className="w-full">
                <SelectValue placeholder={`Select user... (${users.length} available)`} />
            </SelectTrigger>
            <SelectContent
              position="popper"
              className="max-h-[300px] overflow-y-auto"
              sideOffset={5}
            >
                {users.map((user) => (
                  <SelectItem
                    key={user.id}
                    value={String(user.id)}
                    className="cursor-pointer hover:bg-gray-100 focus:bg-gray-100"
                  >
                    {user.label}
                  </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};

export default DummyUsersComboBox;
