// กำหนดชนิดผู้ใช้ให้ชัด (แก้ฟิลด์ตามที่โปรเจกต์คุณมีจริง)
export type User = {
  id: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
};

// ถ้าอยากให้เปิด TrackingScreen ได้แม้ไม่ส่ง user มา → ทำให้เป็น optional
export type TrackingStackParamList = {
  TrackingScreen: { user?: User } | undefined;
  CarbonOffsetScreen: undefined;
};
