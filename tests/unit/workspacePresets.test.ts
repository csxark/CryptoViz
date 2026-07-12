import { describe, expect, it } from "vitest";
import {
  WORKSPACE_PRESETS_VERSION,
  createWorkspacePreset,
  duplicateWorkspacePreset,
  normalizeWorkspacePreset,
  normalizeWorkspacePresets,
  renameWorkspacePreset,
} from "../../lib/utils/workspacePresets";

describe("workspace preset utilities", () => {
  it("creates a preset without a key when key storage is not requested", () => {
    const preset = createWorkspacePreset({
      name: " Caesar demo ",
      cipherId: "caesar",
      direction: "encrypt",
      input: "Hello",
      options: { instrument: true, hexInput: false },
      animationSpeed: 2,
    });

    expect(preset.name).toBe("Caesar demo");
    expect(preset.key).toBeUndefined();
    expect(preset.options).toEqual({ hexInput: false });
    expect(preset.version).toBe(WORKSPACE_PRESETS_VERSION);
  });

  it("preserves a key only when included in the draft", () => {
    const preset = createWorkspacePreset({
      name: "AES demo",
      cipherId: "aes",
      direction: "encrypt",
      input: "0011",
      key: "secret",
      options: {},
      animationSpeed: 1,
    });

    expect(preset.key).toBe("secret");
  });

  it("rejects malformed and unsupported presets", () => {
    expect(normalizeWorkspacePreset(null)).toBeNull();
    expect(
      normalizeWorkspacePreset({
        version: 1,
        id: "bad",
        name: "Bad",
        cipherId: "not-a-cipher",
        direction: "encrypt",
        input: "",
        options: {},
        animationSpeed: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ).toBeNull();
  });

  it("removes duplicate ids and invalid entries", () => {
    const preset = createWorkspacePreset({
      name: "Demo",
      cipherId: "caesar",
      direction: "encrypt",
      input: "Hello",
      options: {},
      animationSpeed: 1,
    });

    expect(normalizeWorkspacePresets([preset, preset, null])).toHaveLength(1);
  });

  it("renames and duplicates presets safely", () => {
    const preset = createWorkspacePreset({
      name: "Demo",
      cipherId: "caesar",
      direction: "encrypt",
      input: "Hello",
      options: {},
      animationSpeed: 1,
    });

    const renamed = renameWorkspacePreset(preset, "Updated");
    const duplicate = duplicateWorkspacePreset(renamed);

    expect(renamed.name).toBe("Updated");
    expect(duplicate.id).not.toBe(renamed.id);
    expect(duplicate.name).toBe("Updated copy");
  });
});
