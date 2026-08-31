export default function SecretRecoveryDocs() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-4xl font-bold mb-6">
        Interactive Secret Recovery Simulator
      </h1>

      <p className="mb-6">
        Secret sharing allows a sensitive secret to be divided into
        multiple shares. Only a predefined threshold of shares is
        required to reconstruct the original secret.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-4">
        How It Works
      </h2>

      <ol className="list-decimal pl-6 space-y-2">
        <li>Generate a secret.</li>
        <li>Split it into multiple shares.</li>
        <li>Distribute shares to participants.</li>
        <li>Collect the threshold number of shares.</li>
        <li>Recover the original secret using interpolation.</li>
      </ol>

      <h2 className="text-2xl font-semibold mt-8 mb-4">
        Applications
      </h2>

      <ul className="list-disc pl-6 space-y-2">
        <li>Hardware security modules (HSMs)</li>
        <li>Secure key backup</li>
        <li>Distributed key management</li>
        <li>Threshold cryptography</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-4">
        References
      </h2>

      <ul className="list-disc pl-6">
        <li>Adi Shamir – "How to Share a Secret" (1979)</li>
        <li>Threshold Cryptography</li>
      </ul>
    </main>
  );
}