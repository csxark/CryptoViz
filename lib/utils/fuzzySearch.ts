export function isFuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  
  if (q.length === 0) return false;
  if (q.length > t.length) return false;

  let qIdx = 0;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === q[qIdx]) {
      qIdx++;
    }
    if (qIdx === q.length) return true;
  }
  return false;
}

export function getTitleScore(query: string, title: string): number {
  const q = query.toLowerCase().trim();
  const t = title.toLowerCase();

  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  if (t.includes(q)) return 80;
  if (isFuzzyMatch(q, t)) return 70;
  
  return 0;
}

export function getDescriptionScore(query: string, description: string): number {
  const q = query.toLowerCase().trim();
  const d = description.toLowerCase();
  
  if (d.includes(q)) return 60;
  if (isFuzzyMatch(q, d)) return 50;
  
  return 0;
}
