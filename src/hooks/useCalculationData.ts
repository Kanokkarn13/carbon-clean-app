import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User, SavedRow, ReductionRow } from '../types/calc';

/** ===== API base from ENV (Expo) ===== */
const RAW_ORIGIN = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.102:3000';
const API_ORIGIN = RAW_ORIGIN.replace(/\/+$/, ''); // ตัด / ท้ายโดเมนออก
const api = (path: string) => `${API_ORIGIN}/api${path}`;

// (แนะนำ) ดูค่า base URL ตอน dev
if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log('[API_ORIGIN]', API_ORIGIN);
}

function parsePositiveInt(v: unknown): number | undefined {
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return undefined;
}
function getMembersFrom(obj: any): number | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const keys = ['house_member', 'House_member', 'houseMember', 'members', 'member_count'];
  for (const k of keys) {
    const p = parsePositiveInt(obj?.[k]);
    if (p !== undefined) return p;
  }
  return undefined;
}

export function useCalculationData(userParam?: Partial<User>, params?: any) {
  const user = (userParam || {}) as User;

  const userId = useMemo(
    () => Number(user?.user_id ?? user?.id),
    [user]
  );

  const members =
    getMembersFrom(user) ?? getMembersFrom(params) ?? 1;

  const peopleLabel = `${members} person${members === 1 ? '' : 's'}`;

  // --- Emission ---
  const [openSaved, setOpenSaved] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [savingError, setSavingError] = useState<string | null>(null);
  const [items, setItems] = useState<SavedRow[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [totalEmission, setTotalEmission] = useState<number>(0);

  // --- Reduction ---
  const [openReduce, setOpenReduce] = useState<boolean>(false);
  const [loadingReduce, setLoadingReduce] = useState<boolean>(false);
  const [reduceError, setReduceError] = useState<string | null>(null);
  const [reduceItems, setReduceItems] = useState<ReductionRow[]>([]);
  const [refreshingReduce, setRefreshingReduce] = useState<boolean>(false);
  const [totalReduction, setTotalReduction] = useState<number>(0);

  const fetchSaved = useCallback(async () => {
    if (!userId || userId <= 0) {
      setSavingError('Login required to load saved emissions.');
      setItems([]);
      setTotalEmission(0);
      return;
    }
    setSavingError(null);
    setLoading(true);
    try {
      const res = await fetch(api(`/saved/${userId}`), { keepalive: true });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      const json = text ? JSON.parse(text) : { items: [] };
      const list: SavedRow[] = Array.isArray(json?.items) ? json.items : [];
      setItems(list);
      const total = list.reduce((sum, row) => sum + Number(row.point_value || 0), 0);
      setTotalEmission(total);
    } catch (e: any) {
      setSavingError(e?.message || 'Failed to load');
      setItems([]);
      setTotalEmission(0);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchReductions = useCallback(async () => {
    if (!userId || userId <= 0) {
      setReduceError('Login required to load saved reductions.');
      setReduceItems([]);
      setTotalReduction(0);
      return;
    }
    setReduceError(null);
    setLoadingReduce(true);
    try {
      const url = api(`/reduction/saved/${userId}`);
      const res = await fetch(url, { keepalive: true });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
      const json = text ? JSON.parse(text) : { items: [] };
      const list: ReductionRow[] = Array.isArray(json?.items) ? json.items : [];
      setReduceItems(list);
      const total = list.reduce((sum, row) => sum + Number(row.point_value || 0), 0);
      setTotalReduction(total);
    } catch (e: any) {
      setReduceError(e?.message || 'Failed to load reductions');
      setReduceItems([]);
      setTotalReduction(0);
    } finally {
      setLoadingReduce(false);
    }
  }, [userId]);

  // initial load
  useEffect(() => { fetchSaved(); }, [fetchSaved]);
  useEffect(() => { fetchReductions(); }, [fetchReductions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await fetchSaved(); } finally { setRefreshing(false); }
  }, [fetchSaved]);

  const onRefreshReduce = useCallback(async () => {
    setRefreshingReduce(true);
    try { await fetchReductions(); } finally { setRefreshingReduce(false); }
  }, [fetchReductions]);

  return {
    user,
    peopleLabel,

    openSaved, setOpenSaved,
    loading, savingError, items, refreshing, totalEmission, onRefresh,

    openReduce, setOpenReduce,
    loadingReduce, reduceError, reduceItems, refreshingReduce, totalReduction, onRefreshReduce,
  };
}
