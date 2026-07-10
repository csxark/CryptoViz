"use client";

import React, { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightLine = (line: string, lang?: string): React.ReactNode => {
    if (!line) return "\u00A0"; // Render a non-breaking space for empty lines to keep height
    if (!lang) return line;

    const l = lang.toLowerCase();
    const isPy = l === 'python' || l === 'py';
    const isJs = l === 'javascript' || l === 'js' || l === 'typescript' || l === 'ts';

    if (!isPy && !isJs) return line;

    const commentPat = isPy ? `#[^\\n]*` : `\\/\\/[^\\n]*`;
    const stringPat = `"[^"\\\\"]*(?:\\\\.[^"\\\\"]*)*"|'[^'\\\\]*(?:\\\\.[^'\\\\]*)*'|\`[^\`\\\\]*(?:\\\\.[^\`\\\\]*)*\``;
    const keywordPat = isPy
      ? `\\b(?:def|class|return|if|else|elif|for|in|while|try|except|import|from|as|and|or|not|is|None|True|False)\\b`
      : `\\b(?:function|return|let|const|var|if|else|for|while|do|switch|case|break|continue|default|import|export|from|as|async|await|new|class|extends|try|catch|finally|throw|null|undefined|true|false)\\b`;
    const builtinPat = isPy
      ? `\\b(?:print|len|range|chr|ord|str|int|float|list|dict|set|tuple|max|min)\\b`
      : `\\b(?:console|log|require|module|exports|String|Number|Array|Object|Math|parseInt|parseFloat|TextEncoder|crypto|subtle|digest|encrypt|Uint8Array)\\b`;
    const numberPat = `\\b\\d+\\b`;

    const tokenRegex = new RegExp(
      `(${commentPat})|(${stringPat})|(${keywordPat})|(${builtinPat})|(${numberPat})`,
      'g'
    );

    const parts = line.split(tokenRegex);
    const elements: React.ReactNode[] = [];
    let idx = 0;
    
    while (idx < parts.length) {
      const val = parts[idx];
      if (val !== undefined && val !== '') {
        const groupType = idx % 6;
        if (groupType === 0) {
          elements.push(val);
        } else if (groupType === 1) {
          // comment
          elements.push(<span key={idx} className="text-zinc-500 dark:text-zinc-500 italic">{val}</span>);
        } else if (groupType === 2) {
          // string
          elements.push(<span key={idx} className="text-emerald-650 dark:text-emerald-400">{val}</span>);
        } else if (groupType === 3) {
          // keyword
          elements.push(<span key={idx} className="text-teal-600 dark:text-teal-400 font-bold">{val}</span>);
        } else if (groupType === 4) {
          // builtin
          elements.push(<span key={idx} className="text-cyan-600 dark:text-cyan-400">{val}</span>);
        } else if (groupType === 5) {
          // number
          elements.push(<span key={idx} className="text-amber-500 dark:text-amber-400 font-mono">{val}</span>);
        }
      }
      idx++;
    }

    return <>{elements}</>;
  };

  const lines = code.trim().split('\n');

  return (
    <div className="bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-inner my-4 overflow-hidden group/block transition-colors">
      <div className="bg-zinc-100/80 dark:bg-zinc-900/60 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center transition-colors">
        <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-bold">
          {language || 'code'}
        </span>
        <button 
          onClick={handleCopy}
          className="text-[10px] bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 hover:text-teal-600 dark:hover:text-teal-400 hover:border-teal-500/50 px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-800 transition-all font-mono flex items-center gap-1.5 active:scale-95 cursor-pointer opacity-0 group-hover/block:opacity-100 focus:opacity-100"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <div className="py-3 overflow-x-auto relative">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-zinc-200/30 dark:hover:bg-zinc-900/40 group/row transition-colors">
                <td className="w-9 select-none text-right pr-3 text-zinc-400 dark:text-zinc-600 font-mono text-[10px] border-r border-zinc-200/50 dark:border-zinc-800/50 py-0.5">
                  {idx + 1}
                </td>
                <td className="text-zinc-800 dark:text-zinc-300 font-mono text-xs whitespace-pre py-0.5 pl-4 select-text">
                  {highlightLine(line, language)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
