// Email único con acceso al dashboard administrativo
export const ADMIN_EMAIL = 'contacto@vexalatam.com';

export function isAdminEmail(email: string): boolean {
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
