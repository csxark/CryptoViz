import type { Metadata } from "next";
import WorkerArchitectureGuide from "../../../components/docs/WorkerArchitectureGuide";

export const metadata: Metadata = {
  title: "Worker Architecture Documentation | CryptoViz",
  description:
    "Interactive documentation explaining CryptoViz Web Worker request, execution, response, error, and testing flow.",
};

export default function WorkerArchitectureDocumentationPage() {
  return <WorkerArchitectureGuide />;
}
