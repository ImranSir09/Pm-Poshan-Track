import { AppData, MonthlyBalanceData, Category, AbstractData } from '../types';

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
    const { rates } = data.settings;
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
            const present = entry.present[cat];
            categoryTotals.present[cat] += present;
            
            const dailyExp = {
                dalVeg: present * rates.dalVeg[cat],
                oilCond: present * rates.oilCond[cat],
                salt: present * rates.salt[cat],
                fuel: present * rates.fuel[cat],
            };
            
            expenditureBreakdown.dalVeg += dailyExp.dalVeg;
            expenditureBreakdown.oilCond += dailyExp.oilCond;
            expenditureBreakdown.salt += dailyExp.salt;
            expenditureBreakdown.fuel += dailyExp.fuel;
            
            categoryTotals.expenditure[cat] += dailyExp.dalVeg + dailyExp.oilCond + dailyExp.salt + dailyExp.fuel;
            categoryTotals.rice[cat] += (present * rates.rice[cat]) / 1000;
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
        riceAbstracts[cat] = {
            opening: openingBalance.rice[cat],
            received: received.rice[cat],
            total: openingBalance.rice[cat] + received.rice[cat],
            consumed: categoryTotals.rice[cat],
            balance: openingBalance.rice[cat] + received.rice[cat] - categoryTotals.rice[cat],
        };
        cashAbstracts[cat] = {
            opening: openingBalance.cash[cat],
            received: received.cash[cat],
            total: openingBalance.cash[cat] + received.cash[cat],
            expenditure: categoryTotals.expenditure[cat],
            balance: openingBalance.cash[cat] + received.cash[cat] - categoryTotals.expenditure[cat],
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