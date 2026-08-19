<span className="text-xs font-bold text-teal-500">{expanded ? 'Collapse [-]' : 'Expand [+]'}</span>
      </button>

      {expanded && (
        <div className="p-4 pt-0 border-t border-zinc-200 dark:border-zinc-800/60 space-y-3">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{node.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            {node.fields.map((f, idx) => (
              <div key={idx} className="p-2.5 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500 font-bold block">{f.label}:</span>
                <span className="text-zinc-900 dark:text-white font-medium break-all">{f.value}</span>
              </div>
            ))}
          </div>

          {node.children && node.children.length > 0 && (
            <div className="pl-4 border-l-2 border-teal-500/30 space-y-3 mt-3">
              <span className="text-xs font-bold uppercase text-zinc-500">Nested Child Packets</span>
              {node.children.map(child => (
                <PacketNodeItem key={child.id} node={child} defaultExpanded={true} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
