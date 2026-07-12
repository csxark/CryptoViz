"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AnimationSpeed,
  WorkspacePreset,
  WorkspacePresetDraft,
} from "../../lib/utils/workspacePresets";
import {
  createWorkspacePreset,
  duplicateWorkspacePreset,
  loadWorkspacePresets,
  renameWorkspacePreset,
  saveWorkspacePresets,
} from "../../lib/utils/workspacePresets";

interface WorkspacePresetManagerProps {
  cipherId: string;
  workspace: Omit<WorkspacePresetDraft, "name">;
  onLoad: (preset: WorkspacePreset) => void;
}

export default function WorkspacePresetManager({
  cipherId,
  workspace,
  onLoad,
}: WorkspacePresetManagerProps) {
  const [presets, setPresets] = useState<WorkspacePreset[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [saveKey, setSaveKey] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setPresets(loadWorkspacePresets());
  }, []);

  const visiblePresets = useMemo(
    () => presets.filter((preset) => preset.cipherId === cipherId),
    [cipherId, presets],
  );
  const selected = presets.find((preset) => preset.id === selectedId) ?? null;

  const persist = (next: WorkspacePreset[]) => {
    const saved = saveWorkspacePresets(next);
    setPresets(saved);
    return saved;
  };

  const showMessage = (value: string, error = false) => {
    setMessage(value);
    setIsError(error);
  };

  const handleSave = () => {
    try {
      const preset = createWorkspacePreset({
        ...workspace,
        name,
        key: saveKey ? workspace.key : undefined,
      });
      persist([preset, ...presets]);
      setSelectedId(preset.id);
      setName("");
      showMessage(
        saveKey
          ? "Preset saved with its key. Anyone using this browser profile can read it."
          : "Preset saved without storing the key.",
      );
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Preset could not be saved.",
        true,
      );
    }
  };

  const handleLoad = () => {
    if (!selected) {
      showMessage("Select a preset to load.", true);
      return;
    }
    onLoad(selected);
    showMessage("Preset loaded.");
  };

  const handleRename = () => {
    if (!selected) {
      showMessage("Select a preset to rename.", true);
      return;
    }

    const nextName = window.prompt("Enter a new preset name:", selected.name);
    if (nextName === null) return;

    try {
      const renamed = renameWorkspacePreset(selected, nextName);
      persist(
        presets.map((preset) => (preset.id === selected.id ? renamed : preset)),
      );
      showMessage("Preset renamed.");
    } catch (error) {
      showMessage(
        error instanceof Error ? error.message : "Preset could not be renamed.",
        true,
      );
    }
  };

  const handleDuplicate = () => {
    if (!selected) {
      showMessage("Select a preset to duplicate.", true);
      return;
    }

    const duplicate = duplicateWorkspacePreset(selected);
    persist([duplicate, ...presets]);
    setSelectedId(duplicate.id);
    showMessage("Preset duplicated.");
  };

  const handleDelete = () => {
    if (!selected) {
      showMessage("Select a preset to delete.", true);
      return;
    }

    if (!window.confirm(`Delete “${selected.name}”?`)) return;
    persist(presets.filter((preset) => preset.id !== selected.id));
    setSelectedId("");
    showMessage("Preset deleted.");
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      <div>
        <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
          Workspace Presets
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Save and restore visualizer settings in this browser.
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          Preset name
          <input
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            placeholder="Example: AES classroom demo"
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-sm font-normal text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-white"
          />
        </label>

        <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
          <input
            type="checkbox"
            checked={saveKey}
            onChange={(event) => setSaveKey(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            <strong>Save key with preset</strong> — disabled by default. Stored
            keys remain readable to anyone with access to this browser profile.
          </span>
        </label>

        <button
          type="button"
          onClick={handleSave}
          className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-500"
        >
          Save current workspace
        </button>
      </div>

      <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <label className="grid gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
          Saved presets for this cipher
          <select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 text-sm font-normal text-zinc-900 outline-none focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-white"
          >
            <option value="">Select a preset</option>
            {visiblePresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleLoad}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Load
          </button>
          <button
            type="button"
            onClick={handleRename}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={handleDuplicate}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
          >
            Delete
          </button>
        </div>
      </div>

      {message && (
        <p
          role={isError ? "alert" : "status"}
          className={`mt-3 text-xs ${
            isError
              ? "text-red-600 dark:text-red-400"
              : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {message}
        </p>
      )}
    </section>
  );
}
