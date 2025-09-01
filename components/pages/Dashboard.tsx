
import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { GoogleGenAI } from '@google/genai';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useData } from '../../hooks/useData';
import { DailyEntry } from '../../types';
import { useToast } from '../../hooks/useToast';
import IllustrationCard from '../ui/IllustrationCard';
import Skeleton from '../ui/Skeleton';
import DailyEntryPage from './DailyEntry';

const Dashboard: React.FC = () => {
    const { data } = useData();
    const { showToast } = useToast();
    const { settings } = data;
    const { mdmIncharge } = settings;

    const [isLoading, setIsLoading] = useState(true);
    const [aiInsight, setAiInsight] = useState('');
    const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);

    // Daily Entry Reminder
    useEffect(() => {
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        const entryExists = data.entries.some(e => e.id === todayStr);

        if (!entryExists && now.getHours() >= 15) { // 3 PM or later
            showToast("Reminder: Don't forget to add today's meal entry.", 'info');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 1200);
        return () => clearTimeout(timer);
    }, []);

    const displayedMonthKey = useMemo(() => new Date().toISOString().slice(0, 7), []);

    const { totalExpenditure, totalRice, monthlyData } = useMemo(() => {
        const currentMonthEntries = data.entries.filter(entry => entry.date.startsWith(displayedMonthKey));
        
        const totalExpenditure = currentMonthEntries.reduce((sum, entry) => sum + entry.consumption.total, 0);
        const totalRice = currentMonthEntries.reduce((sum, entry) => sum + entry.consumption.rice, 0);

        const currentDate = new Date(displayedMonthKey + '-02T00:00:00');
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const chartData: { name: string, date: Date, balvatika: number, primary: number, middle: number, total: number }[] = [];

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dateString = date.toISOString().slice(0, 10);
            const entry: DailyEntry | undefined = currentMonthEntries.find(e => e.id === dateString);
            
            chartData.push({
                name: `${i}`,
                date: date,
                balvatika: entry?.present.balvatika || 0,
                primary: entry?.present.primary || 0,
                middle: entry?.present.middle || 0,
                total: entry?.totalPresent || 0,
            });
        }

        return { totalExpenditure, totalRice, monthlyData: chartData };
    }, [data.entries, displayedMonthKey]);

    const generateInsight = async () => {
        const apiKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY)
            ? process.env.API_KEY
            : undefined;

        if (!apiKey) {
            showToast('AI features are not configured.', 'error');
            setAiInsight('Error: API key is missing. This needs to be configured by the developer.');
            return;
        }
        
        setIsGeneratingInsight(true);
        setAiInsight('');

        try {
            const ai = new GoogleGenAI({ apiKey: apiKey });
            
            const monthName = new Date(displayedMonthKey + '-02T00:00:00').toLocaleString('default', { month: 'long' });
            const mealDays = monthlyData.filter(d => d.total > 0).length;
            const avgAttendance = (monthlyData.reduce((sum, d) => sum + d.total, 0) / (mealDays || 1)).toFixed(0)

            const prompt = `
                Analyze the following PM POSHAN (Mid-Day Meal) data for ${monthName} for a school in India and provide a short, actionable insight for the MDM incharge.
                Keep the insight concise and helpful (2-3 sentences). Focus on one key observation from the data.
                
                Data:
                - Total days meals were served: ${mealDays}
                - Total expenditure: ₹${totalExpenditure.toFixed(2)}
                - Total rice consumed: ${totalRice.toFixed(2)} kg
                - Average daily student attendance on meal days: ${avgAttendance} students.
                - Days with zero meals served (excluding Sundays): ${monthlyData.filter(d => d.total === 0 && d.date.getDay() !== 0 && d.date <= new Date()).length}
                
                Example insights:
                - "Attendance seems consistent this month. Consider checking your stock levels for next month to ensure you have enough rice."
                - "Expenditure is within the expected range. Great job managing the budget!"
                - "There were several days with no meals served. Ensure you have backup cooks available to avoid disruption."
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            
            setAiInsight(response.text);

        } catch (error)
        {
            console.error("AI insight generation failed:", error);
            showToast('Failed to generate AI insight.', 'error');
            setAiInsight('Could not generate an insight at this time. Please try again later.');
        } finally {
            setIsGeneratingInsight(false);
        }
    };
    
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

            <Card title="This Month's Overview">
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                        <p className="text-xs text-stone-500 dark:text-gray-400">Total Expenditure</p>
                        <p className="text-lg font-bold text-amber-700 dark:text-amber-400">₹{totalExpenditure.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-stone-500 dark:text-gray-400">Total Rice Consumed</p>
                        <p className="text-lg font-bold text-amber-700 dark:text-amber-400">{totalRice.toFixed(2)} kg</p>
                    </div>
                </div>
            </Card>
            
            <Card title="Daily Attendance">
                <div style={{ width: '100%', height: 100 }}>
                    <ResponsiveContainer>
                        <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <XAxis dataKey="name" tick={{ fill: '#78716c', fontSize: 10 }} axisLine={{ stroke: '#d6d3d1' }} tickLine={{ stroke: '#d6d3d1' }} className="dark:tick={{ fill: '#9ca3af' }} dark:axisLine={{ stroke: '#4b5563' }} dark:tickLine={{ stroke: '#4b5563' }}" />
                            <YAxis tick={{ fill: '#78716c', fontSize: 10 }} axisLine={{ stroke: '#d6d3d1' }} tickLine={{ stroke: '#d6d3d1' }} className="dark:tick={{ fill: '#9ca3af' }} dark:axisLine={{ stroke: '#4b5563' }} dark:tickLine={{ stroke: '#4b5563' }}" />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(180,180,120,0.1)' }} />
                            <Bar dataKey="balvatika" stackId="a" fill="#a8a29e" radius={[5, 5, 0, 0]} barSize={10} >
                                 {monthlyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.date.getDay() === 0 ? '#ef4444' : '#a8a29e'} />
                                ))}
                            </Bar>
                            <Bar dataKey="primary" stackId="a" fill="#f59e0b" barSize={10}>
                                {monthlyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.date.getDay() === 0 ? '#ef4444' : '#f59e0b'} />
                                ))}
                            </Bar>
                             <Bar dataKey="middle" stackId="a" fill="#ffc658" radius={[5, 5, 0, 0]} barSize={10}>
                                {monthlyData.map((entry, index) => (
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

            <Card title="AI-Powered Insight">
                {isGeneratingInsight ? (
                    <div className="flex items-center justify-center space-x-2 text-stone-500 dark:text-gray-400 min-h-[40px]">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        <span>Generating...</span>
                    </div>
                ) : aiInsight ? (
                    <p className="text-sm text-stone-600 dark:text-gray-300 italic">"{aiInsight}"</p>
                ) : (
                     <p className="text-sm text-stone-500 dark:text-gray-400">Click to get an AI analysis of '{new Date(displayedMonthKey + '-02T00:00:00').toLocaleString('default', { month: 'long' })}' data.</p>
                )}
                 <Button onClick={generateInsight} disabled={isGeneratingInsight} className="w-full mt-3" variant="secondary">
                    {aiInsight ? 'Regenerate Insight' : 'Get Insight'}
                </Button>
            </Card>
        </div>
    );
};

export default Dashboard;
