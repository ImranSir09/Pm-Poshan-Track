import React, { useState, useMemo, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import Card from '../ui/Card';
import { useData } from '../../hooks/useData';
import { Category, AbstractData } from '../../types';
import { calculateMonthlySummary } from '../../services/summaryCalculator';
import { useTheme } from '../../hooks/useTheme';

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

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/80 dark:bg-gray-800/80 p-2 border border-amber-200/50 dark:border-gray-600 rounded text-xs shadow-lg backdrop-blur-sm">
                <p className="label text-stone-700 dark:text-gray-300 font-bold">{`Day: ${label}`}</p>
                <p style={{ color: '#f59e0b' }}>{`Expenditure: ₹${payload[0]?.value?.toFixed(2)}`}</p>
                <p style={{ color: '#0ea5e9' }}>{`Rice: ${payload[1]?.value?.toFixed(3)} kg`}</p>
            </div>
        );
    }
    return null;
};

const MonthlySummary: React.FC = () => {
    const { data, saveMonthlyBalance } = useData();
    const { theme } = useTheme();
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    const { monthEntries, riceAbstracts, cashAbstracts, totals, categoryTotals, closingBalance, trendData, expenditureBreakdown } = useMemo(
        () => {
            const summary = calculateMonthlySummary(data, selectedMonth);
            
            const trendData = summary.monthEntries.map(entry => ({
                day: new Date(entry.date + 'T00:00:00').getDate(),
                expenditure: entry.consumption.total,
                rice: entry.consumption.rice,
            }));

            const totalDalVeg = summary.monthEntries.reduce((sum, e) => sum + e.consumption.dalVeg, 0);
            const totalOilCond = summary.monthEntries.reduce((sum, e) => sum + e.consumption.oilCond, 0);
            const totalSalt = summary.monthEntries.reduce((sum, e) => sum + e.consumption.salt, 0);
            const totalFuel = summary.monthEntries.reduce((sum, e) => sum + e.consumption.fuel, 0);

            const expenditureBreakdown = [
                { name: 'Dal & Veg', value: totalDalVeg },
                { name: 'Oil & Cond.', value: totalOilCond },
                { name: 'Salt', value: totalSalt },
                { name: 'Fuel', value: totalFuel },
            ].filter(item => item.value > 0);

            return { ...summary, trendData, expenditureBreakdown };
        },
        [data, selectedMonth]
    );
    
    useEffect(() => {
        if (closingBalance && monthEntries.length > 0) {
            saveMonthlyBalance(selectedMonth, closingBalance);
        }
    }, [selectedMonth, closingBalance, saveMonthlyBalance, monthEntries.length]);
    
    const categories: Category[] = ['balvatika', 'primary', 'middle'];
    const pieColors = ['#f59e0b', '#fcd34d', '#fbbf24', '#d97706'];
    const tickColor = theme === 'dark' ? '#9ca3af' : '#78716c';

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

                    <Card title="Consumption Trends">
                        <div style={{ width: '100%', height: 200 }}>
                             <ResponsiveContainer>
                                <LineChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#4b5563' : '#e7e5e4'} />
                                    <XAxis dataKey="day" tick={{ fill: tickColor, fontSize: 10 }} />
                                    <YAxis yAxisId="left" label={{ value: 'Expenditure (₹)', angle: -90, position: 'insideLeft', fill: tickColor, fontSize: 10, dy: 50 }} tick={{ fill: tickColor, fontSize: 10 }} />
                                    <YAxis yAxisId="right" orientation="right" label={{ value: 'Rice (kg)', angle: 90, position: 'insideRight', fill: tickColor, fontSize: 10, dy: -25 }} tick={{ fill: tickColor, fontSize: 10 }} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend wrapperStyle={{fontSize: "12px"}} />
                                    <Line yAxisId="left" type="monotone" dataKey="expenditure" name="Expenditure" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                                    <Line yAxisId="right" type="monotone" dataKey="rice" name="Rice (kg)" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                     <Card title="Expenditure Breakdown">
                        <div style={{ width: '100%', height: 200 }} className="flex flex-col sm:flex-row items-center">
                            <div className="w-full sm:w-1/2 h-full">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={expenditureBreakdown}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                            nameKey="name"
                                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                        >
                                            {expenditureBreakdown.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="w-full sm:w-1/2 mt-2 sm:mt-0 sm:pl-4">
                               <ul className="text-xs space-y-1">
                                    {expenditureBreakdown.map((entry, index) => (
                                        <li key={`legend-${index}`} className="flex items-center">
                                            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: pieColors[index % pieColors.length] }}></span>
                                            <span>{entry.name}: <strong>₹{entry.value.toFixed(2)}</strong></span>
                                        </li>
                                    ))}
                                </ul>
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
