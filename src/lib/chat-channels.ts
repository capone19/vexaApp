import type { ExternalChatMessage, ExternalChatTable } from '@/integrations/supabase/external-client';

export type ChatChannelId = 'whatsapp' | 'instagram';

export interface ChatChannelConfig {
  id: ChatChannelId;
  label: string;
  table: ExternalChatTable;
  humanMessageSource: 'human_agent' | 'instagram';
  supportsMedia: boolean;
  supportsRemarketing: boolean;
  supportsAttachments: boolean;
  emptyStateHint: string;
  /** Días iniciales en la lista lateral */
  defaultListHistoryDays: number;
  /** Si true, la lista no filtra por fecha (usa listFetchLimit como único tope) */
  skipListDateFilter: boolean;
  /** Máximo de filas a traer en la lista lateral */
  listFetchLimit: number;
  getContactDisplay: (msg: ExternalChatMessage, sessionId: string) => string;
  getListPrimaryLabel: (session: { contactName: string; phoneNumber: string }) => string;
}

function formatInstagramUsername(username: string | null | undefined, sessionId: string): string {
  if (username?.trim()) {
    const clean = username.trim().replace(/^@/, '');
    return `@${clean}`;
  }
  return `Usuario ${sessionId.slice(-4)}`;
}

export const CHAT_CHANNELS: Record<ChatChannelId, ChatChannelConfig> = {
  whatsapp: {
    id: 'whatsapp',
    label: 'WhatsApp',
    table: 'n8n_chat_histories',
    humanMessageSource: 'human_agent',
    supportsMedia: true,
    supportsRemarketing: true,
    supportsAttachments: true,
    emptyStateHint: 'Cuando tus clientes envíen mensajes por WhatsApp, aparecerán aquí en tiempo real.',
    defaultListHistoryDays: 7,
    skipListDateFilter: false,
    listFetchLimit: 2000,
    getContactDisplay: (msg, sessionId) => {
      if ('phone_number' in msg && msg.phone_number) {
        const phone = msg.phone_number;
        return phone.startsWith('+') ? phone : `+${phone}`;
      }
      const phoneNumber = sessionId.split('@')[0] || sessionId;
      return phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    },
    getListPrimaryLabel: (session) => session.phoneNumber,
  },
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    table: 'instagram_chat_histories',
    humanMessageSource: 'instagram',
    supportsMedia: false,
    supportsRemarketing: false,
    supportsAttachments: false,
    emptyStateHint: 'Cuando tus clientes envíen mensajes por Instagram, aparecerán aquí en tiempo real.',
    defaultListHistoryDays: 7,
    skipListDateFilter: false,
    listFetchLimit: 2000,
    getContactDisplay: (msg, sessionId) => {
      if ('username' in msg) {
        return formatInstagramUsername(msg.username, sessionId);
      }
      return formatInstagramUsername(null, sessionId);
    },
    getListPrimaryLabel: (session) => session.contactName,
  },
};

export function getChannelConfig(channel: ChatChannelId): ChatChannelConfig {
  return CHAT_CHANNELS[channel];
}
