// Estilos del asistente de productos (C-60). Salen de las recetas comunes del admin (lib/admin-ui.ts, C-52);
// los nombres wizard* se mantienen porque los usan los pasos y la tarjeta G-29 de Gemini.
export {
  adminCard as wizardCard,
  adminLabel as wizardLabel,
  adminHint as wizardHint,
  adminError as wizardError,
  adminInput as wizardInput,
  adminChoice as wizardChoice,
  adminPrimaryButton as wizardPrimaryButton,
  adminSecondaryButton as wizardSecondaryButton,
} from '@/lib/admin-ui';

export const wizardSectionTitle = 'text-xl font-bold text-ink';
export const wizardSectionHelp = 'mt-1 text-sm text-muted';
