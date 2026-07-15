"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { Terminal } from "lucide-react";

export default function InteractivePreview() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    const sequence = async () => {
      await new Promise(resolve => setTimeout(resolve, 800));
      setStep(1);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStep(2);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStep(3);
    };

    sequence();
  }, [isInView]);

  return (
    <section className="bg-white dark:bg-[#09090B] py-24 relative overflow-hidden border-y border-zinc-200 dark:border-[#2A2A31] transition-colors duration-300">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-500/5 via-white to-white dark:from-[#00C2AE]/5 dark:via-[#09090B] dark:to-[#09090B] transition-colors duration-300" />
      
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative z-10" ref={containerRef}>
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-[#F5F5F5] sm:text-4xl">
            Interactive Preview
          </h2>
          <p className="mt-4 text-base text-zinc-500 dark:text-[#8A8A94]">
            See exactly how algorithms transform your data.
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="rounded-xl border border-zinc-200 dark:border-[#2A2A31] bg-white dark:bg-[#101013] shadow-2xl overflow-hidden transition-colors duration-300"
        >
          {/* Terminal Header */}
          <div className="flex items-center px-4 py-3 border-b border-zinc-200 dark:border-[#2A2A31] bg-zinc-100 dark:bg-[#16161A] transition-colors duration-300">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-[#303038]" />
              <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-[#303038]" />
              <div className="w-3 h-3 rounded-full bg-zinc-300 dark:bg-[#303038]" />
            </div>
            <div className="mx-auto flex items-center text-xs text-zinc-500 dark:text-[#8A8A94] font-mono">
              <Terminal size={14} className="mr-2" /> preview.sh
            </div>
          </div>

          {/* Terminal Body */}
          <div className="p-6 md:p-10 font-mono text-sm md:text-base min-h-[300px] flex flex-col justify-center">
            
            <div className="mb-6">
              <span className="text-teal-600 dark:text-[#00C2AE] mr-2">❯</span>
              <span className="text-zinc-500 dark:text-[#8A8A94]">Input text: </span>
              <span className="text-zinc-900 dark:text-[#F5F5F5]">
                {step >= 1 ? "Hello Crypto" : <motion.span animate={{ opacity: [0, 1] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-2 h-4 inline-block bg-teal-600 dark:bg-[#00C2AE]" />}
              </span>
            </div>

            {step >= 2 && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="mb-6"
              >
                <span className="text-teal-600 dark:text-[#00C2AE] mr-2">❯</span>
                <span className="text-zinc-500 dark:text-[#8A8A94]">Algorithm: </span>
                <span className="text-zinc-900 dark:text-[#F5F5F5] bg-zinc-100 dark:bg-[#16161A] px-2 py-1 rounded border border-zinc-200 dark:border-[#2A2A31]">AES-256-CBC</span>
              </motion.div>
            )}

            {step >= 3 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="p-4 bg-zinc-50 dark:bg-[#16161A] rounded-lg border border-zinc-200 dark:border-[#2A2A31] mt-4 transition-colors duration-300"
              >
                <div className="text-xs text-zinc-500 dark:text-[#8A8A94] mb-2 uppercase tracking-wider">Encrypted Output</div>
                <div className="text-teal-600 dark:text-[#00C2AE] break-all leading-relaxed">
                  U2FsdGVkX1+9M/j4J3nKx9Pq1y2R+lG7...
                </div>
              </motion.div>
            )}

            {step >= 3 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.5 }}
                className="mt-10 flex justify-center"
              >
                <Link
                  href="/visualizer"
                  className="rounded-lg bg-teal-500 hover:bg-teal-600 dark:bg-[#00C2AE] dark:hover:bg-[#14D8C2] px-6 py-3 text-sm font-semibold text-white dark:text-[#09090B] shadow-md transition-all duration-200"
                >
                  Open Playground
                </Link>
              </motion.div>
            )}

          </div>
        </motion.div>
      </div>
    </section>
  );
}
