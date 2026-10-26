import { createClient } from '@/lib/supabase/client';
import { Result, toAppError } from '@/lib/types/auth';

export interface GymRecord {
  id: string;
  name: string;
  slug: string | null;
  city: string;
  status: 'trial' | 'active' | 'suspended';
  created_at: string;
}

export interface PlatformSubRecord {
  id: string;
  gym_id: string;
  plan: string;
  price_mru: number;
  period: 'monthly' | 'yearly';
  status: 'trial' | 'active' | 'suspended' | 'cancelled';
  current_period_start: string;
  current_period_end: string;
  gym?: GymRecord | null;
}

export interface AdRecord {
  id: string;
  advertiser: string;
  title: string | null;
  image_url: string;
  target_link: string | null;
  start_date: string;
  end_date: string;
  status: 'active' | 'paused' | 'archived';
  created_at: string;
}

export async function getGyms(): Promise<Result<GymRecord[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('gyms')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, value: (data || []) as GymRecord[] };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}

export async function updateGymStatus(
  gymId: string,
  status: 'trial' | 'active' | 'suspended'
): Promise<Result<GymRecord>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('gyms')
      .update({ status })
      .eq('id', gymId)
      .select()
      .single();

    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, value: data as GymRecord };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}

export async function getPlatformSubscriptions(): Promise<Result<PlatformSubRecord[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('platform_subscriptions')
      .select('*, gym:gyms(id, name, city, status, created_at, slug)')
      .order('created_at', { ascending: false });

    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, value: (data || []) as PlatformSubRecord[] };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}

export async function getAds(): Promise<Result<AdRecord[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('ads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, value: (data || []) as AdRecord[] };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}

export async function createAd(params: {
  advertiser: string;
  title?: string;
  image_url: string;
  target_link?: string;
  start_date: string;
  end_date: string;
}): Promise<Result<AdRecord>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('ads')
      .insert({
        advertiser: params.advertiser,
        title: params.title || null,
        image_url: params.image_url,
        target_link: params.target_link || null,
        start_date: params.start_date,
        end_date: params.end_date,
        status: 'active',
      })
      .select()
      .single();

    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, value: data as AdRecord };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}

export async function updateAdStatus(
  adId: string,
  status: 'active' | 'paused' | 'archived'
): Promise<Result<AdRecord>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('ads')
      .update({ status })
      .eq('id', adId)
      .select()
      .single();

    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, value: data as AdRecord };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}
