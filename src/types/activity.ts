// src/types/activity.ts
export type ActivityType = 'Cycling' | 'Walking';

export type ActivityPayload = {
  type: ActivityType;

  // ฟิลด์ที่หน้า RecentAct ต้องใช้
  title?: string;
  description?: string;
  distance_km?: number;
  step_total?: number;
  duration_sec?: number;
  record_date?: string | Date;

  // เผื่อ API อื่น ๆ
  created_at?: string | Date;
  // ถ้าคุณมี id ของ activity ก็ใส่ได้
  id?: string | number;
};
