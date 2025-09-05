
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
    
    const thClasses = "p-2 border border-amber-300/50 dark:border-gray-600 whitespace-nowrap";
    const tdClasses = "p-2 border border-amber-300/50 dark:border-gray-600 whitespace-nowrap";

    return (
        <div>
            <h3 className="font-bold text-amber-700 dark:text-amber-400 mb-2">{title} ({unit})</h3>
            <div className="overflow-x-auto rounded-lg border border-amber-300/50 dark:border-gray-600">
                <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-amber-100/60 dark:bg-gray-800/50">
                        <tr>
                            <th className={thClasses}>Category</th>
                            <th className={`${thClasses} text-right`}>Opening</th>
                            <th className={`${thClasses} text-right`}>Received</th>
                            <th className={`${thClasses} text-right`}>Total</th>
                            <th className={`${thClasses} text-right`}>{isCash ? 'Expend.' : 'Consumed'}</th>
                            <th className={`${thClasses} text-right`}>Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map(cat => (
                            <tr key={cat}>
                                <td className={`${tdClasses} capitalize`}>{cat}</td>
                                <td className={`${tdClasses} text-right`}>{data[cat].opening.toFixed(decimals)}</td>
                                <td className={`${tdClasses} text-right`}>{data[cat].received.toFixed(decimals)}</td>
                                <td className={`${tdClasses} text-right`}>{data[cat].total.toFixed(decimals)}</td>
                                <td className={`${tdClasses} text-right`}>{data[cat][key]?.toFixed(decimals)}</td>
                                <td className={`${tdClasses} text-right font-semibold`}>{data[cat].balance.toFixed(decimals)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="font-bold bg-amber-200/50 dark:bg-gray-800">
                        <tr>
                            <td className={tdClasses}>Total</td>
                            <td className={`${tdClasses} text-right`}>{total.opening.toFixed(decimals)}</td>
                            <td className={`${tdClasses} text-right`}>{total.received.toFixed(decimals)}</td>
                            <td className={`${tdClasses} text-right`}>{total.total.toFixed(decimals)}</td>
                            <td className={`${tdClasses} text-right`}>{total[key].toFixed(decimals)}</td>
                            <td className={`${tdClasses} text-right`}>{total.balance.toFixed(decimals)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

const CategoryAbstractTable: React.FC<{ title: string; data: AbstractData; unit: string; decimals: number; }> = ({ title, data, unit, decimals }) => {
    const isCash = unit === '₹';
    const key = isCash ? 'expenditure' : 'consumed';
    const thClasses = "p-2 border border-amber-300/50 dark:border-gray-600 whitespace-nowrap text-left";
    const tdClasses = "p-2 border border-amber-300/50 dark:border-gray-600 whitespace-nowrap text-right";

    return (
        <div className="flex-1">
            <h3 className="font-bold text-amber-700 dark:text-amber-400 mb-2">{title} ({unit})</h3>
            <div className="overflow-x-auto rounded-lg border border-amber-300/50 dark:border-gray-600">
                <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-amber-100/60 dark:bg-gray-800/50">
                        <tr>
                            <th className={thClasses}>Opening</th>
                            <th className={thClasses}>Received</th>
                            <th className={thClasses}>Total</th>
                            <th className={thClasses}>{isCash ? 'Expend.' : 'Consumed'}</th>
                            <th className={thClasses}>Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                         <tr className="bg-white dark:bg-gray-800/30">
                            <td className={tdClasses}>{data.opening.toFixed(decimals)}</td>
                            <td className={tdClasses}>{data.received.toFixed(decimals)}</td>
                            <td className={tdClasses}>{data.total.toFixed(decimals)}</td>
                            <td className={tdClasses}>{data[key]?.toFixed(decimals)}</td>
                            <td className={`${tdClasses} font-bold text-amber-700 dark:text-amber-400`}>{data.balance.toFixed(decimals)}</td>
                        </tr>
                    </tbody>
                </table>
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
    }, [selectedMonth, closingBalance]); // Intentionally omitting saveMonthlyBalance

    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedMonth(e.target.value);
    };

    const mealDays = monthEntries.filter(e => e.totalPresent > 0).length;

    return (
        <div className="space-y-4">
            <Card title="Monthly Summary">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <label htmlFor="month-select" className="block text-xs font-medium text-stone-600 dark:text-gray-300 mb-1">Select Month</label>
                        <input
                            id="month-select"
                            type="month"
                            value={selectedMonth}
                            onChange={handleMonthChange}
                            className="w-full bg-amber-100/60 dark:bg-gray-700/50 border border-amber-300/50 dark:border-gray-600 text-stone-800 dark:text-white text-sm rounded-lg p-2.5 focus:ring-amber-500 focus:border-amber-500"
                        />
                    </div>
                     <div className="flex-1">
                        <label htmlFor="view-select" className="block text-xs font-medium text-stone-600 dark:text-gray-300 mb-1">View</label>
                        <select
                            id="view-select"
                            value={view}
                            onChange={(e) => setView(e.target.value as any)}
                             className="w-full bg-amber-100/60 dark:bg-gray-700/50 border border-amber-300/50 dark:border-gray-600 text-stone-800 dark:text-white text-sm rounded-lg p-2.5 focus:ring-amber-500 focus:border-amber-500"
                        >
                            <option value="overall">Overall</option>
                            <option value="balvatika">Balvatika</option>
                            <option value="primary">Primary</option>
                            <option value="middle">Middle</option>
                        </select>
                    </div>
                </div>
            </Card>

            {monthEntries.length === 0 ? (
                <Card>
                    <p className="text-center text-stone-500 dark:text-gray-400">No entries found for the selected month.</p>
                </Card>
            ) : (
                <>
                    {view === 'overall' ? (
                        <Card title="Overall Summary">
                            <div className="space-y-4">
                                <AbstractTable title="Rice Abstract" data={riceAbstracts} unit="kg" decimals={3} />
                                <AbstractTable title="Cash Abstract" data={cashAbstracts} unit="₹" decimals={2} />
                            </div>
                        </Card>
                    ) : (
                        <Card title={`${view.charAt(0).toUpperCase() + view.slice(1)} Summary`}>
                            <div className="flex flex-col gap-4">
                                <CategoryAbstractTable title="Rice Abstract" data={riceAbstracts[view]} unit="kg" decimals={3} />
                                <CategoryAbstractTable title="Cash Abstract" data={cashAbstracts[view]} unit="₹" decimals={2} />
                            </div>
                        </Card>
                    )}

                    <Card title="Meal & Attendance Totals">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                            <div>
                                <p className="text-xs text-stone-500 dark:text-gray-400">Meal Days</p>
                                <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{mealDays}</p>
                            </div>
                            <div>
                                <p className="text-xs text-stone-500 dark:text-gray-400">Total Students Fed</p>
                                <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{totals.present}</p>
                            </div>
                            <div>
                                <p className="text-xs text-stone-500 dark:text-gray-400">Total Expenditure</p>
                                <p className="text-lg font-bold text-amber-700 dark:text-amber-400">₹{totals.expenditure.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-stone-500 dark:text-gray-400">Total Rice Used</p>
                                <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{totals.rice.toFixed(3)} kg</p>
                            </div>
                        </div>
                    </Card>

                    <Card title="Daily Entries for the Month">
                         <div className="overflow-x-auto max-h-72">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-amber-100/60 dark:bg-gray-800/50 sticky top-0">
                                    <tr>
                                        <th className="p-2">Date</th>
                                        <th className="p-2 text-right">Present</th>
                                        <th className="p-2 text-right">Rice (kg)</th>
                                        <th className="p-2 text-right">Cost (₹)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...monthEntries].reverse().map(entry => {
                                        const date = new Date(entry.date + 'T00:00:00');
                                        const isNoMealDay = entry.totalPresent === 0;
                                        return (
                                            <tr key={entry.id} className={`border-b border-amber-200/50 dark:border-gray-700 ${isNoMealDay ? 'bg-red-100/30 dark:bg-red-900/20' : ''}`}>
                                                <td className="p-2">{date.toLocaleDateString('en-IN')}</td>
                                                {isNoMealDay ? (
                                                    <td colSpan={3} className="p-2 text-center text-red-700 dark:text-red-300 text-xs italic">
                                                        {entry.reasonForNoMeal || 'No Meal Served'}
                                                    </td>
                                                ) : (
                                                    <>
                                                        <td className="p-2 text-right">{entry.totalPresent}</td>
                                                        <td className="p-2 text-right">{entry.consumption.rice.toFixed(3)}</td>
                                                        <td className="p-2 text-right">{entry.consumption.total.toFixed(2)}</td>
                                                    </>
                                                )}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
};

export default MonthlySummary;
