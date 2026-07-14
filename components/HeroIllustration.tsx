"use client";
import {
  Shield,
  Lock,
  Cpu,
  KeyRound,
} from "lucide-react";

const rotationStyles = `
  @keyframes spin-y {
    from { transform: perspective(1000px) rotateX(18deg) rotateY(-18deg); }
    to { transform: perspective(1000px) rotateX(18deg) rotateY(342deg); }
  }
  .animate-spin-y {
    animation: spin-y 12s linear infinite;
  }
`;

export default function HeroIllustration() {
  return (
    <div className="relative flex h-[660px] w-[620px] -my-4 items-center justify-center overflow-visible bg-black select-none mb-16">
      <style>{rotationStyles}</style>

      {/* Atmospheric Space (No square bounding fills) */}
      <div className="absolute -left-24 top-14 h-[500px] w-[500px] rounded-full border border-[#2A2A31]/20 pointer-events-none" />
      <div className="absolute right-[-120px] top-32 h-[420px] w-[420px] rounded-full border border-[#2A2A31]/20 pointer-events-none" />
      <div className="absolute left-[90px] top-[60px] h-[460px] w-[460px] rotate-12 rounded-full border border-[#00C2AE]/5 pointer-events-none" />

      {/* Primary Teal Smooth Gradients */}
      <div className="absolute h-[600px] w-[600px] rounded-full bg-[#00C2AE]/4 blur-[140px] pointer-events-none" />
      <div className="absolute h-[450px] w-[450px] rounded-full bg-[#008A7C]/3 blur-[120px] pointer-events-none" />

      {/* Infinite Area Container */}
      <div className="relative h-full w-full flex items-center justify-center">

        {/* Vertical Base Light Ray */}
        <div className="absolute bottom-[160px] left-1/2 h-[210px] w-[140px] -translate-x-1/2 bg-gradient-to-t from-[#00C2AE]/10 via-[#00C2AE]/3 to-transparent blur-2xl pointer-events-none" />

        {/* 3D Configured Orbit Rings */}
        <div
          className="absolute h-[420px] w-[420px] rounded-full border border-[#2A2A31]/40 pointer-events-none"
          style={{ transform: "rotateX(72deg) rotateZ(18deg)" }}
        />
        <div
          className="absolute h-[330px] w-[330px] rounded-full border border-[#00C2AE]/10 animate-spin pointer-events-none"
          style={{
            animationDuration: "28s",
            transform: "rotateX(72deg) rotateY(25deg)",
          }}
        />
        <div
          className="absolute h-[470px] w-[470px] rounded-full border border-[#2A2A31]/30 pointer-events-none"
          style={{ transform: "rotateX(70deg) rotateY(-30deg)" }}
        />

        {/* Interactive Floating Network Nodes */}
        <div className="absolute left-[135px] top-[200px] h-2 w-2 rounded-full bg-[#00C2AE] shadow-[0_0_15px_#00C2AE]" />
        <div className="absolute right-[140px] top-[170px] h-2 w-2 rounded-full bg-[#14D8C2] shadow-[0_0_15px_#14D8C2]" />
        <div className="absolute left-[160px] bottom-[220px] h-2 w-2 rounded-full bg-[#008A7C] shadow-[0_0_15px_#008A7C]" />
        <div className="absolute right-[150px] bottom-[240px] h-2 w-2 rounded-full bg-[#00C2AE] shadow-[0_0_15px_#00C2AE]" />

        {/* Dynamic Vector Curves */}
        <svg className="absolute inset-0 h-full w-full pointer-events-none opacity-40" viewBox="0 0 620 660">
          <path d="M180 240 C270 190 350 190 440 240" stroke="#2A2A31" strokeWidth="1" fill="none" />
          <path d="M190 420 C290 470 360 470 430 410" stroke="#2A2A31" strokeWidth="1" fill="none" />
        </svg>

        {/* --- Unified System Feature Blocks --- */}

        {/* AES - Top Left */}
        <div
          className="absolute left-[65px] top-[130px] animate-[float_6s_ease-in-out_infinite]"
          style={{ transform: "perspective(1000px) rotateY(16deg) rotateX(6deg)" }}
        >
          <div className="rounded-xl border border-[#2A2A31] bg-[#16161A] px-5 py-4 shadow-xl">
            <Lock className="mb-2 text-[#00C2AE]" size={18} />
            <p className="text-[10px] font-medium tracking-widest text-[#8A8A94] uppercase">AES-256</p>
            <h3 className="text-sm font-semibold text-[#F5F5F5]">Encryption</h3>
          </div>
        </div>

        {/* SHA - Top Right */}
        <div
          className="absolute right-[45px] top-[190px] animate-[float_7s_ease-in-out_infinite]"
          style={{ transform: "perspective(1000px) rotateY(-16deg)" }}
        >
          <div className="rounded-xl border border-[#2A2A31] bg-[#16161A] px-5 py-4 shadow-xl">
            <Cpu className="mb-2 text-[#00C2AE]" size={18} />
            <p className="text-[10px] font-medium tracking-widest text-[#8A8A94] uppercase">SHA-512</p>
            <h3 className="text-sm font-semibold text-[#F5F5F5]">Hash Function</h3>
          </div>
        </div>

        {/* RSA - Bottom Left */}
        <div
          className="absolute left-[55px] bottom-[185px] animate-[float_8s_ease-in-out_infinite]"
          style={{ transform: "perspective(1000px) rotateY(16deg)" }}
        >
          <div className="rounded-xl border border-[#2A2A31] bg-[#16161A] px-5 py-4 shadow-xl">
            <KeyRound className="mb-2 text-[#00C2AE]" size={18} />
            <p className="text-[10px] font-medium tracking-widest text-[#8A8A94] uppercase">RSA</p>
            <h3 className="text-sm font-semibold text-[#F5F5F5]">Asymmetric</h3>
          </div>
        </div>

        {/* ECC - Bottom Right (Shifted Upwards to avoid screen clipping) */}
        <div
          className="absolute right-[55px] bottom-[155px] animate-[float_9s_ease-in-out_infinite]"
          style={{ transform: "perspective(1000px) rotateY(-16deg)" }}
        >
          <div className="rounded-xl border border-[#2A2A31] bg-[#16161A] px-5 py-4 shadow-xl">
            <Shield className="mb-2 text-[#00C2AE]" size={18} />
            <p className="text-[10px] font-medium tracking-widest text-[#8A8A94] uppercase">ECC</p>
            <h3 className="text-sm font-semibold text-[#F5F5F5]">Elliptic Curve</h3>
          </div>
        </div>

        {/* Core Shield Radial Soft Blur Fields */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-[200px] w-[200px] rounded-full bg-[#00C2AE]/8 blur-[60px]" />
          <div className="absolute h-[300px] w-[300px] rounded-full bg-[#008A7C]/4 blur-[100px]" />
        </div>

        {/* --- Seamless Floating Shield Unit --- */}
        <div className="absolute z-10 animate-[float_6s_ease-in-out_infinite]">
          <div
            className="relative flex h-40 w-44 items-center justify-center rounded-full
                       border border-[#2A2A31] bg-[#101013]
                       shadow-[0_0_40px_rgba(0,194,174,0.08)]
                       animate-spin-y"
          >
            {/* Native Circular Overlay Metrics */}
            <div className="absolute inset-3 rounded-full border border-[#2A2A31]/40 pointer-events-none" />
            <div className="absolute inset-6 rounded-full border border-[#00C2AE]/5 pointer-events-none" />

            <Shield
              size={80}
              strokeWidth={1.5}
              className="text-[#00d2bd] drop-shadow-[0_0_15px_rgba(0,194,174,0.35)]"
            />
            <Lock
              size={24}
              strokeWidth={2}
              className="absolute text-[#F5F5F5] drop-shadow-[0_0_8px_rgba(245,245,245,0.25)]"
            />
          </div>
        </div>
      </div>

    </div>
  );
}