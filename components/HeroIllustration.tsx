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
  
  /* Matrix fix: simulates 3D tilt perfectly without compressing/distorting children text boxes */
  @keyframes orbit-container {
    from { transform: scaleY(0.48) rotate(0deg); }
    to { transform: scaleY(0.48) rotate(360deg); }
  }
  
  @keyframes orbit-item {
    from { transform: rotate(0deg) scaleY(2.083); }
    to { transform: rotate(-360deg) scaleY(2.083); }
  }
`;

export default function HeroIllustration() {
  return (
    /* Shifted left using mr-auto and added responsive negative margin-left for desktop screens */
    <div className="relative flex h-[660px] w-full max-w-[620px] -my-4 items-center justify-center overflow-visible bg-transparent select-none mb-16 mr-auto lg:-ml-12" aria-hidden="true">
      <style>{rotationStyles}</style>

      {/* Atmospheric Space */}
      <div className="absolute -left-24 top-14 h-[540px] w-[540px] rounded-full border border-zinc-200/20 dark:border-[#2A2A31]/20 pointer-events-none" />
      <div className="absolute right-[-120px] top-32 h-[420px] w-[420px] rounded-full border border-zinc-200/20 dark:border-[#2A2A31]/20 pointer-events-none" />
      <div className="absolute left-[90px] top-[60px] h-[460px] w-[460px] rotate-12 rounded-full border border-teal-500/10 dark:border-[#00C2AE]/5 pointer-events-none" />

      {/* Primary Teal Smooth Gradients */}
      <div className="absolute h-[600px] w-[600px] rounded-full bg-teal-500/5 dark:bg-[#00C2AE]/4 blur-[140px] pointer-events-none" />
      <div className="absolute h-[450px] w-[450px] rounded-full bg-teal-600/5 dark:bg-[#008A7C]/3 blur-[120px] pointer-events-none" />

      {/* Infinite Area Container */}
      <div className="relative h-full w-full flex items-center justify-center">

        {/* Vertical Base Light Ray */}
        <div className="absolute bottom-[160px] left-1/2 h-[210px] w-[140px] -translate-x-1/2 bg-gradient-to-t from-teal-500/10 via-teal-500/3 dark:from-[#00C2AE]/10 dark:via-[#00C2AE]/3 to-transparent blur-2xl pointer-events-none" />

        {/* Static Background Orbit Rings (Tilted visually using scale/rotate matches) */}
        <div
          className="absolute h-[420px] w-[420px] rounded-full border border-zinc-200/50 dark:border-[#2A2A31]/40 pointer-events-none"
          style={{ transform: "scaleY(0.4) rotate(18deg)" }}
        />
        <div
          className="absolute h-[330px] w-[330px] rounded-full border border-teal-500/20 dark:border-[#00C2AE]/10 animate-spin pointer-events-none"
          style={{
            animationDuration: "28s",
            transform: "scaleY(0.4) rotate(25deg)",
          }}
        />
        <div
          className="absolute h-[470px] w-[470px] rounded-full border border-zinc-200/40 dark:border-[#2A2A31]/30 pointer-events-none"
          style={{ transform: "scaleY(0.4) rotate(-30deg)" }}
        />

        {/* Floating Network Nodes */}
        <div className="absolute left-[135px] top-[200px] h-2 w-2 rounded-full bg-teal-500 shadow-[0_0_15px_rgba(20,184,166,1)] dark:bg-[#00C2AE] dark:shadow-[0_0_15px_#00C2AE]" />
        <div className="absolute right-[140px] top-[170px] h-2 w-2 rounded-full bg-teal-400 shadow-[0_0_15px_rgba(45,212,191,1)] dark:bg-[#14D8C2] dark:shadow-[0_0_15px_#14D8C2]" />
        <div className="absolute left-[160px] bottom-[220px] h-2 w-2 rounded-full bg-teal-600 shadow-[0_0_15px_rgba(13,148,136,1)] dark:bg-[#008A7C] dark:shadow-[0_0_15px_#008A7C]" />
        <div className="absolute right-[150px] bottom-[240px] h-2 w-2 rounded-full bg-teal-500 shadow-[0_0_15px_rgba(20,184,166,1)] dark:bg-[#00C2AE] dark:shadow-[0_0_15px_#00C2AE]" />

        {/* Dynamic Vector Curves */}
        <svg className="absolute inset-0 h-full w-full pointer-events-none opacity-40" viewBox="0 0 620 660">
          <path d="M180 240 C270 190 350 190 440 240" stroke="currentColor" className="text-zinc-200 dark:text-[#2A2A31]" strokeWidth="1" fill="none" />
          <path d="M190 420 C290 470 360 470 430 410" stroke="currentColor" className="text-zinc-200 dark:text-[#2A2A31]" strokeWidth="1" fill="none" />
        </svg>

        {/* --- 2D Clean-Orbiting Feature Blocks --- */}
        <div 
          className="absolute h-[520px] w-[520px] pointer-events-none flex items-center justify-center"
          style={{ animation: 'orbit-container 25s linear infinite' }}
        >
          
          {/* AES - Top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div style={{ animation: 'orbit-item 25s linear infinite' }} className="rounded-2xl border border-zinc-200 dark:border-[#2A2A31] bg-white dark:bg-[#16161A] px-6 py-4 shadow-2xl min-w-[130px]">
              <Lock className="mb-2 text-teal-600 dark:text-[#00C2AE]" size={20} />
              <p className="text-[10px] font-medium tracking-widest text-zinc-500 dark:text-[#8A8A94] uppercase">AES-256</p>
              <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-[#F5F5F5] whitespace-nowrap">Encryption</h3>
            </div>
          </div>

          {/* SHA - Right */}
          <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2">
            <div style={{ animation: 'orbit-item 25s linear infinite' }} className="rounded-2xl border border-zinc-200 dark:border-[#2A2A31] bg-white dark:bg-[#16161A] px-6 py-4 shadow-2xl min-w-[130px]">
              <Cpu className="mb-2 text-teal-600 dark:text-[#00C2AE]" size={20} />
              <p className="text-[10px] font-medium tracking-widest text-zinc-500 dark:text-[#8A8A94] uppercase">SHA-512</p>
              <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-[#F5F5F5] whitespace-nowrap">Hash Function</h3>
            </div>
          </div>

          {/* RSA - Bottom */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
            <div style={{ animation: 'orbit-item 25s linear infinite' }} className="rounded-2xl border border-zinc-200 dark:border-[#2A2A31] bg-white dark:bg-[#16161A] px-6 py-4 shadow-2xl min-w-[130px]">
              <KeyRound className="mb-2 text-teal-600 dark:text-[#00C2AE]" size={20} />
              <p className="text-[10px] font-medium tracking-widest text-zinc-500 dark:text-[#8A8A94] uppercase">RSA</p>
              <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-[#F5F5F5] whitespace-nowrap">Asymmetric</h3>
            </div>
          </div>

          {/* ECC - Left */}
          <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2">
            <div style={{ animation: 'orbit-item 25s linear infinite' }} className="rounded-2xl border border-zinc-200 dark:border-[#2A2A31] bg-white dark:bg-[#16161A] px-6 py-4 shadow-2xl min-w-[130px]">
              <Shield className="mb-2 text-teal-600 dark:text-[#00C2AE]" size={20} />
              <p className="text-[10px] font-medium tracking-widest text-zinc-500 dark:text-[#8A8A94] uppercase">ECC</p>
              <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-[#F5F5F5] whitespace-nowrap">Elliptic Curve</h3>
            </div>
          </div>

        </div>

        {/* Core Shield Soft Glow Blurs */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-[200px] w-[200px] rounded-full bg-teal-500/10 dark:bg-[#00C2AE]/8 blur-[60px]" />
          <div className="absolute h-[300px] w-[300px] rounded-full bg-teal-600/5 dark:bg-[#008A7C]/4 blur-[100px]" />
        </div>

        {/* --- Seamless Floating Central Shield Unit --- */}
        <div className="absolute z-10 animate-[float_6s_ease-in-out_infinite]">
          <div
            className="relative flex h-[152px] w-[168px] items-center justify-center rounded-full
                       border border-zinc-200 dark:border-[#2A2A31] bg-white dark:bg-[#101013]
                       shadow-[0_0_40px_rgba(20,184,166,0.1)] dark:shadow-[0_0_40px_rgba(0,194,174,0.08)]
                       animate-spin-y"
          >
            <div className="absolute inset-3 rounded-full border border-zinc-200/50 dark:border-[#2A2A31]/40 pointer-events-none" />
            <div className="absolute inset-6 rounded-full border border-teal-500/10 dark:border-[#00C2AE]/5 pointer-events-none" />

            <Shield
              size={88}
              strokeWidth={1.5}
              className="text-teal-500 dark:text-[#00d2bd] drop-shadow-[0_0_15px_rgba(20,184,166,0.3)] dark:drop-shadow-[0_0_15px_rgba(0,194,174,0.35)]"
            />
            <Lock
              size={24}
              strokeWidth={2}
              className="absolute text-zinc-900 dark:text-[#F5F5F5] drop-shadow-[0_0_8px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_0_8px_rgba(245,245,245,0.25)]"
            />
          </div>
        </div>
      </div>

    </div>
  );
}