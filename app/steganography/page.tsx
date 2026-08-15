import SteganographyWorkbench from '@/components/stego/SteganographyWorkbench';

export default function SteganographyPage() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold font-playfair">Digital Steganography & Covert Channels</h1>
      <SteganographyWorkbench />
    </div>
  );
}
