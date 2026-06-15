import type { ExternalChatMessage } from '@/integrations/supabase/external-client';

export interface ParsedChatMessage {
  type: string;
  content: string | null;
}

/** Acepta message jsonb como objeto o string JSON (común en algunas filas de Instagram). */
export function parseMessageField(raw: unknown): ParsedChatMessage | null {
  if (raw == null) return null;

  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { type: 'unknown', content: raw.trim() || null };
    }
  }

  if (typeof parsed !== 'object' || parsed === null) return null;

  const m = parsed as { type?: unknown; content?: unknown };
  const content =
    m.content != null && String(m.content).trim() !== '' ? String(m.content) : null;
  const type = String(m.type ?? 'unknown').toLowerCase();

  return { type, content };
}

export function hasDisplayableContent(
  msg: ExternalChatMessage,
  supportsMedia: boolean
): boolean {
  const parsed = parseMessageField(msg.message);
  if (parsed?.content) return true;
  return supportsMedia && 'media' in msg && msg.media != null;
}

export function getDisplayContent(
  msg: ExternalChatMessage,
  supportsMedia: boolean
): string {
  const parsed = parseMessageField(msg.message);
  if (parsed?.content) return parsed.content;

  if (supportsMedia && 'media' in msg && msg.media) {
    switch (msg.media.type) {
      case 'image':
        return '📷 Imagen';
      case 'audio':
        return '🎵 Audio';
      case 'video':
        return '🎬 Video';
      default:
        return '📎 Archivo';
    }
  }

  return '';
}
