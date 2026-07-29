import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CertificatePage from "@/app/certificate/page";

describe("CertificatePage", () => {
  it("renders the certificate claim form initially", () => {
    render(<CertificatePage />);
    expect(screen.getByText("Claim Your Certificate")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate Certificate" })).toBeInTheDocument();
  });

  it("generates the certificate when a name is submitted", () => {
    render(<CertificatePage />);
    
    const input = screen.getByLabelText("Full Name");
    fireEvent.change(input, { target: { value: "Ada Lovelace" } });
    
    const button = screen.getByRole("button", { name: "Generate Certificate" });
    fireEvent.click(button);
    
    expect(screen.getByText("Your Certificate is Ready")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("CryptoViz Platform")).toBeInTheDocument();
  });

  it("does not generate certificate if name is empty", () => {
    render(<CertificatePage />);
    
    const button = screen.getByRole("button", { name: "Generate Certificate" });
    fireEvent.click(button);
    
    expect(screen.queryByText("Your Certificate is Ready")).not.toBeInTheDocument();
    expect(screen.getByText("Claim Your Certificate")).toBeInTheDocument();
  });
});
