export const dummyUsers: any[] = [];
export async function fetchDummyUsers(): Promise<any[]> { return []; }

export const dummyApiHelpers = {
  get: async (url: string): Promise<{ data: null }> => ({ data: null }),
  post: async (url: string, data: any): Promise<{ data: null }> => ({ data: null })
};
