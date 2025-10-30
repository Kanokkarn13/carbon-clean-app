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
