"use client";

import { motion } from "framer-motion";
import { BookOpen, Eye, FlaskConical, Award } from "lucide-react";

export default function LearningJourney() {
  const steps = [
    {
      id: 1,
      title: "Understand",
      description: "Learn the mathematical foundations and core concepts behind each cipher.",
      icon: <BookOpen className="w-6 h-6 text-teal-600 dark:text-[#00C2AE]" />,
    },
    {
      id: 2,
      title: "Visualize",
      description: "Watch step-by-step animations of encryption and decryption processes.",
      icon: <Eye className="w-6 h-6 text-teal-600 dark:text-[#00C2AE]" />,
    },
    {
      id: 3,
      title: "Experiment",
      description: "Modify keys, inputs, and parameters in the interactive playground.",
      icon: <FlaskConical className="w-6 h-6 text-teal-600 dark:text-[#00C2AE]" />,
    },
    {
      id: 4,
      title: "Master",
      description: "Test your knowledge with challenges and real-world implementation guides.",
      icon: <Award className="w-6 h-6 text-teal-600 dark:text-[#00C2AE]" />,
    },
  ];

  return (
    <section className="bg-zinc-50 dark:bg-[#09090B] py-24 relative overflow-hidden transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-[#F5F5F5] sm:text-4xl">
            Start Learning in Four Steps
          </h2>
          <p className="mt-4 text-base text-zinc-500 dark:text-[#8A8A94]">
            A structured path from theory to practical mastery.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-[12%] right-[12%] h-[2px] bg-zinc-200 dark:bg-[#2A2A31] z-0">
            <motion.div 
              className="h-full bg-gradient-to-r from-teal-400 to-teal-600 dark:from-[#00C2AE] dark:to-[#008A7C]"
              initial={{ width: "0%" }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          </div>

          {steps.map((step, idx) => (
            <motion.div 
              key={step.id}
              className="relative z-10 flex flex-col items-center text-center group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: idx * 0.15 }}
            >
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white dark:bg-[#16161A] border border-zinc-200 dark:border-[#2A2A31] transition-all duration-300 group-hover:scale-110 group-hover:border-teal-500/50 dark:group-hover:border-[#00C2AE]/50 group-hover:shadow-[0_0_20px_rgba(20,184,166,0.15)] dark:group-hover:shadow-[0_0_20px_rgba(0,194,174,0.15)] mb-6">
                {step.icon}
              </div>
              <div className="bg-zinc-50 dark:bg-[#09090B] px-2 transition-colors duration-300">
                <div className="text-xs font-bold text-teal-600 dark:text-[#00C2AE] mb-2 uppercase tracking-widest">
                  Step {step.id}
                </div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-[#F5F5F5] mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-[#8A8A94] leading-relaxed max-w-[250px] mx-auto">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
