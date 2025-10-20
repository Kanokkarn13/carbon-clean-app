export type User = {
  user_id?: string | number;
  id?: string | number;
  fname?: string;
  lname?: string;
  email?: string;
  House_member?: number | string;
  house_member?: number | string;
};

export type SavedRow = {
  id: number;
  user_id: number;
  point_value: string;
  distance_km: string | number;
  activity: 'Car' | 'Motorcycle' | 'Taxi' | 'Bus';
  param_type: string | null;
  create_at?: string;
};

export type ReductionRow = {
  id: number;
  user_id: number;
  point_value: string;
  distance_km: string | number;
  activity_from: string;
  param_from: string | null;
  activity_to: string;
  param_to: string | null;
  create_at?: string;
};
