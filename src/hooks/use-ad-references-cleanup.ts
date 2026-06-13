import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'vexa:ad-references-cleanup-done';
const BUCKET = 'ad-references';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const ACTIVE_REFERENCE_WINDOW_MS = 30 * 60 * 1000;
const LIST_PAGE_SIZE = 100;
const REMOVE_BATCH_SIZE = 50;

interface UseAdReferencesCleanupOptions {
  isGenerating: boolean;
  hasActiveReference: boolean;
}

function parseFilenameTimestamp(name: string): number | null {
  const match = name.match(/^(\d+)-/);
  if (!match) return null;
  const ts = Number(match[1]);
  return Number.isFinite(ts) ? ts : null;
}

function isOlderThanThreeDays(createdAt: string | null, updatedAt: string | null): boolean {
  const dateStr = updatedAt ?? createdAt;
  if (!dateStr) return false;
  const fileDate = new Date(dateStr);
  if (Number.isNaN(fileDate.getTime())) return false;
  return Date.now() - fileDate.getTime() > THREE_DAYS_MS;
}

function isProtectedActiveReference(
  name: string,
  isGenerating: boolean,
  hasActiveReference: boolean,
): boolean {
  if (!isGenerating && !hasActiveReference) return false;
  const ts = parseFilenameTimestamp(name);
  if (ts === null) return false;
  return ts > Date.now() - ACTIVE_REFERENCE_WINDOW_MS;
}

async function listAllAdReferenceFiles() {
  const files: { name: string; created_at: string | null; updated_at: string | null }[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: LIST_PAGE_SIZE, offset });

    if (error) throw error;
    if (!data?.length) break;

    for (const file of data) {
      if (file.id) {
        files.push({
          name: file.name,
          created_at: file.created_at ?? null,
          updated_at: file.updated_at ?? null,
        });
      }
    }

    if (data.length < LIST_PAGE_SIZE) break;
    offset += LIST_PAGE_SIZE;
  }

  return files;
}

async function removeAdReferenceBatch(names: string[]) {
  const { error } = await supabase.storage.from(BUCKET).remove(names);
  if (error) throw error;
}

export async function runAdReferencesCleanup(
  isGenerating: boolean,
  hasActiveReference: boolean,
): Promise<number> {
  const files = await listAllAdReferenceFiles();

  const toDelete = files
    .filter(file => isOlderThanThreeDays(file.created_at, file.updated_at))
    .filter(file => !isProtectedActiveReference(file.name, isGenerating, hasActiveReference))
    .map(file => file.name);

  let deletedCount = 0;

  for (let i = 0; i < toDelete.length; i += REMOVE_BATCH_SIZE) {
    const batch = toDelete.slice(i, i + REMOVE_BATCH_SIZE);
    await removeAdReferenceBatch(batch);
    deletedCount += batch.length;
  }

  return deletedCount;
}

export function useAdReferencesCleanup({
  isGenerating,
  hasActiveReference,
}: UseAdReferencesCleanupOptions) {
  const isGeneratingRef = useRef(isGenerating);
  const hasActiveReferenceRef = useRef(hasActiveReference);

  isGeneratingRef.current = isGenerating;
  hasActiveReferenceRef.current = hasActiveReference;

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, '1');

    void (async () => {
      try {
        const deletedCount = await runAdReferencesCleanup(
          isGeneratingRef.current,
          hasActiveReferenceRef.current,
        );
        console.log(`[ad-references cleanup] ${deletedCount} archivo(s) eliminado(s)`);
      } catch {
        // Silencioso: no UI, no notificaciones
      }
    })();
  }, []);
}
