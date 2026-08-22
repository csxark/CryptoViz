import ShannonEntropyWorkbench from "../../components/math/ShannonEntropyWorkbench";

export default function EntropyWorkbenchPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
          Information-Theoretic Security Workbench
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Explore Shannon's foundations of cryptography, perfect secrecy, and unicity distances.
        </p>
      </div>

      <ShannonEntropyWorkbench />
    </div>
  );
}
