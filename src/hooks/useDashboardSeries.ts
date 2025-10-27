import { useMemo } from 'react';
import { iso, safeDate, startOfDay } from '../utils/date';
import type { Activity } from '../services/activityService';

export type Period = 'week' | 'month' | 'year';

export function useDashboardSeries(activities: Activity[], period: Period, offset: number) {
  const { labels, wData, cData } = useMemo(() => {
    const now = new Date();
    let labels: string[] = [];
    let wData: number[] = [];
    let cData: number[] = [];

    if (period === 'week') {
      const base = startOfDay(now)!;
      const day = (base.getDay() + 6) % 7; // Mon=0..Sun=6
      base.setDate(base.getDate() - day + offset * 7);

      const keys: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2));
        keys.push(iso(d));
      }
      const buckets: Record<string, { w: number; c: number }> = {};
      keys.forEach(k => (buckets[k] = { w: 0, c: 0 }));

      activities.forEach(a => {
        const d = safeDate(a.record_date ?? a.created_at);
        const key = iso(d);
        if (!key || !(key in buckets)) return;
        const dist = Number.isFinite(a.distance_km as number) ? Math.max(0, Number(a.distance_km)) : 0;
        if (a.type === 'Walking') buckets[key].w += dist;
        if (a.type === 'Cycling') buckets[key].c += dist;
      });

      wData = keys.map(k => buckets[k].w);
      cData = keys.map(k => buckets[k].c);
      return { labels, wData, cData };
    }

    if (period === 'month') {
      const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const days = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
      const bins = Math.ceil(days / 7);
      labels = Array.from({ length: bins }, (_, i) => `W${i + 1}`);
      const buckets = Array.from({ length: bins }, () => ({ w: 0, c: 0 }));

      activities.forEach(a => {
        const d = safeDate(a.record_date ?? a.created_at);
        if (!d || d.getFullYear() !== base.getFullYear() || d.getMonth() !== base.getMonth()) return;
        const idx = Math.min(Math.floor((d.getDate() - 1) / 7), bins - 1);
        const dist = Number.isFinite(a.distance_km as number) ? Math.max(0, Number(a.distance_km)) : 0;
        if (a.type === 'Walking') buckets[idx].w += dist;
        if (a.type === 'Cycling') buckets[idx].c += dist;
      });

      wData = buckets.map(b => b.w);
      cData = buckets.map(b => b.c);
      return { labels, wData, cData };
    }

    // year
    const year = now.getFullYear() + offset;
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    labels = months.slice();
    const buckets: Record<number, { w: number; c: number }> = {};
    months.forEach((_, i) => (buckets[i] = { w: 0, c: 0 }));

    activities.forEach(a => {
      const d = safeDate(a.record_date ?? a.created_at);
      if (!d || d.getFullYear() !== year) return;
      const dist = Number.isFinite(a.distance_km as number) ? Math.max(0, Number(a.distance_km)) : 0;
      const m = d.getMonth();
      if (a.type === 'Walking') buckets[m].w += dist;
      if (a.type === 'Cycling') buckets[m].c += dist;
    });

    wData = months.map((_, i) => buckets[i].w);
    cData = months.map((_, i) => buckets[i].c);
    return { labels, wData, cData };
  }, [activities, period, offset]);

  const periodTitle = useMemo(() => {
    const now = new Date();
    if (period === 'week') {
      const base = startOfDay(now)!;
      const day = (base.getDay() + 6) % 7;
      base.setDate(base.getDate() - day + offset * 7);
      const end = new Date(base);
      end.setDate(base.getDate() + 6);
      const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${fmt(base)} – ${fmt(end)}`;
    }
    if (period === 'month') {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return String(now.getFullYear() + offset);
  }, [period, offset]);

  return { labels, wData, cData, periodTitle };
}
