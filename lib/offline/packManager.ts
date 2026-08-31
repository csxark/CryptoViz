export interface OfflinePackDocumentation {
  title?: string;
  topic?: string;
  content?: string;
  summary?: string;
}

export interface OfflinePack {
  id: string;
  title: string;
  description: string;
  version?: string;
  category?: string;
  topics?: string[];
  documentation?: OfflinePackDocumentation[];
  referenceCode?: Record<string, string>;
  metadata?: {
    id: string;
    title: string;
    description?: string;
    version?: string;
    category?: string;
    topics?: string[];
  };
}

/**
 * Validates the schema of an imported JSON pack matching exportPayload format.
 */
export function validatePackSchema(data: unknown): data is OfflinePack {
  if (!data || typeof data !== 'object') return false;
  const record = data as Record<string, unknown>;
  
  // Support both direct metadata objects and flattened schemas
  const meta = (record.metadata && typeof record.metadata === 'object' ? record.metadata : record) as Record<string, unknown>;
  if (!meta || typeof meta !== 'object') return false;
  
  if (typeof meta.id !== 'string') return false;
  if (typeof meta.title !== 'string') return false;
  if (typeof meta.version !== 'string' && typeof record.version !== 'string') return false;
  
  // Verify topics/documentation arrays exist
  if (!Array.isArray(record.topics) && !Array.isArray(meta.topics)) return false;
  
  return true;
}

/**
 * Imports and persists a parsed JSON pack into local offline storage.
 */
export async function importPackFromJson(jsonData: unknown): Promise<void> {
  if (!validatePackSchema(jsonData)) {
    throw new Error("Invalid pack format: Missing required metadata fields (id, title, version) or topics array.");
  }

  const packId = jsonData.metadata?.id || jsonData.id;
  const packTitle = jsonData.metadata?.title || jsonData.title;

  const storageKey = 'cryptoviz_offline_packs';
  const existingPacksStr = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
  const existingPacks: OfflinePack[] = existingPacksStr ? JSON.parse(existingPacksStr) : [];

  const isDuplicate = existingPacks.some((p: OfflinePack) => (p.metadata?.id || p.id) === packId);
  if (isDuplicate) {
    throw new Error(`Pack "${packTitle}" is already imported in offline storage.`);
  }

  existingPacks.push(jsonData);
  if (typeof window !== 'undefined') {
    localStorage.setItem(storageKey, JSON.stringify(existingPacks));
  }
}

/**
 * Exports an OfflinePack into a structured JSON string representation.
 */
export function exportPackAsJson(pack: OfflinePack): string {
  return JSON.stringify({
    metadata: {
      id: pack.id,
      title: pack.title,
      description: pack.description,
      version: pack.version || '1.0.0',
      category: pack.category,
      generator: 'CryptoViz Offline Exporter 1.0',
      exportedAt: new Date().toISOString(),
    },
    topics: pack.topics || [],
    documentation: pack.documentation || [],
    referenceCode: pack.referenceCode || {
      caesar: `function caesar(str, shift) { return str.replace(/[a-z]/gi, c => String.fromCharCode((c.charCodeAt(0) % 32 + shift) % 26 + (c < 'a' ? 65 : 97))); }`
    }
  }, null, 2);
}

/**
 * Exports an OfflinePack into a Markdown document string.
 */
export function exportPackAsMarkdown(pack: OfflinePack): string {
  let md = `# ${pack.title}\n\n`;
  md += `> ${pack.description}\n\n`;
  md += `**Category:** ${pack.category} | **Version:** ${pack.version || '1.0.0'}\n\n`;
  md += `## Topics Covered\n`;
  (pack.topics || []).forEach((t: string) => {
    md += `- ${t}\n`;
  });
  md += `\n## Included Documentation & Formulas\n`;
  (pack.documentation || []).forEach((d: OfflinePackDocumentation) => {
    md += `### ${d.title || d.topic}\n${d.content || d.summary}\n\n`;
  });
  return md;
}

/**
 * Exports an OfflinePack into a standalone single-file HTML document with embedded JavaScript.
 */
export function exportPackAsSingleFileHtml(pack: OfflinePack): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${pack.title} - CryptoViz Standalone Offline</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; max-width: 800px; margin: auto; }
    h1 { color: #38bdf8; }
    .card { background: #1e293b; padding: 1.5rem; border-radius: 0.5rem; margin-bottom: 1.5rem; border: 1px solid #334155; }
    textarea, input, button { width: 100%; box-sizing: border-box; padding: 0.5rem; margin: 0.5rem 0; background: #0f172a; color: #fff; border: 1px solid #475569; border-radius: 0.25rem; }
    button { background: #0284c7; font-weight: bold; cursor: pointer; border: none; padding: 0.75rem; }
    button:hover { background: #0369a1; }
  </style>
</head>
<body>
  <h1>${pack.title}</h1>
  <p>${pack.description}</p>
  <div class="card">
    <h2>Interactive Standalone Offline Cipher Runner</h2>
    <label>Input Text:</label>
    <textarea id="inputText" rows="3">Hello CryptoViz!</textarea>
    <button onclick="runCipher()">Run Demonstration Cipher</button>
    <label>Output Result:</label>
    <textarea id="outputText" rows="3" readonly></textarea>
  </div>
  <script>
    async function runCipher() {
      const input = document.getElementById('inputText').value;
      if (window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(input);
        const hash = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hash));
        const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        document.getElementById('outputText').value = 'SHA-256 Digest: ' + hex;
      } else {
        document.getElementById('outputText').value = 'Encoded: ' + btoa(input);
      }
    }
  </script>
</body>
</html>`;
}

/**
 * Triggers a browser download of a generated text/blob file.
 */
export function downloadFile(filename: string, content: string, mimeType: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
