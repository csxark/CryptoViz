import Link from 'next/link'
import { Bookmark, ExternalLink, BookmarkX } from 'lucide-react'
import { type BookmarkedResource } from '@/hooks/useProgress'
import Card from '@/components/ui/Card'

interface BookmarksProps { bookmarks: BookmarkedResource[]; onRemove: (id: string) => void }

export default function Bookmarks({ bookmarks, onRemove }: BookmarksProps) {
  return (
    <Card className="dark:bg-zinc-900/40 p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Bookmarks</h2>
        <span className="text-xs text-zinc-400">{bookmarks.length} saved</span>
      </div>
      {bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Bookmark size={28} className="text-zinc-300 dark:text-zinc-700 mb-2" />
          <p className="text-sm text-zinc-400 dark:text-zinc-500">No bookmarks yet.</p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-600">Save resources from the <Link href="/resources" className="text-teal-500 hover:underline">Resources</Link> page.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {bookmarks.map(bm => (
            <li key={bm.id} className="group flex items-center gap-3 rounded-lg border border-zinc-100 dark:border-zinc-800 px-3.5 py-2.5 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all">
              <Bookmark size={14} className="shrink-0 text-teal-500" />
              <Link href={bm.href} className="flex-1 min-w-0 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-teal-500 truncate transition-colors">{bm.title}</Link>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link href={bm.href} className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-teal-500 transition-colors"><ExternalLink size={12} /></Link>
                <button onClick={() => onRemove(bm.id)} className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-rose-500 transition-colors" aria-label={`Remove ${bm.title}`}><BookmarkX size={12} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
