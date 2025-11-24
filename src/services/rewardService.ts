import { api } from './api';

export type Reward = {
  id: number;
  title: string;
  description: string;
  cost_points: number;
  expires_at: string | null;
  active: boolean;
  stock: number | null;
  image_url: string | null;
};

type RewardResponse = {
  items?: Reward[];
};

export type RedemptionStatus =
  | 'pending'
  | 'approved'
  | 'used'
  | 'expired'
  | 'rejected'
  | 'cancelled';

export type Redemption = {
  id: number;
  reward_id: number | null;
  cost_points: number;
  status: RedemptionStatus;
  created_at: string;
  voucher_code: string | null;
  qr_payload: string | null;
  qr_image_url: string | null;
  expires_at: string | null;
  used_at: string | null;
  reward_title: string;
  reward_description: string;
  reward_image_url: string | null;
  reward_cost_points: number | null;
};

export type RedeemResponse = {
  redemption_id: number;
  voucher_code: string;
  qr_payload: string;
  qr_image_url: string;
  expires_at: string;
  status?: RedemptionStatus;
};

export async function fetchRewards(): Promise<Reward[]> {
  const endpoint = api('/rewards');
  const response = await fetch(endpoint);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to load rewards (${response.status})`);
  }

  const data: RewardResponse = await response.json();
  if (!data || !Array.isArray(data.items)) return [];
  return data.items.map((item) => ({
    ...item,
    description: item?.description ?? '',
    expires_at: item?.expires_at ?? null,
    active: Boolean(item?.active),
    stock:
      item?.stock === null || item?.stock === undefined ? null : Number(item?.stock),
    cost_points: Number(item?.cost_points) || 0,
    image_url: item?.image_url ?? null,
  }));
}

type RedemptionResponse = {
  items?: Redemption[];
};

export async function redeemReward(payload: {
  user_id: number | string;
  reward_id: number | string;
  cost_points?: number;
}): Promise<RedeemResponse> {
  const endpoint = api('/rewards/redeem');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to redeem reward (${response.status})`);
  }
  return (await response.json()) as RedeemResponse;
}

export async function fetchRedemptions(
  userId: number | string | null | undefined
): Promise<Redemption[]> {
  if (!userId && userId !== 0) return [];
  const endpoint = api(`/rewards/redemptions/${encodeURIComponent(String(userId))}`);
  const response = await fetch(endpoint);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to load redemption history (${response.status})`);
  }

  const data: RedemptionResponse = await response.json();
  if (!data || !Array.isArray(data.items)) return [];
  return data.items.map((item) => ({
    id: Number(item?.id),
    reward_id:
      item?.reward_id === null || item?.reward_id === undefined
        ? null
        : Number(item.reward_id),
    cost_points: Number(item?.cost_points) || 0,
    status: (item?.status as RedemptionStatus) || 'pending',
    created_at: item?.created_at || '',
    voucher_code: item?.voucher_code ?? null,
    qr_payload: item?.qr_payload ?? null,
    qr_image_url: item?.qr_image_url ?? null,
    expires_at: item?.expires_at ?? null,
    used_at: item?.used_at ?? null,
    reward_title: item?.reward_title ?? '',
    reward_description: item?.reward_description ?? '',
    reward_image_url: item?.reward_image_url ?? null,
    reward_cost_points:
      item?.reward_cost_points === null || item?.reward_cost_points === undefined
        ? null
        : Number(item.reward_cost_points),
  }));
}

export async function validateVoucher(
  voucher_code: string
): Promise<{ redemption_id: number; status: RedemptionStatus; used_at?: string }> {
  const endpoint = api('/rewards/validate-voucher');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voucher_code }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to validate voucher (${response.status})`);
  }
  return (await response.json()) as { redemption_id: number; status: RedemptionStatus; used_at?: string };
}
