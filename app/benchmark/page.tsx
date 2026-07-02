"use client";

import { useState } from "react";
import {
  benchmarkMultipleCiphers,
  BenchmarkConfig,
  BenchmarkResult,
  exportBenchmarkCSV,
  generateRandomInput,
} from "@/lib/benchmark/runBenchmark";

const AVAILABLE_CIPHERS = [
  "caesar",
  "rot13",
  "vigenere",
  "atbash",
  "playfair",
  "railfence",
  "xor",
  "otp",
  "des",
  "3des",
  "aes",
  "rsa",
  "dh",
  "ecc",
  "sha256",
  "sha512",
  "md5",
  "hmac",
  "bcrypt",
];

export default function BenchmarkPage() {
  const [selected, setSelected] = useState<string[]>(["aes"]);

  const [iterations, setIterations] = useState(100);

  const [inputSize, setInputSize] = useState(128);

  const [loading, setLoading] = useState(false);

  const [results, setResults] = useState<BenchmarkResult[]>([]);

  const [error, setError] = useState("");

  const toggleCipher = (cipher: string) => {
    if (selected.includes(cipher)) {
      setSelected(selected.filter((c) => c !== cipher));
    } else {
      setSelected([...selected, cipher]);
    }
  };

  async function runBenchmark() {
    if (selected.length === 0) {
      alert("Select at least one algorithm.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const input = generateRandomInput(inputSize);

      const configs: BenchmarkConfig[] = selected.map((cipher) => ({
        cipherId: cipher,
        input,
        key: "benchmark-key",
        iterations,
      }));

      const benchmarkResults =
        await benchmarkMultipleCiphers(configs);

      setResults(benchmarkResults);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-7xl mx-auto p-8">

      <h1 className="text-4xl font-bold mb-6">
        Cipher Performance Benchmark
      </h1>

      <p className="text-gray-500 mb-10">
        Compare encryption and decryption performance
        across multiple cryptographic algorithms.
      </p>

      <div className="border rounded-xl p-6 mb-8">

        <h2 className="text-xl font-semibold mb-4">
          Select Algorithms
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

          {AVAILABLE_CIPHERS.map((cipher) => (

            <label
              key={cipher}
              className="flex items-center gap-2 cursor-pointer"
            >

              <input
                type="checkbox"
                checked={selected.includes(cipher)}
                onChange={() => toggleCipher(cipher)}
              />

              {cipher.toUpperCase()}

            </label>

          ))}

        </div>

      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">

        <div className="border rounded-xl p-6">

          <label className="block mb-2 font-medium">

            Input Size (characters)

          </label>

          <input
            type="number"
            value={inputSize}
            min={16}
            max={100000}
            onChange={(e) =>
              setInputSize(Number(e.target.value))
            }
            className="w-full border rounded-lg px-4 py-2"
          />

        </div>

        <div className="border rounded-xl p-6">

          <label className="block mb-2 font-medium">

            Iterations

          </label>

          <input
            type="number"
            value={iterations}
            min={1}
            max={5000}
            onChange={(e) =>
              setIterations(Number(e.target.value))
            }
            className="w-full border rounded-lg px-4 py-2"
          />

        </div>

      </div>

      <button
        onClick={runBenchmark}
        disabled={loading}
        className="px-6 py-3 rounded-lg bg-blue-600 text-white disabled:opacity-50"
      >
        {loading ? "Running Benchmark..." : "Run Benchmark"}
      </button>

      {error && (
        <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <></>
                  <div className="mt-10 border rounded-xl p-6">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">

              <h2 className="text-2xl font-semibold">
                Benchmark Results
              </h2>

              <button
                onClick={() => exportBenchmarkCSV(results)}
                className="mt-4 md:mt-0 px-5 py-2 rounded-lg bg-green-600 text-white"
              >
                Export CSV
              </button>

            </div>

            <div className="overflow-x-auto">

              <table className="min-w-full border-collapse">

                <thead>

                  <tr className="border-b">

                    <th className="text-left py-3 px-4">
                      Algorithm
                    </th>

                    <th className="text-left py-3 px-4">
                      Avg Encrypt (ms)
                    </th>

                    <th className="text-left py-3 px-4">
                      Avg Decrypt (ms)
                    </th>

                    <th className="text-left py-3 px-4">
                      Total Encrypt
                    </th>

                    <th className="text-left py-3 px-4">
                      Total Decrypt
                    </th>

                    <th className="text-left py-3 px-4">
                      Iterations
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {results.map((result) => (

                    <tr
                      key={result.cipherId}
                      className="border-b hover:bg-gray-50"
                    >

                      <td className="py-3 px-4 font-medium uppercase">
                        {result.cipherId}
                      </td>

                      <td className="py-3 px-4">
                        {result.encryptionTime.toFixed(4)}
                      </td>

                      <td className="py-3 px-4">
                        {result.decryptionTime.toFixed(4)}
                      </td>

                      <td className="py-3 px-4">
                        {result.totalEncryptionTime.toFixed(4)}
                      </td>

                      <td className="py-3 px-4">
                        {result.totalDecryptionTime.toFixed(4)}
                      </td>

                      <td className="py-3 px-4">
                        {result.iterations}
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

            <div className="mt-8 border-t pt-6">

              <h3 className="text-xl font-semibold mb-4">
                Device Information
              </h3>

              <div className="grid md:grid-cols-2 gap-4">

                <div className="border rounded-lg p-4">
                  <p className="font-medium">Platform</p>
                  <p>{navigator.platform}</p>
                </div>

                <div className="border rounded-lg p-4">
                  <p className="font-medium">Language</p>
                  <p>{navigator.language}</p>
                </div>

                <div className="border rounded-lg p-4">
                  <p className="font-medium">CPU Threads</p>
                  <p>{navigator.hardwareConcurrency}</p>
                </div>

                <div className="border rounded-lg p-4">
                  <p className="font-medium">Browser</p>
                  <p className="break-all">
                    {navigator.userAgent}
                  </p>
                </div>

              </div>

            </div>

          </div>

        </>
      )}

    </main>
  );
}