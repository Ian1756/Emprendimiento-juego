/**
 * Configuración pública (llega al navegador). Aquí NUNCA va un secreto (§4.4).
 * Los valores se definen en .env.local; los de abajo son solo respaldos visibles.
 */
export const publicConfig = {
  whatsappUrl:
    process.env.NEXT_PUBLIC_WHATSAPP_URL || 'https://chat.whatsapp.com/PENDIENTE-DE-CONFIGURAR',
  privacyUrl: process.env.NEXT_PUBLIC_PRIVACY_URL || '/aviso-de-privacidad',
  contactUrl: process.env.NEXT_PUBLIC_CONTACT_URL || 'https://tec.mx/es/emprendimiento',
  organization: process.env.NEXT_PUBLIC_ORG_NAME || 'Emprendimiento Tec CEM',
} as const;

export function isWhatsappConfigured(): boolean {
  return !publicConfig.whatsappUrl.includes('PENDIENTE-DE-CONFIGURAR');
}
