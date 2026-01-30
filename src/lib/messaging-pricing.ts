// ============================================
// VEXA - Precios de Mensajería WhatsApp
// ============================================
// Precios por tipo de mensaje (en USD)
// Basados en costos YCloud + margen VEXA
// ============================================

export const MESSAGE_PRICES: Record<string, number> = {
  marketing: 0.15,      // YCloud: ~$0.089 → VEXA: $0.15 (68% margen)
  utility: 0.04,        // YCloud: ~$0.02  → VEXA: $0.04 (100% margen)
  authentication: 0.04, // YCloud: ~$0.02  → VEXA: $0.04 (100% margen)
  service: 0,           // Gratis
};

export const MESSAGE_PRICE_LABELS: Record<string, string> = {
  marketing: 'Marketing',
  utility: 'Utilidad',
  authentication: 'Autenticación',
  service: 'Servicio',
};

/**
 * Calcula el costo de una campaña basado en el número de mensajes y categoría
 */
export function calculateCampaignCost(
  messageCount: number,
  category: string
): number {
  const price = MESSAGE_PRICES[category.toLowerCase()] ?? MESSAGE_PRICES.marketing;
  return Number((messageCount * price).toFixed(4));
}

/**
 * Obtiene el precio por mensaje según la categoría
 */
export function getMessagePrice(category: string): number {
  return MESSAGE_PRICES[category.toLowerCase()] ?? MESSAGE_PRICES.marketing;
}

/**
 * Formatea el precio para mostrar
 */
export function formatPrice(amount: number): string {
  return `$${amount.toFixed(2)} USD`;
}

/**
 * Verifica si hay saldo suficiente para enviar una campaña
 */
export function hasSufficientBalance(
  balance: number,
  messageCount: number,
  category: string
): boolean {
  const cost = calculateCampaignCost(messageCount, category);
  return balance >= cost;
}
