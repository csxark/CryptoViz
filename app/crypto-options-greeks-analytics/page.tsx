import OptionsGreeksVisualizer from '@/components/OptionsGreeksVisualizer';

export const metadata = {
  title: 'Options Greeks & Implied Volatility Analytics | CryptoViz',
  description: 'Enterprise crypto options pricing suite featuring Black-Scholes formulas, analytical Greeks (Delta, Gamma, Theta, Vega, Rho), Newton-Raphson IV solver, and Deribit volatility surface.',
};

export default function OptionsAnalyticsPage() {
  return (
    <main className="min-h-screen bg-slate-950">
      <OptionsGreeksVisualizer />
    </main>
  );
}
