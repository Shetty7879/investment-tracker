import { useApp } from '../contexts/AppContext';
import {
  calculateHoldingMetrics,
  calculatePortfolioTotals
} from '../services/portfolioCalculationService';
import type { HoldingMetrics } from '../services/portfolioCalculationService';

export const usePortfolio = (dateFilter?: string, customStart?: string, customEnd?: string) => {
  const { investments, transactions, dataTypeFilter, ownerFilter, marketPrices } = useApp();

  // Helper to determine date range matching
  const filterByDateRange = (dateStr: string) => {
    if (!dateFilter || dateFilter === 'all-time') return true;
    const txDate = new Date(dateStr);
    if (isNaN(txDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (dateFilter) {
      case 'this-month': {
        return txDate.getMonth() === today.getMonth() && txDate.getFullYear() === today.getFullYear();
      }
      case '3-months': {
        const limit = new Date();
        limit.setMonth(today.getMonth() - 3);
        return txDate >= limit;
      }
      case '6-months': {
        const limit = new Date();
        limit.setMonth(today.getMonth() - 6);
        return txDate >= limit;
      }
      case '1-year': {
        const limit = new Date();
        limit.setFullYear(today.getFullYear() - 1);
        return txDate >= limit;
      }
      case 'custom': {
        const start = customStart ? new Date(customStart) : null;
        const end = customEnd ? new Date(customEnd) : null;
        if (start) {
          start.setHours(0, 0, 0, 0);
          if (txDate < start) return false;
        }
        if (end) {
          end.setHours(23, 59, 59, 999);
          if (txDate > end) return false;
        }
        return true;
      }
      default:
        return true;
    }
  };

  // 1. Filter investments by data type, owner, and date limits
  const filteredInvs = investments.filter(inv => {
    // Data type isolation
    if (dataTypeFilter === 'Real' && inv.isDemo) return false;
    if (dataTypeFilter === 'Demo' && !inv.isDemo) return false;

    // Owner filtration
    if (ownerFilter !== 'All' && inv.owner !== ownerFilter) return false;

    // Date range filter
    const buyDate = inv.buyDate || inv.purchaseDate || '2026-01-01';
    if (!filterByDateRange(buyDate)) return false;

    return true;
  });

  // Filter transaction records by data type, owner, and date limits
  const filteredTxs = transactions.filter(tx => {
    // Data type isolation
    if (dataTypeFilter === 'Real' && tx.isDemo) return false;
    if (dataTypeFilter === 'Demo' && !tx.isDemo) return false;

    // Resolve owner from parent investment
    const parent = investments.find(inv => inv.id === tx.investmentId);
    if (parent && ownerFilter !== 'All' && parent.owner !== ownerFilter) return false;

    // Date range filter
    if (!filterByDateRange(tx.date)) return false;

    return true;
  });

  // Compile individual holdings metrics using centralized service
  const holdings: HoldingMetrics[] = filteredInvs.map(inv => {
    // Pass transactions filtered by type/owner constraints to calculateHoldingMetrics
    const parentTxs = filteredTxs.filter(tx => tx.investmentId === inv.id);
    return calculateHoldingMetrics(inv, parentTxs, marketPrices);
  });

  // Calculate aggregates using centralized service
  const portfolioTotal = calculatePortfolioTotals(holdings);

  return {
    holdings,
    portfolioTotal,
    transactions: filteredTxs
  };
};
