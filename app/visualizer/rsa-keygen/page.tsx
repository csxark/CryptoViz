import type { Metadata } from "next";
import RsaKeyGenerationWizard from "../../../components/asymmetric/RsaKeyGenerationWizard";

export const metadata: Metadata = {
  title: "RSA Key Generation Wizard | CryptoViz",
  description:
    "Interactive educational wizard for generating a toy RSA key pair step by step.",
};

export default function RsaKeyGenerationWizardPage() {
  return <RsaKeyGenerationWizard />;
}
