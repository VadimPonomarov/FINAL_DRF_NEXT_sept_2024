"use client";
import React, { FC, useEffect, useState } from "react";
import { Select, SelectGroup, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectLabel, SelectSeparator } from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IItem } from "@/components/All/ComboBox/interfaces";
import { IBackendAuthCredentials } from "@/shared/types/auth.interfaces";
import { UseFormReset } from "react-hook-form";
import { useI18n } from "@/contexts/I18nContext";

interface IBackendUser {
    id: number;
    email: string;
    is_active: boolean;
    is_staff: boolean;
    is_superuser: boolean;
    profile?: {
        name?: string;
        surname?: string;
    };
    account?: {
        account_type?: string;
        is_premium?: boolean;
    };
    account_adds?: {
        account_type?: string;
        is_premium?: boolean;
        role?: string;
        organization_name?: string;
    };
}

interface IBackendUsersResponse {
    results: IBackendUser[];
    count: number;
}

interface IProps {
    reset?: UseFormReset<IBackendAuthCredentials>;
}

const BackendUsersComboBox: FC<IProps> = ({ reset }) => {
    const { t } = useI18n();
    const [users, setUsers] = useState<IItem[]>([]);
    const [groups, setGroups] = useState<{ super: IItem[]; premium: IItem[]; regular: IItem[] }>({ super: [], premium: [], regular: [] });


    const { data, isLoading, error } = useQuery<IBackendUsersResponse>({
        queryKey: ["backend-users"],
        queryFn: async () => {
            console.log('[BackendUsersComboBox] Fetching public users list...');
            const startTime = Date.now();

            const response = await fetch("/api/autoria/users");
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const result = await response.json();

            const endTime = Date.now();
            console.log(`[BackendUsersComboBox] Fetched ${result.data?.count || 0} users in ${endTime - startTime}ms`);

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

        const userData = queryClient.getQueryData<IBackendUsersResponse>(["backend-users"]);
        if (userData && reset) {
            const user = userData.results.find(user => user.id === id);
            if (user) {
                reset({
                    email: user.email,
                    password: "12345678" // Пароль по умолчанию
                });
            }
        }
    };

    useEffect(() => {
        if (data?.results) {
            console.log('[BackendUsersComboBox] Processing users...', data.results.length);
            const startTime = Date.now();

            const activeUsers = data.results.filter(user => user.is_active);
            console.log('[BackendUsersComboBox] Active users:', activeUsers.length);

            // Разделяем пользователей по наивысшему полномочию (иерархия: superuser > staff > premium > regular)
            const superUsers = activeUsers.filter(u => u.is_superuser);
            const staffUsers = activeUsers.filter(u => !u.is_superuser && u.is_staff);
            const premiumUsers = activeUsers.filter(u => {
                if (u.is_superuser || u.is_staff) return false; // Исключаем уже попавших в высшие группы
                const accountType = (u.account?.account_type || (u as any).account_adds?.account_type || '').toString().toUpperCase();
                const isPremiumFlag = Boolean(u.account?.is_premium || (u as any).account_adds?.is_premium);
                return (isPremiumFlag || accountType === 'PREMIUM');
            });
            const regularUsers = activeUsers.filter(u => {
                if (u.is_superuser || u.is_staff) return false; // Исключаем уже попавших в высшие группы
                const accountType = (u.account?.account_type || (u as any).account_adds?.account_type || '').toString().toUpperCase();
                const isPremiumFlag = Boolean(u.account?.is_premium || (u as any).account_adds?.is_premium);
                return !(isPremiumFlag || accountType === 'PREMIUM'); // Обычные пользователи
            });

            console.log('[BackendUsersComboBox] Groups:', {
                super: superUsers.length,
                staff: staffUsers.length,
                premium: premiumUsers.length,
                regular: regularUsers.length
            });

            // Проверяем конкретно пользователя pvs.versia@gmail.com
            const pvsUser = activeUsers.find(u => u.email === 'pvs.versia@gmail.com');
            if (pvsUser) {
                console.log('[BackendUsersComboBox] PVS User details:', {
                    email: pvsUser.email,
                    is_superuser: pvsUser.is_superuser,
                    is_staff: pvsUser.is_staff,
                    profile: pvsUser.profile,
                    inSuperUsers: superUsers.some(u => u.email === 'pvs.versia@gmail.com'),
                    inStaffUsers: staffUsers.some(u => u.email === 'pvs.versia@gmail.com')
                });
            } else {
                console.log('[BackendUsersComboBox] ❌ PVS User not found in activeUsers');
            }

            const formatUser = (user: IBackendUser, prefix: string = '') => {
                let displayName = user.email;
                if (user.profile?.name && user.profile?.surname) {
                    displayName = `${user.profile.name} ${user.profile.surname}`;
                } else if (user.profile?.name) {
                    displayName = user.profile.name;
                }

                // Короткое имя для основного суперюзера
                if (user.email === 'pvs.versia@gmail.com') {
                    displayName = 'SUPERUSER-MODERATOR';
                }

                return {
                    id: user.id,
                    label: `${prefix}${displayName}`,
                    value: displayName,
                };
            };

            const usersList: IItem[] = [];

            // Суперпользователи (основной суперюзер первым)
            if (superUsers.length > 0) {
                usersList.push({ id: -1, label: "🔥 СУПЕРЮЗЕРЫ", value: "separator-super", isSeparator: true });

                // Сортируем: основной суперюзер первым, остальные по алфавиту
                const sortedSuperUsers = superUsers.sort((a, b) => {
                    if (a.email === 'pvs.versia@gmail.com') return -1;
                    if (b.email === 'pvs.versia@gmail.com') return 1;
                    return a.email > b.email ? 1 : -1;
                });

                usersList.push(...sortedSuperUsers.map(user => formatUser(user, "👑 ")));
            }

            // Менеджеры (staff)
            if (staffUsers.length > 0) {
                if (usersList.length > 0) usersList.push({ id: -11, label: "────────────────", value: "separator-divider-staff", isSeparator: true });
                usersList.push({ id: -12, label: "🛠️ МЕНЕДЖЕРЫ (STAFF)", value: "separator-staff", isSeparator: true });
                usersList.push(...staffUsers
                    .sort((a, b) => (a.email > b.email ? 1 : -1))
                    .map(user => formatUser(user, "🛠️ "))
                );
            }

            // Премиум пользователи
            if (premiumUsers.length > 0) {
                if (usersList.length > 0) usersList.push({ id: -13, label: "────────────────", value: "separator-divider-premium", isSeparator: true });
                usersList.push({ id: -14, label: "💎 ПРЕМИУМ ПОЛЬЗОВАТЕЛИ", value: "separator-premium", isSeparator: true });
                usersList.push(...premiumUsers
                    .sort((a, b) => (a.email > b.email ? 1 : -1))
                    .map(user => formatUser(user, "💎 "))
                );
            }

            // Обычные пользователи
            if (regularUsers.length > 0) {
                if (usersList.length > 0) usersList.push({ id: -15, label: "────────────────", value: "separator-divider-regular", isSeparator: true });
                usersList.push({ id: -16, label: "👤 ОБЫЧНЫЕ ПОЛЬЗОВАТЕЛИ", value: "separator-regular", isSeparator: true });
                usersList.push(...regularUsers
                    .sort((a, b) => (a.email > b.email ? 1 : -1))
                    .map(user => formatUser(user, "👤 "))
                );
            }

            setUsers(usersList);

            const endTime = Date.now();
            console.log(`[BackendUsersComboBox] Processing completed in ${endTime - startTime}ms, total items: ${usersList.length}`);
        }
    }, [data]);

    // Состояние загрузки
    if (isLoading) {
        return (
            <Select disabled>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder={`🔄 ${t('userSelector.loading')}`} />
                </SelectTrigger>
            </Select>
        );
    }

    if (error) {
        console.error('[BackendUsersComboBox] Error loading users:', error);
        return (
            <Select disabled>
                <SelectTrigger className="w-full border-red-300">
                    <SelectValue placeholder={`❌ ${t('userSelector.error')}`} />
                </SelectTrigger>
            </Select>
        );
    }
    // Подготовим группы для Select (Label должен быть внутри SelectGroup)
    const sections: { label?: string; items: IItem[] }[] = [];
    let current: { label?: string; items: IItem[] } | null = null;
    for (const it of users) {
        if ((it as any).isSeparator) {
            if (/─/.test(it.label)) {
                if (current && current.items.length) sections.push(current);
                current = null;
            } else {
                if (current && current.items.length) sections.push(current);
                current = { label: it.label, items: [] };
            }
        } else {
            if (!current) current = { items: [] };
            current.items.push(it);
        }
    }
    if (current && current.items.length) sections.push(current);


    return (
        <Select onValueChange={(v) => onSelect(parseInt(v, 10))}>
            <SelectTrigger className="w-full">
                <SelectValue placeholder={t('userSelector.placeholder', { count: users.length - sections.reduce((acc, s) => acc + (s.label ? 1 : 0), 0) })} />
            </SelectTrigger>
            <SelectContent
              position="popper"
              className="max-h-[300px] overflow-y-auto"
              sideOffset={5}
            >
                {sections.map((section, idx) => (
                  <SelectGroup key={idx}>
                    {section.label && <SelectLabel className="sticky top-0 bg-white z-10 px-2 py-1.5 text-xs font-semibold text-gray-600 border-b">{section.label}</SelectLabel>}
                    {section.items.map((item) => (
                      <SelectItem
                        key={item.id}
                        value={String(item.id)}
                        className="cursor-pointer hover:bg-gray-100 focus:bg-gray-100"
                      >
                        {item.label}
                      </SelectItem>
                    ))}
                    {idx < sections.length - 1 && <SelectSeparator />}
                  </SelectGroup>
                ))}
            </SelectContent>
        </Select>
    );
};

export default BackendUsersComboBox;
