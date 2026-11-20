import { createClient } from '@/lib/supabase/client';
import { Result, toAppError } from '@/lib/types/auth';

export interface AnnouncementRecord {
  id: string;
  title: string;
  body: string;
  published_at: string;
}

/** Annonces publiées de la salle de l'utilisateur (filtrées par RLS). Les dates futures sont exclues. */
export async function getAnnouncements(limit = 10): Promise<Result<AnnouncementRecord[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, body, published_at')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(limit);
    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, value: (data || []) as AnnouncementRecord[] };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}
