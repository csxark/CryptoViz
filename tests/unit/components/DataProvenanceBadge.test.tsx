import { render, screen } from "@testing-library/react";
import DataProvenanceBadge from "@/components/ui/DataProvenanceBadge";

describe("DataProvenanceBadge", () => {
  it("labels simulated data correctly", () => {
    render(<DataProvenanceBadge provenance="simulated" />);

    expect(screen.getByText("Simulated")).toBeInTheDocument();
  });

  it("labels static data correctly", () => {
    render(<DataProvenanceBadge provenance="static" />);

    expect(screen.getByText("Static Example")).toBeInTheDocument();
  });

  it("labels locally derived data correctly", () => {
    render(<DataProvenanceBadge provenance="derived" />);

    expect(screen.getByText("Locally Derived")).toBeInTheDocument();
  });

  it("labels live data correctly", () => {
    render(
      <DataProvenanceBadge
        provenance={{
          provenance: "live",
          source: "Example API",
        }}
      />,
    );

    expect(screen.getByText("Live Data")).toBeInTheDocument();
  });

  it("labels verified data correctly when evidence exists", () => {
    render(
      <DataProvenanceBadge
        provenance={{
          provenance: "verified",
          source: "NIST",
          verification: {
            method: "Known-answer test comparison",
          },
        }}
      />,
    );

    expect(screen.getByText("Verified")).toBeInTheDocument();
  });
});