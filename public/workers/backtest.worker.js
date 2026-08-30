/**
 * Web Worker for Algorithmic Strategy Backtesting.
 * Isolated from the DOM to prevent main-thread freezing during millions of loop iterations.
 */

self.onmessage = function (e) {
  const { code, initialBalance } = e.data;

  // 1. Mock massive historical OHLCV data (e.g. BTC/USD 1-hour candles for 1 year)
  // In a real application, this would be fetched from IndexedDB or an API
  const mockHistoricalData = [];
  let currentPrice = 50000;
  for (let i = 0; i < 10000; i++) {
    const volatility = (Math.random() - 0.5) * 500;
    currentPrice += volatility;
    mockHistoricalData.push({
      timestamp: Date.now() - (10000 - i) * 3600000,
      open: currentPrice - 50,
      high: currentPrice + 100,
      low: currentPrice - 100,
      close: currentPrice,
      volume: Math.random() * 100
    });
  }

  try {
    // 2. Safely parse the user's stringified javascript code into an executable function block
    // We use `new Function` with predefined parameter names.
    // The user's code must have a return statement that returns 'BUY', 'SELL', or 'HOLD'.
    const userStrategy = new Function('tick', 'portfolio', 'history', code);

    // 3. Setup Virtual Portfolio
    let portfolio = {
      usd: initialBalance,
      crypto: 0,
      totalValue: initialBalance
    };

    let trades = 0;
    let winningTrades = 0;
    let maxDrawdown = 0;
    let peakValue = initialBalance;
    const equityCurve = [];

    // 4. The Simulation Loop
    const historyBuffer = [];
    
    for (let i = 0; i < mockHistoricalData.length; i++) {
      const tick = mockHistoricalData[i];
      historyBuffer.push(tick);
      
      // Prevent buffer from growing infinitely (keep last 100 candles for MA calculations)
      if (historyBuffer.length > 100) historyBuffer.shift();

      // Execute user logic
      const action = userStrategy(tick, portfolio, historyBuffer);

      if (action === 'BUY' && portfolio.usd > 0) {
        // Buy with 100% of USD
        const amountBought = portfolio.usd / tick.close;
        portfolio.crypto += amountBought;
        portfolio.usd = 0;
        trades++;
      } else if (action === 'SELL' && portfolio.crypto > 0) {
        // Sell 100% of Crypto
        const usdGained = portfolio.crypto * tick.close;
        portfolio.usd += usdGained;
        
        // Track win rate
        if (portfolio.usd > initialBalance) winningTrades++;
        
        portfolio.crypto = 0;
        trades++;
      }

      // Update metrics
      portfolio.totalValue = portfolio.usd + (portfolio.crypto * tick.close);
      
      if (portfolio.totalValue > peakValue) {
        peakValue = portfolio.totalValue;
      }
      
      const drawdown = ((peakValue - portfolio.totalValue) / peakValue) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }

      // Every 100 ticks, send a progress update to the main thread
      if (i % 100 === 0) {
        equityCurve.push({ time: tick.timestamp, value: portfolio.totalValue });
        self.postMessage({
          type: 'PROGRESS',
          progress: Math.floor((i / mockHistoricalData.length) * 100)
        });
      }
    }

    // 5. Final Report
    const finalValue = portfolio.usd + (portfolio.crypto * mockHistoricalData[mockHistoricalData.length - 1].close);
    const pnl = finalValue - initialBalance;
    const pnlPercent = (pnl / initialBalance) * 100;
    const winRate = trades > 0 ? (winningTrades / Math.floor(trades / 2)) * 100 : 0; // Rough estimate of round trips

    self.postMessage({
      type: 'COMPLETE',
      result: {
        finalBalance: finalValue.toFixed(2),
        pnl: pnl.toFixed(2),
        pnlPercent: pnlPercent.toFixed(2),
        trades,
        winRate: winRate.toFixed(2),
        maxDrawdown: maxDrawdown.toFixed(2),
        equityCurve
      }
    });

  } catch (err) {
    self.postMessage({
      type: 'ERROR',
      error: err.message || 'Syntax Error in Custom Strategy'
    });
  }
};
