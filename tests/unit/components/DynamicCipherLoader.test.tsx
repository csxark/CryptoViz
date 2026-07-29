import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DynamicCipherLoader from "@/components/cipher/DynamicCipherLoader";

describe("DynamicCipherLoader", () => {
  it("renders main title, telemetry banner, and catalog of dynamic ciphers", () => {
    render(<DynamicCipherLoader />);

    expect(screen.getByText("Dynamic Cipher Loader")).toBeInTheDocument();
    expect(screen.getByText("Runtime Module Extension Framework")).toBeInTheDocument();
    expect(screen.getByText("Custom 4x4 S-Box Mini-AES")).toBeInTheDocument();
    expect(screen.getByText("Affine Cipher E(x)=(a·x+b) mod 26")).toBeInTheDocument();
  });

  it("switches tabs between Module Catalog, Custom Builder, Live Playground, and Load Telemetry", () => {
    render(<DynamicCipherLoader />);

    // Click Custom Builder Tab
    const builderTabBtn = screen.getByRole("button", { name: /Custom Builder/i });
    fireEvent.click(builderTabBtn);
    expect(
      screen.getByText("Build & Dynamically Register Custom Cipher Module"),
    ).toBeInTheDocument();

    // Click Live Playground Tab
    const playgroundTabBtn = screen.getByRole("button", { name: /Live Playground/i });
    fireEvent.click(playgroundTabBtn);
    expect(screen.getByText(/Dynamic Playground:/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Run Execution/i })).toBeInTheDocument();

    // Click Load Telemetry Tab
    const telemetryTabBtn = screen.getByRole("button", { name: /Load Telemetry/i });
    fireEvent.click(telemetryTabBtn);
    expect(screen.getByText("Cipher ID")).toBeInTheDocument();
  });

  it("executes encryption in playground tab", () => {
    render(<DynamicCipherLoader />);

    const playgroundTabBtn = screen.getByRole("button", { name: /Live Playground/i });
    fireEvent.click(playgroundTabBtn);

    const runBtn = screen.getByRole("button", { name: /Run Execution/i });
    fireEvent.click(runBtn);

    expect(screen.getByText(/Compute Duration:/i)).toBeInTheDocument();
  });
});
