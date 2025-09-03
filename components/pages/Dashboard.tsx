
import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Card from '../ui/Card';
import { useData } from '../../hooks/useData';
import { DailyEntry } from '../../types';
import { useToast } from '../../hooks/useToast';
import IllustrationCard from '../ui/IllustrationCard';
import Skeleton from '../ui/Skeleton';
import DailyEntryPage from './DailyEntry';
import { calculateMonthlySummary } from '../../services/summaryCalculator';

const Dashboard: React.FC = () => {
    const { data } = useData();
    const { showToast } = useToast();
    const { settings } = data;
    const { mdmIncharge } = settings;

    const [isLoading, setIsLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState<{
        totalExpenditure: number;
        totalRice: number;
        mealDays: number;
        monthlyData: { name: string; date: Date; balvatika: number; primary: number; middle: number; total: number }[];
    }>({ totalExpenditure: 0, totalRice: 0, mealDays: 0, monthlyData: [] });

    // Daily Entry Reminder
    useEffect(() => {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const entryExists = data.entries.some(e => e.id === todayStr);

        if (!entryExists && now.getHours() >= 15) { // 3 PM or later
            showToast("Reminder: Don't forget to add today's meal entry.", 'info');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const displayedMonthKey = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }, []);

    useEffect(() => {
        setIsLoading(true);
        
        const summary = calculateMonthlySummary(data, displayedMonthKey);
        const { totals, monthEntries } = summary;

        // Create a Map for efficient lookups (O(1) on average) instead of using .find() in a loop
        const entriesMap = new Map<string, DailyEntry>();
        for (const entry of monthEntries) {
            entriesMap.set(entry.id, entry);
        }

        const currentDate = new Date(displayedMonthKey + '-02T00:00:00');
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const chartData: { name: string, date: Date, balvatika: number, primary: number, middle: number, total: number }[] = [];

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const entry = entriesMap.get(dateString);
            
            chartData.push({
                name: `${i}`,
                date: date,
                balvatika: entry?.present.balvatika || 0,
                primary: entry?.present.primary || 0,
                middle: entry?.present.middle || 0,
                total: entry?.totalPresent || 0,
            });
        }

        setDashboardData({
            totalExpenditure: totals.expenditure,
            totalRice: totals.rice,
            mealDays: monthEntries.filter(e => e.totalPresent > 0).length,
            monthlyData: chartData
        });
        setIsLoading(false);
    }, [data, displayedMonthKey]);
    
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white/80 dark:bg-gray-800/80 p-2 border border-amber-200/50 dark:border-gray-600 rounded text-xs shadow-lg backdrop-blur-sm">
                    <p className="label text-stone-700 dark:text-gray-300">{`Date: ${label}`}</p>
                    <p style={{ color: '#a8a29e' }}>{`Balvatika: ${payload[0].value}`}</p>
                    <p style={{ color: '#f59e0b' }}>{`Primary: ${payload[1].value}`}</p>
                    <p style={{ color: '#ffc658' }}>{`Middle: ${payload[2].value}`}</p>
                    <p className="font-bold text-stone-800 dark:text-white">{`Total: ${payload[0].payload.total}`}</p>
                </div>
            );
        }
        return null;
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-72" />
                <Skeleton className="h-24" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <IllustrationCard inchargeName={mdmIncharge?.name} inchargeContact={mdmIncharge?.contact} />

            <DailyEntryPage />

            <Card title="This Month's Totals">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-xs text-stone-500 dark:text-gray-400">Meal Days</p>
                        <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{dashboardData.mealDays}</p>
                    </div>
                    <div>
                        <p className="text-xs text-stone-500 dark:text-gray-400">Total Expenditure</p>
                        <p className="text-lg font-bold text-amber-700 dark:text-amber-400">₹{dashboardData.totalExpenditure.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-stone-500 dark:text-gray-400">Total Rice</p>
                        <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{dashboardData.totalRice.toFixed(3)} kg</p>
                    </div>
                </div>
            </Card>
            
            <Card title="Daily Attendance">
                <div style={{ width: '100%', height: 100 }}>
                    <ResponsiveContainer>
                        <BarChart data={dashboardData.monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <XAxis dataKey="name" tick={{ fill: '#78716c', fontSize: 10 }} axisLine={{ stroke: '#d6d3d1' }} tickLine={{ stroke: '#d6d3d1' }} className="dark:tick={{ fill: '#9ca3af' }} dark:axisLine={{ stroke: '#4b5563' }} dark:tickLine={{ stroke: '#4b5563' }}" />
                            <YAxis tick={{ fill: '#78716c', fontSize: 10 }} axisLine={{ stroke: '#d6d3d1' }} tickLine={{ stroke: '#d6d3d1' }} className="dark:tick={{ fill: '#9ca3af' }} dark:axisLine={{ stroke: '#4b5563' }} dark:tickLine={{ stroke: '#4b5563' }}" />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(180,180,120,0.1)' }} />
                            <Bar dataKey="balvatika" stackId="a" fill="#a8a29e" radius={[5, 5, 0, 0]} barSize={10} >
                                 {dashboardData.monthlyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.date.getDay() === 0 ? '#ef4444' : '#a8a29e'} />
                                ))}
                            </Bar>
                            <Bar dataKey="primary" stackId="a" fill="#f59e0b" barSize={10}>
                                {dashboardData.monthlyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.date.getDay() === 0 ? '#ef4444' : '#f59e0b'} />
                                ))}
                            </Bar>
                             <Bar dataKey="middle" stackId="a" fill="#ffc658" radius={[5, 5, 0, 0]} barSize={10}>
                                {dashboardData.monthlyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.date.getDay() === 0 ? '#ef4444' : '#ffc658'} />
                                ))}
                             </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                     <div className="flex justify-center items-center space-x-4 mt-2 text-xs text-stone-600 dark:text-gray-300">
                        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-[#a8a29e] mr-1"></div>Balvatika</div>
                        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-[#f59e0b] mr-1"></div>Primary</div>
                        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-[#ffc658] mr-1"></div>Middle</div>
                        <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-[#ef4444] mr-1"></div>Sunday</div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Dashboard;
