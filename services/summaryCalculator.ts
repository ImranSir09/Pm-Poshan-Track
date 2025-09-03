import { AppData, MonthlyBalanceData, Category, AbstractData } from '../types';
import { DEFAULT_SETTINGS } from '../constants';

export const getOpeningBalanceForMonth = (data: AppData, selectedMonth: string): MonthlyBalanceData => {
    const allBalanceKeys = Object.keys(data.monthlyBalances);
    const previousBalanceKeys = allBalanceKeys.filter(key => key < selectedMonth).sort().reverse();

    if (previousBalanceKeys.length > 0) {
        const latestKey = previousBalanceKeys[0];
        return data.monthlyBalances[latestKey];
    }
    
    return data.settings.initialOpeningBalance || { 
        rice: { balvatika: 0, primary: 0, middle: 0 },
        cash: { balvatika: 0, primary: 0, middle: 0 },
    };
};

export const calculateMonthlySummary = (data: AppData, selectedMonth: string) => {
    const entries = data.entries.filter(e => e.date.startsWith(selectedMonth));
    // FIX: Add a fallback to default rates to prevent calculation errors if settings are corrupted or missing.
    const rates = data.settings.rates || DEFAULT_SETTINGS.rates;
    const categories: Category[] = ['balvatika', 'primary', 'middle'];
    
    const openingBalance = getOpeningBalanceForMonth(data, selectedMonth);

    const received = data.receipts
        .filter(r => r.date.startsWith(selectedMonth))
        .reduce((acc, r) => {
            categories.forEach(cat => {
                acc.rice[cat] += r.rice[cat];
                acc.cash[cat] += r.cash[cat];
            });
            return acc;
        }, {
            rice: { balvatika: 0, primary: 0, middle: 0 },
            cash: { balvatika: 0, primary: 0, middle: 0 },
        });

    const categoryTotals = {
        present: { balvatika: 0, primary: 0, middle: 0 },
        rice: { balvatika: 0, primary: 0, middle: 0 },
        expenditure: { balvatika: 0, primary: 0, middle: 0 },
    };
    
    const expenditureBreakdown = {
        dalVeg: 0,
        oilCond: 0,
        salt: 0,
        fuel: 0,
    };

    entries.forEach(entry => {
        categories.forEach(cat => {
            const present = entry.present[cat] || 0;
            categoryTotals.present[cat] += present;
            
            // FIX: Ensure each rate category exists before using it to prevent NaN errors.
            const dailyExp = {
                dalVeg: present * (rates.dalVeg?.[cat] || 0),
                oilCond: present * (rates.oilCond?.[cat] || 0),
                salt: present * (rates.salt?.[cat] || 0),
                fuel: present * (rates.fuel?.[cat] || 0),
            };
            
            expenditureBreakdown.dalVeg += dailyExp.dalVeg;
            expenditureBreakdown.oilCond += dailyExp.oilCond;
            expenditureBreakdown.salt += dailyExp.salt;
            expenditureBreakdown.fuel += dailyExp.fuel;
            
            categoryTotals.expenditure[cat] += dailyExp.dalVeg + dailyExp.oilCond + dailyExp.salt + dailyExp.fuel;
            categoryTotals.rice[cat] += (present * (rates.rice?.[cat] || 0)) / 1000;
        });
    });

    categories.forEach(cat => {
        categoryTotals.expenditure[cat] = parseFloat(categoryTotals.expenditure[cat].toFixed(2));
        categoryTotals.rice[cat] = parseFloat(categoryTotals.rice[cat].toFixed(3));
    });

    const totalExpenditure = categoryTotals.expenditure.balvatika + categoryTotals.expenditure.primary + categoryTotals.expenditure.middle;
    const totalRice = categoryTotals.rice.balvatika + categoryTotals.rice.primary + categoryTotals.rice.middle;
    const totalPresent = categoryTotals.present.balvatika + categoryTotals.present.primary + categoryTotals.present.middle;
    
    const totals = {
        present: totalPresent,
        rice: parseFloat(totalRice.toFixed(3)),
        expenditure: parseFloat(totalExpenditure.toFixed(2)),
    };

    const riceAbstracts: Record<Category, AbstractData> = {} as any;
    const cashAbstracts: Record<Category, AbstractData> = {} as any;
    
    categories.forEach(cat => {
        const riceOpening = openingBalance.rice?.[cat] || 0;
        const riceReceived = received.rice?.[cat] || 0;
        const riceConsumed = categoryTotals.rice?.[cat] || 0;

        riceAbstracts[cat] = {
            opening: riceOpening,
            received: riceReceived,
            total: riceOpening + riceReceived,
            consumed: riceConsumed,
            balance: riceOpening + riceReceived - riceConsumed,
        };
        
        const cashOpening = openingBalance.cash?.[cat] || 0;
        const cashReceived = received.cash?.[cat] || 0;
        const cashExpenditure = categoryTotals.expenditure?.[cat] || 0;

        cashAbstracts[cat] = {
            opening: cashOpening,
            received: cashReceived,
            total: cashOpening + cashReceived,
            expenditure: cashExpenditure,
            balance: cashOpening + cashReceived - cashExpenditure,
        };
    });

    const closingBalance: MonthlyBalanceData = {
        rice: { balvatika: riceAbstracts.balvatika.balance, primary: riceAbstracts.primary.balance, middle: riceAbstracts.middle.balance },
        cash: { balvatika: cashAbstracts.balvatika.balance, primary: cashAbstracts.primary.balance, middle: cashAbstracts.middle.balance },
    };
    
    return { monthEntries: entries, riceAbstracts, cashAbstracts, totals, categoryTotals, closingBalance, expenditureBreakdown };
};

export const calculateOverallBalance = (data: AppData) => {
    const { settings, receipts, entries } = data;
    const initial = settings.initialOpeningBalance;

    const totalReceived = receipts.reduce((acc, r) => {
        acc.rice += r.rice.balvatika + r.rice.primary + r.rice.middle;
        acc.cash += r.cash.balvatika + r.cash.primary + r.cash.middle;
        return acc;
    }, { rice: 0, cash: 0 });

    const totalConsumed = entries.reduce((acc, e) => {
        acc.rice += e.consumption.rice;
        acc.cash += e.consumption.total;
        return acc;
    }, { rice: 0, cash: 0 });
    
    const totalInitialRice = (initial?.rice?.balvatika || 0) + (initial?.rice?.primary || 0) + (initial?.rice?.middle || 0);
    const totalInitialCash = (initial?.cash?.balvatika || 0) + (initial?.cash?.primary || 0) + (initial?.cash?.middle || 0);

    const currentRiceBalance = totalInitialRice + totalReceived.rice - totalConsumed.rice;
    const currentCashBalance = totalInitialCash + totalReceived.cash - totalConsumed.cash;

    return { currentRiceBalance, currentCashBalance };
};
