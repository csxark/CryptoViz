import { useState, useMemo } from 'react';
import { ProtocolData } from '@/lib/mock/screenerData';

export type SortField = keyof ProtocolData | null;
export type SortDirection = 'asc' | 'desc';

export interface FilterState {
    searchQuery: string;
    categories: Set<ProtocolData['category']>;
    minYield: number | null;
    maxYield: number | null;
    minSentiment: number | null;
    riskLevels: Set<ProtocolData['riskLevel']>;
}

export const useScreenerAnalytics = (initialData: ProtocolData[]) => {
    const [data] = useState<ProtocolData[]>(initialData);
    const [sortField, setSortField] = useState<SortField>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    const [filters, setFilters] = useState<FilterState>({
        searchQuery: '',
        categories: new Set(),
        minYield: null,
        maxYield: null,
        minSentiment: null,
        riskLevels: new Set()
    });

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const toggleCategoryInfo = (category: ProtocolData['category']) => {
        setFilters(prev => {
            const newCats = new Set(prev.categories);
            if (newCats.has(category)) newCats.delete(category);
            else newCats.add(category);
            return { ...prev, categories: newCats };
        });
    };

    const toggleRiskLevel = (risk: ProtocolData['riskLevel']) => {
        setFilters(prev => {
            const newRisks = new Set(prev.riskLevels);
            if (newRisks.has(risk)) newRisks.delete(risk);
            else newRisks.add(risk);
            return { ...prev, riskLevels: newRisks };
        });
    };

    const clearFilters = () => {
        setFilters({
            searchQuery: '',
            categories: new Set(),
            minYield: null,
            maxYield: null,
            minSentiment: null,
            riskLevels: new Set()
        });
    };

    const filteredAndSortedData = useMemo(() => {
        let result = [...data];

        // 1. Search Query
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            result = result.filter(item =>
                item.name.toLowerCase().includes(query) ||
                item.symbol.toLowerCase().includes(query)
            );
        }

        // 2. Categories
        if (filters.categories.size > 0) {
            result = result.filter(item => filters.categories.has(item.category));
        }

        // 3. Risk Levels
        if (filters.riskLevels.size > 0) {
            result = result.filter(item => filters.riskLevels.has(item.riskLevel));
        }

        // 4. Yield Range
        if (filters.minYield !== null) {
            result = result.filter(item => item.yieldPercentage >= filters.minYield!);
        }
        if (filters.maxYield !== null) {
            result = result.filter(item => item.yieldPercentage <= filters.maxYield!);
        }

        // 5. Sentiment
        if (filters.minSentiment !== null) {
            result = result.filter(item => item.sentimentScore >= filters.minSentiment!);
        }

        // 6. Sorting
        if (sortField) {
            result.sort((a, b) => {
                const valA = a[sortField];
                const valB = b[sortField];

                let comparison = 0;
                if (typeof valA === 'string' && typeof valB === 'string') {
                    comparison = valA.localeCompare(valB);
                } else if (typeof valA === 'number' && typeof valB === 'number') {
                    comparison = valA - valB;
                }

                return sortDirection === 'asc' ? comparison : -comparison;
            });
        }

        return result;
    }, [data, filters, sortField, sortDirection]);

    // Derived Analytics
    const analyticsSummary = useMemo(() => {
        const totalTvl = filteredAndSortedData.reduce((acc, curr) => acc + curr.tvl, 0);
        const avgYield = filteredAndSortedData.length > 0
            ? filteredAndSortedData.reduce((acc, curr) => acc + curr.yieldPercentage, 0) / filteredAndSortedData.length
            : 0;
        const avgSentiment = filteredAndSortedData.length > 0
            ? filteredAndSortedData.reduce((acc, curr) => acc + curr.sentimentScore, 0) / filteredAndSortedData.length
            : 0;
        const totalVolume = filteredAndSortedData.reduce((acc, curr) => acc + curr.volume24h, 0);

        return {
            totalProtocols: filteredAndSortedData.length,
            totalTvl,
            avgYield,
            avgSentiment,
            totalVolume
        };
    }, [filteredAndSortedData]);

    return {
        filteredAndSortedData,
        sortField,
        sortDirection,
        handleSort,
        filters,
        updateFilter,
        toggleCategoryInfo,
        toggleRiskLevel,
        clearFilters,
        analyticsSummary
    };
};
