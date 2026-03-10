export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar?: string;
  is_superuser?: boolean;
  account_type?: string;
  phone?: string;
}
