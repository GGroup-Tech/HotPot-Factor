/**
 * Validación de formato de correo compartida entre cliente y servidor
 * (2026-08-20, pedido del usuario: "que detecte correos falsos o
 * inválidos"). Es una validación de FORMATO, no de existencia real —
 * confirmar que el correo existe de verdad ya lo hace el flujo de
 * confirmación por correo (Resend + Supabase Auth) al crear la
 * cuenta. Un poco más estricta que el `type="email"` nativo del
 * navegador (exige un punto después de la arroba, con al menos 2
 * caracteres de dominio), pero sin intentar adivinar qué dominios son
 * "reales" — eso generaría falsos positivos con dominios legítimos
 * poco comunes.
 *
 * Los correos DUPLICADOS ya se detectan del lado del servidor en
 * `crearCuenta()` (mensaje traducido de Supabase Auth: "Ya existe una
 * cuenta con ese correo"). A propósito NO hay un endpoint para
 * checar en vivo, mientras el usuario escribe, si un correo ya existe
 * — eso abriría una forma fácil de enumerar cuentas reales probando
 * correos uno por uno.
 */
export function formatoCorreoValido(email: string): boolean {
  const limpio = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(limpio);
}
