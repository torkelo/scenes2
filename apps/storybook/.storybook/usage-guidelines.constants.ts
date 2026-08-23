// Shared identifiers + payload type for the two-sided "Usage Guidelines" addon
// (preview side emits, manager side renders).
export const ADDON_ID = 'aik/usage-guidelines';
export const PANEL_ID = `${ADDON_ID}/panel`;
export const EVENT_RESULT = `${ADDON_ID}/result`;

export interface UsageResult {
  storyId: string;
  // The component's USAGE.md, frontmatter stripped, or null when it has none.
  markdown: string | null;
}
