import { IUsersResponse } from "@/shared/types/users.interfaces";
import { fetchUsers } from "@/app/api/helpers";

export const apiUsers = {
    usersAll: async (): Promise<IUsersResponse> => {
        try {
            const response = await fetchUsers();
            if (!response) {
                throw new Error('No response from users API');
            }
            return response;
        } catch (e) {
            console.error('API Users error:', e);
            throw e;
        }
    },
};
