
import React, { useState, useMemo, useEffect } from 'react';
import Card from '../ui/Card';
import { useData } from '../../hooks/useData';
import { Category, AbstractData } from '../../types';
import { calculateMonthlySummary } from '../../services/summaryCalculator';

const AbstractTable: React.FC<{ title: string; data: Record<Category, AbstractData>; unit: string; decimals: number; }> = ({ title, data, unit, decimals }) => {
    const total = {
        opening: data.balvatika.opening + data.primary.opening + data.middle.opening,
        received: data.balvatika.received + data.primary.received + data.middle.received,
        total: data.balvatika.total + data.primary.total + data.middle.total,
        consumed: (data.balvatika.consumed || 0) + (data.primary.consumed || 0) + (data.middle.consumed || 0),
        expenditure: (data.balvatika.expenditure || 0) + (data.primary.expenditure || 0) + (data.middle.expenditure || 0),
        balance: data.balvatika.balance + data.primary.balance + data.middle.balance,
    };
    const isCash = unit === '₹';
    const key = isCash ? 'expenditure' : 'consumed';
    const categories: Category[] = ['balvatika', 'primary', 'middle'];

    return (
        <div>
            <h3 className="font-bold text-amber-700 dark:text-amber-400 mb-2">{title} ({unit})</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                    <thead className="bg-amber-100/60 dark:bg-gray-800/50">
                        <tr>
                            <th className="p-1.5 whitespace-nowrap">Category</th>
                            <th className="p-1.5 text-right whitespace-nowrap">Opening</th>
                            <th className="p-1.5 text-right whitespace-nowrap">Received</th>
                            <th className="p-1.5 text-right whitespace-nowrap">Total</th>
                            <th className="p-1.5 text-right whitespace-nowrap">{isCash ? 'Expend.' : 'Consumed'}</th>
                            <th className="p-1.5 text-right whitespace-nowrap">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map(cat => (
                            <tr key={cat} className="border-b border-amber-200/50 dark:border-gray-700">
                                <td className="p-1.5 capitalize whitespace-nowrap">{cat}</td>
                                <td className="p-1.5 text-right whitespace-nowrap">{data[cat].opening.toFixed(decimals)}</td>
                                <td className="p-1.5 text-right whitespace-nowrap">{data[cat].received.toFixed(decimals)}</td>
                                <td className="p-1.5 text-right whitespace-nowrap">{data[cat].total.toFixed(decimals)}</td>
                                <td className="p-1.5 text-right whitespace-nowrap">{data[cat][key]?.toFixed(decimals)}</td>
                                <td className="p-1.5 text-right whitespace-nowrap">{data[cat].balance.toFixed(decimals)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="font-bold bg-amber-200/50 dark:bg-gray-800">
                        <tr>
                            <td className="p-1.5 whitespace-nowrap">Total</td>
                            <td className="p-1.5 text-right whitespace-nowrap">{total.opening.toFixed(decimals)}</td>
                            <td className="p-1.5 text-right whitespace-nowrap">{total.received.toFixed(decimals)}</td>
                            <td className="p-1.5 text-right whitespace-nowrap">{total.total.toFixed(decimals)}</td>
                            <td className="p-1.5 text-right whitespace-nowrap">{total[key].toFixed(decimals)}</td>
                            <td className="p-1.5 text-right whitespace-nowrap">{total.balance.toFixed(decimals)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

const CategoryAbstractDisplay: React.FC<{ title: string; data: AbstractData; unit: string; decimals: number; }> = ({ title, data, unit, decimals }) => {
    const isCash = unit === '₹';
    const key = isCash ? 'expenditure' : 'consumed';

    return (
        <div className="flex-1">
            <h3 className="font-bold text-amber-700 dark:text-amber-400 mb-2">{title} ({unit})</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-amber-100/40 dark:bg-gray-800/50 p-2 rounded-md"><p className="text-xs text-stone-500 dark:text-gray-400">Opening</p><p className="font-semibold">{data.opening.toFixed(decimals)}</p></div>
                <div className="bg-amber-100/40 dark:bg-gray-800/50 p-2 rounded-md"><p className="text-xs text-stone-500 dark:text-gray-400">Received</p><p className="font-semibold">{data.received.toFixed(decimals)}</p></div>
                <div className="bg-amber-100/40 dark:bg-gray-800/50 p-2 rounded-md"><p className="text-xs text-stone-500 dark:text-gray-400">Total</p><p className="font-semibold">{data.total.toFixed(decimals)}</p></div>
                <div className="bg-amber-100/40 dark:bg-gray-800/50 p-2 rounded-md"><p className="text-xs text-stone-500 dark:text-gray-400">{isCash ? 'Expenditure' : 'Consumed'}</p><p className="font-semibold">{data[key]?.toFixed(decimals)}</p></div>
                <div className="bg-amber-200/50 dark:bg-gray-800 col-span-2 p-2 rounded-md"><p className="text-xs text-stone-500 dark:text-gray-400">Closing Balance</p><p className="font-bold text-lg text-amber-700 dark:text-amber-400">{data.balance.toFixed(decimals)}</p></div>
            </div>
        </div>
    );
};

const getLocalYYYYMMDD = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const MonthlySummary: React.FC = () => {
    const { data, saveMonthlyBalance } = useData();
    const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [view, setView] = useState<'overall' | Category>('overall');

    const summaryData = useMemo(
        () => calculateMonthlySummary(data, selectedMonth),
        [data, selectedMonth]
    );
    
    const { monthEntries, riceAbstracts, cashAbstracts, totals, categoryTotals, closingBalance } = summaryData;

    useEffect(() => {
        if (closingBalance && monthEntries.length > 0) {
            saveMonthlyBalance(selectedMonth, closingBalance);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMonth, monthEntries.length, saveMonthlyBalance, JSON.stringify(closingBalance)]);

    const dailyDataForCategory = useMemo(() => {
        if (view === 'overall') return null;

        const { settings } = data;
        const { rates } = settings;
        const category = view;

        const monthDate = new Date(`${selectedMonth}-02T00:00:00`);
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const dataRows = [];
        const dailyTotals = { present: 0, rice: 0, dalVeg: 0, oilCond: 0, salt: 0, fuel: 0, cost: 0 };

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dateString = getLocalYYYYMMDD(date);
            const entry = monthEntries.find(e => e.id === dateString);

            const present = entry?.present[category] || 0;
            const dailyRice = (present * rates.rice[category]) / 1000;
            const dailyDalVeg = present * rates.dalVeg[category];
            const dailyOilCond = present * rates.oilCond[category];
            const dailySalt = present * rates.salt[category];
            const dailyFuel = present * rates.fuel[category];
            const totalCost = dailyDalVeg + dailyOilCond + dailySalt + dailyFuel;
            
            dailyTotals.present += present;
            dailyTotals.rice += dailyRice;
            dailyTotals.dalVeg += dailyDalVeg;
            dailyTotals.oilCond += dailyOilCond;
            dailyTotals.salt += dailySalt;
            dailyTotals.fuel += dailyFuel;
            dailyTotals.cost += totalCost;

            dataRows.push({
                day: i,
                isSunday: date.getDay() === 0,
                present,
                rice: dailyRice.toFixed(3),
                dalVeg: dailyDalVeg.toFixed(2),
                oilCond: dailyOilCond.toFixed(2),
                salt: dailySalt.toFixed(2),
                fuel: dailyFuel.toFixed(2),
                cost: totalCost.toFixed(2),
                reason: entry?.reasonForNoMeal || ''
            });
        }
        return { dataRows, totals: dailyTotals };
    }, [view, data, selectedMonth, monthEntries]);
    
    const categories: Category[] = ['balvatika', 'primary', 'middle'];

    return (
        <div className="space-y-4">
            <Card>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                        <label htmlFor="month-select" className="block text-xs font-medium text-stone-600 dark:text-gray-300 mb-1">Select Month</label>
                        <input
                            id="month-select"
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full bg-amber-100/60 dark:bg-gray-700/50 border border-amber-300/50 dark:border-gray-600 text-stone-800 dark:text-white text-sm rounded-lg p-2.5 focus:ring-amber-500 focus:border-amber-500"
                        />
                    </div>
                     <div className="flex-1">
                        <label htmlFor="view-select" className="block text-xs font-medium text-stone-600 dark:text-gray-300 mb-1">Select View</label>
                        <select
                            id="view-select"
                            value={view}
                            onChange={e => setView(e.target.value as 'overall' | Category)}
                            className="w-full bg-amber-100/60 dark:bg-gray-700/50 border border-amber-300/50 dark:border-gray-600 text-stone-800 dark:text-white text-sm rounded-lg p-2.5 focus:ring-amber-500 focus:border-amber-500"
                        >
                            <option value="overall">Overall Summary</option>
                            <option value="balvatika">Balvatika Register</option>
                            <option value="primary">Primary Register</option>
                            <option value="middle">Middle Register</option>
                        </select>
                    </div>
                </div>
            </Card>

            {monthEntries.length === 0 ? (
                <Card>
                    <p className="text-center text-stone-500 dark:text-gray-400">No data found for the selected month.</p>
                </Card>
            ) : view === 'overall' ? (
                <>
                    <Card title="Category-wise Breakdown">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-amber-100/60 dark:bg-gray-800/50">
                                    <tr>
                                        <th className="p-1.5">Category</th>
                                        <th className="p-1.5 text-right">Total Present</th>
                                        <th className="p-1.5 text-right">Rice (kg)</th>
                                        <th className="p-1.5 text-right">Expenditure (₹)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.map(cat => (
                                        <tr key={cat} className="border-b border-amber-200/50 dark:border-gray-700">
                                            <td className="p-1.5 capitalize">{cat}</td>
                                            <td className="p-1.5 text-right">{categoryTotals.present[cat]}</td>
                                            <td className="p-1.5 text-right">{categoryTotals.rice[cat].toFixed(3)}</td>
                                            <td className="p-1.5 text-right">{categoryTotals.expenditure[cat].toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="font-bold bg-amber-200/50 dark:bg-gray-800">
                                    <tr>
                                        <td className="p-1.5">Total</td>
                                        <td className="p-1.5 text-right">{totals.present}</td>
                                        <td className="p-1.5 text-right">{totals.rice.toFixed(3)}</td>
                                        <td className="p-1.5 text-right">{totals.expenditure.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </Card>

                    <Card>
                        <div className="grid md:grid-cols-2 gap-6">
                           <AbstractTable title="Rice Abstract" data={riceAbstracts} unit="kg" decimals={3} />
                           <AbstractTable title="Cash Abstract" data={cashAbstracts} unit="₹" decimals={2} />
                        </div>
                    </Card>
                </>
            ) : (
                <>
                    <Card title={`${view.charAt(0).toUpperCase() + view.slice(1)} - Monthly Abstracts`}>
                        <div className="flex flex-col md:flex-row gap-6">
                            <CategoryAbstractDisplay title="Rice Abstract" data={riceAbstracts[view]} unit="kg" decimals={3} />
                            <CategoryAbstractDisplay title="Cash Abstract" data={cashAbstracts[view]} unit="₹" decimals={2} />
                        </div>
                    </Card>

                    <Card title={`${view.charAt(0).toUpperCase() + view.slice(1)} - Daily Consumption Register`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-amber-100/60 dark:bg-gray-800/50">
                                    <tr>
                                        {['Date', 'Present', 'Rice (kg)', 'Dal/Veg (₹)', 'Oil/Cond (₹)', 'Salt (₹)', 'Fuel (₹)', 'Total (₹)', 'Reason for No Meal'].map(h => 
                                            <th key={h} className="p-1.5 text-right whitespace-nowrap first:text-left">{h}</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {dailyDataForCategory?.dataRows.map(row => (
                                        <tr key={row.day} className={`border-b border-amber-200/50 dark:border-gray-700 ${row.isSunday ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                                            <td className="p-1.5 text-left">{row.day}</td>
                                            <td className="p-1.5 text-right">{row.present}</td>
                                            <td className="p-1.5 text-right">{row.rice}</td>
                                            <td className="p-1.5 text-right">{row.dalVeg}</td>
                                            <td className="p-1.5 text-right">{row.oilCond}</td>
                                            <td className="p-1.5 text-right">{row.salt}</td>
                                            <td className="p-1.5 text-right">{row.fuel}</td>
                                            <td className="p-1.5 text-right font-semibold">{row.cost}</td>
                                            <td className="p-1.5 text-right">{row.reason}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="font-bold bg-amber-200/50 dark:bg-gray-800">
                                    <tr>
                                        <td className="p-1.5 text-left">Total</td>
                                        <td className="p-1.5 text-right">{dailyDataForCategory?.totals.present}</td>
                                        <td className="p-1.5 text-right">{dailyDataForCategory?.totals.rice.toFixed(3)}</td>
                                        <td className="p-1.5 text-right">{dailyDataForCategory?.totals.dalVeg.toFixed(2)}</td>
                                        <td className="p-1.5 text-right">{dailyDataForCategory?.totals.oilCond.toFixed(2)}</td>
                                        <td className="p-1.5 text-right">{dailyDataForCategory?.totals.salt.toFixed(2)}</td>
                                        <td className="p-1.5 text-right">{dailyDataForCategory?.totals.fuel.toFixed(2)}</td>
                                        <td className="p-1.5 text-right">{dailyDataForCategory?.totals.cost.toFixed(2)}</td>
                                        <td className="p-1.5 text-right"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
};

export default MonthlySummary;
