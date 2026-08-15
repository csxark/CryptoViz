import EntropyConditioner from '@/components/entropy/EntropyConditioner';

export default function EntropyHarvestingPage() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold font-playfair">Physical Entropy Harvesting & Min-Entropy Conditioner</h1>
      <EntropyConditioner />
    </div>
  );
}
