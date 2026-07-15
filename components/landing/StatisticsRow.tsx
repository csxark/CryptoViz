import StatCounter from "../ui/StatCounter";

export default function StatisticsRow() {
  const stats = [
    { value: 24, label: "Algorithms", suffix: "+" },
    { value: 18, label: "Learning Modules", suffix: "+" },
    { value: 10, label: "Students", suffix: "K+" },
  ];

  return (
    <section className="border-t border-zinc-200 dark:border-[#2A2A31] bg-white dark:bg-[#09090B] py-16 transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex flex-col items-center justify-center text-center">
              <div className="text-4xl font-extrabold text-zinc-900 dark:text-[#F5F5F5] tracking-tight">
                <StatCounter value={stat.value} duration={2} />
                <span className="text-teal-600 dark:text-[#00C2AE]">{stat.suffix}</span>
              </div>
              <p className="mt-2 text-sm font-medium text-zinc-500 dark:text-[#8A8A94] uppercase tracking-widest">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
