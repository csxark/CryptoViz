"use client";

import { motion } from "framer-motion";
import { Sparkles, Code2, GraduationCap, ShieldCheck, Users } from "lucide-react";

export default function WhyCryptoViz() {
  const features = [
    {
      title: "Interactive Visualizations",
      description: "Don't just read about algorithms. Watch them execute step by step.",
      icon: <Sparkles className="w-5 h-5 text-teal-600 dark:text-[#00C2AE]" />,
    },
    {
      title: "Open Source",
      description: "Completely transparent. Built by the community, for the community.",
      icon: <Code2 className="w-5 h-5 text-teal-600 dark:text-[#00C2AE]" />,
    },
    {
      title: "Beginner Friendly",
      description: "Complex mathematical concepts broken down into understandable chunks.",
      icon: <GraduationCap className="w-5 h-5 text-teal-600 dark:text-[#00C2AE]" />,
    },
    {
      title: "Standards Compliant",
      description: "Implementations follow exact cryptographic standards like FIPS and RFCs.",
      icon: <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-[#00C2AE]" />,
    },
    {
      title: "Community Driven",
      description: "Join hundreds of contributors improving cryptographic education.",
      icon: <Users className="w-5 h-5 text-teal-600 dark:text-[#00C2AE]" />,
    },
  ];

  return (
    <section className="bg-zinc-50 dark:bg-[#09090B] py-24 relative overflow-hidden transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-white dark:bg-[#16161A] border border-zinc-200 dark:border-[#2A2A31] rounded-full px-4 py-1.5 mb-4">
            <span className="text-sm font-medium text-teal-600 dark:text-[#00C2AE]">🌟 Why CryptoViz?</span>
          </div>
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-[#F5F5F5] sm:text-4xl">
            More than just documentation
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: idx * 0.1 }}
              className="group relative flex flex-col justify-between rounded-xl border border-zinc-200 dark:border-[#2A2A31] bg-white dark:bg-[#101013] p-6 hover:bg-zinc-100 dark:hover:bg-[#16161A] transition-all duration-300 hover:-translate-y-1 hover:border-teal-500/50 dark:hover:border-[#008A7C]/50 shadow-sm"
            >
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-50 dark:bg-[#16161A] border border-zinc-200 dark:border-[#2A2A31] mb-4 group-hover:bg-teal-50 dark:group-hover:bg-[#00C2AE]/10 transition-colors duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-[#F5F5F5] group-hover:text-teal-600 dark:group-hover:text-[#00C2AE] transition-colors duration-200">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-zinc-500 dark:text-[#8A8A94] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
