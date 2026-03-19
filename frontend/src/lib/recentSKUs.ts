const STORAGE_KEY = 'recentSKUs';
const MAX_RECENT = 8;

export function recordSKUVisit(itemId: string) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as string[];
    const filtered = stored.filter((id) => id !== itemId);
    filtered.unshift(itemId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)));
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([itemId]));
  }
}

export function getRecentSKUs(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as string[];
  } catch {
    return [];
  }
}
