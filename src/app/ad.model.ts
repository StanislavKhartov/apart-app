export interface Ad {
  id?: string;
  rooms: string;
  price: string;
  price_usd?: string;
  address: string;
  url: string;
  interest: number;
  comment: string;
  is_deleted?: boolean;
  updated_to?: string;
  created_at?: string;
}