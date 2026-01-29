// ============================================
// VEXA - Format Currency Utility
// ============================================
// Función centralizada para formatear monedas según el tenant
// Usado en Dashboard, Results, Calendar, Notifications
// EXCEPCIÓN: Billing siempre usa USD
// ============================================

export type DisplayCurrency = 'CLP' | 'BOB' | 'USD';

const LOCALES: Record<DisplayCurrency, string> = {
  CLP: 'es-CL',
  BOB: 'es-BO',
  USD: 'en-US',
};

/**
 * Formatea un valor numérico como moneda según la divisa del tenant
 * @param value - El valor a formatear
 * @param currency - La divisa (CLP, BOB, USD). Default: USD
 * @returns String formateado (ej: "$150.000", "Bs. 500", "$99.00")
 */
export function formatCurrency(
  value: number,
  currency: DisplayCurrency = 'USD'
): string {
  return new Intl.NumberFormat(LOCALES[currency], {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'CLP' ? 0 : 2,
  }).format(value);
}

/**
 * Obtiene el símbolo de la moneda
 */
export function getCurrencySymbol(currency: DisplayCurrency): string {
  const symbols: Record<DisplayCurrency, string> = {
    CLP: '$',
    BOB: 'Bs.',
    USD: '$',
  };
  return symbols[currency];
}

/**
 * Obtiene el nombre completo de la moneda
 */
export function getCurrencyName(currency: DisplayCurrency): string {
  const names: Record<DisplayCurrency, string> = {
    CLP: 'Peso Chileno',
    BOB: 'Boliviano',
    USD: 'Dólar Estadounidense',
  };
  return names[currency];
}
