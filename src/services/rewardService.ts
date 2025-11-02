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

export type RedemptionStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type Redemption = {
  id: number;
  reward_id: number | null;
  cost_points: number;
  status: RedemptionStatus;
  created_at: string;
  reward_title: string;
  reward_description: string;
  reward_image_url: string | null;
  reward_cost_points: number | null;
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
    reward_title: item?.reward_title ?? '',
    reward_description: item?.reward_description ?? '',
    reward_image_url: item?.reward_image_url ?? null,
    reward_cost_points:
      item?.reward_cost_points === null || item?.reward_cost_points === undefined
        ? null
        : Number(item.reward_cost_points),
  }));
}
