/**
 * Article 50(1), in force since 2 August 2026: people must be informed that
 * they are interacting with an AI system. Article 50(5): clearly and
 * distinguishably, at the latest at the first interaction.
 */
export const AI_DISCLOSURE_NOTICE =
  'You are chatting with an AI assistant, not a human. It can make mistakes, so check anything important. Ask for a human at any time.';

export const AI_DISCLOSURE_LOCALES: Record<string, string> = {
  en: AI_DISCLOSURE_NOTICE,
  de: 'Sie chatten mit einem KI-Assistenten, nicht mit einem Menschen. Er kann Fehler machen — prüfen Sie wichtige Angaben.',
  fr: "Vous discutez avec un assistant IA, et non avec une personne. Il peut se tromper : vérifiez toute information importante.",
};

export function disclosureFor(locale = 'en'): string {
  return AI_DISCLOSURE_LOCALES[locale.split('-')[0] ?? 'en'] ?? AI_DISCLOSURE_NOTICE;
}
