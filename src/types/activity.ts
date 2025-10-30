// src/types/activity.ts
export type ActivityType = 'Cycling' | 'Walking';

export type ActivityPayload = {
  type: ActivityType;

  // à¸Ÿà¸´à¸¥à¸”à¹Œà¸—à¸µà¹ˆà¸«à¸™à¹‰à¸² RecentAct à¸•à¹‰à¸­à¸‡à¹ƒà¸Šà¹‰
  title?: string;
  description?: string;
  distance_km?: number;
  step_total?: number;
  duration_sec?: number;
  record_date?: string | Date;

  // à¹€à¸œà¸·à¹ˆà¸­ API à¸­à¸·à¹ˆà¸™ à¹†
  created_at?: string | Date;
  // à¸–à¹‰à¸²à¸„à¸¸à¸“à¸¡à¸µ id à¸‚à¸­à¸‡ activity à¸à¹‡à¹ƒà¸ªà¹ˆà¹„à¸”à¹‰
  id?: string | number;
  points?: number;
  points_valid?: boolean;
};
