
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
                            <th className="p-1.5">Category</th>
                            <th className="p-1.5 text-right">Opening</th>
                            <th className="p-1.5 text-right">Received</th>
                            <th className="p-1.5 text-right">Total</th>
                            <th className="p-1.5 text-right">{isCash ? 'Expend.' : 'Consumed'}</th>
                            <th className="p-1.5 text-right">Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map(cat => (
                            <tr key={cat} className="border-b border-amber-200/50 dark:border-gray-700">
                                <td className="p-1.5 capitalize">{cat}</td>
                                <td className="p-1.5 text-right">{data[cat].opening.toFixed(decimals)}</td>
                                <td className="p-1.5 text-right">{data[cat].received.toFixed(decimals)}</td>
                                <td className="p-1.5 text-right">{data[cat].total.toFixed(decimals)}</td>
                                <td className="p-1.5 text-right">{data[cat][key]?.toFixed(decimals)}</td>
                                <td className="p-1.5 text-right">{data[cat].balance.toFixed(decimals)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="font-bold bg-amber-200/50 dark:bg-gray-800">
                        <tr>
                            <td className="p-1.5">Total</td>
                            <td className="p-1.5 text-right">{total.opening.toFixed(decimals)}</td>
                            <td className="p-1.5 text-right">{total.received.toFixed(decimals)}</td>
                            <td className="p-1.5 text-right">{total.total.toFixed(decimals)}</td>
                            <td className="p-1.5 text-right">{total[key].toFixed(decimals)}</td>
                            <td className="p-1.5 text-right">{total.balance.toFixed(decimals)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

const MonthlySummary: React.FC = () => {
    const { data, saveMonthlyBalance } = useData();
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    const { monthEntries, riceAbstracts, cashAbstracts, totals, categoryTotals, closingBalance } = useMemo(
        () => calculateMonthlySummary(data, selectedMonth),
        [data, selectedMonth]
    );
    
    useEffect(() => {
        if (closingBalance && monthEntries.length > 0) {
            saveMonthlyBalance(selectedMonth, closingBalance);
        }
    }, [selectedMonth, closingBalance, saveMonthlyBalance, monthEntries.length]);
    
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
                </div>
            </Card>

            {monthEntries.length === 0 ? (
                <Card>
                    <p className="text-center text-stone-500 dark:text-gray-400">No data found for the selected month.</p>
                </Card>
            ) : (
                <>
                    <Card title="Monthly Totals">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <p className="text-xs text-stone-500 dark:text-gray-400">Meal Days</p>
                                <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{monthEntries.filter(e => e.totalPresent > 0).length}</p>
                            </div>
                            <div>
                                <p className="text-xs text-stone-500 dark:text-gray-400">Total Expenditure</p>
                                <p className="text-lg font-bold text-amber-700 dark:text-amber-400">₹{totals.expenditure.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-stone-500 dark:text-gray-400">Total Rice</p>
                                <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{totals.rice.toFixed(3)} kg</p>
                            </div>
                        </div>
                    </Card>

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
            )}
        </div>
    );
};

export default MonthlySummary;
