import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import { generatePDFReport } from '../../hooks/pdfGenerator';

const Reports: React.FC = () => {
    const { data } = useData();
    const { showToast } = useToast();
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [month, setMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
    const [reportType, setReportType] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedReport, setGeneratedReport] = useState<{ dataUri: string; filename: string } | null>(null);

    const handleGenerateReport = (type: string) => {
        if (isGenerating) return;
        setIsGenerating(true);
        // Clear previous report for better feedback
        if (generatedReport) setGeneratedReport(null); 
        
        setTimeout(() => {
            try {
                const selectedMonth = `${year}-${month}`;
                const result = generatePDFReport(type, data, selectedMonth);
                setGeneratedReport(result);
            } catch (error: any) {
                console.error("PDF generation failed:", error);
                showToast(error.message || 'Failed to generate PDF report.', 'error');
                setGeneratedReport(null);
            } finally {
                setIsGenerating(false);
            }
        }, 100);
    };

    const handleReportTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newType = e.target.value;
        setReportType(newType);
        if (newType) {
            handleGenerateReport(newType);
        } else {
            setGeneratedReport(null);
        }
    };

    const handleShareOrPrint = () => {
        if (!generatedReport) return;
        const iframe = document.getElementById('pdf-preview-iframe') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        } else {
            showToast('Could not initiate print. Please try downloading the report.', 'error');
        }
    };

    const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());
    const months = [
        { value: '01', name: 'January' }, { value: '02', name: 'February' }, { value: '03', name: 'March' },
        { value: '04', name: 'April' }, { value: '05', name: 'May' }, { value: '06', name: 'June' },
        { value: '07', name: 'July' }, { value: '08', name: 'August' }, { value: '09', name: 'September' },
        { value: '10', name: 'October' }, { value: '11', name: 'November' }, { value: '12', name: 'December' },
    ];
    
    const selectClasses = "w-full bg-stone-50 dark:bg-gray-700 border border-stone-300 dark:border-gray-600 text-stone-900 dark:text-white text-sm rounded-lg p-2.5 focus:ring-amber-500 focus:border-amber-500";

    return (
        <div className="pb-4">
             {generatedReport && !isGenerating && (
                <div className="p-3 bg-green-600 text-white text-center rounded-lg mb-4 text-sm shadow-md">
                    <p className="font-bold">Report Generated!</p>
                    <p>The report has been generated successfully. You can now share it.</p>
                </div>
            )}
            <div className="space-y-4">
                <Card>
                    <h2 className="text-base font-bold text-amber-700 dark:text-amber-400 mb-4">Generate a monthly MDM Report</h2>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="year-select" className="block text-xs font-medium text-stone-600 dark:text-gray-300 mb-1">Select Year</label>
                                <select id="year-select" value={year} onChange={e => setYear(e.target.value)} className={selectClasses}>
                                    {years.map(y => <option key={y} value={y}>{`${parseInt(y)}-${(parseInt(y.slice(2)) + 1)}`}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="month-select" className="block text-xs font-medium text-stone-600 dark:text-gray-300 mb-1">Select Month</label>
                                <select id="month-select" value={month} onChange={e => setMonth(e.target.value)} className={selectClasses}>
                                    {months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                             <label htmlFor="report-type" className="block text-xs font-medium mb-1 text-stone-600 dark:text-gray-300">Select Report Type and Generate</label>
                            <select id="report-type" value={reportType} onChange={handleReportTypeChange} className={selectClasses}>
                                <option value="">Select a report...</option>
                                <option value="mdcf">📄 MDFC • En</option>
                                <option value="roll_statement">Roll Statement • En</option>
                                <option value="daily_consumption">Daily Register • En</option>
                            </select>
                        </div>
                    </div>
                </Card>

                {isGenerating ? (
                     <Card>
                        <div className="text-center py-8">
                            <div className="inline-block p-4 bg-amber-100/60 dark:bg-gray-700/50 rounded-full text-amber-500 dark:text-amber-400">
                                <svg className="animate-spin h-10 w-10 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                            <h3 className="mt-4 text-lg font-semibold text-stone-700 dark:text-gray-200">Generating Report...</h3>
                            <p className="mt-1 text-sm text-stone-500 dark:text-gray-400">Please wait a moment.</p>
                        </div>
                    </Card>
                ) : generatedReport ? (
                    <div className="space-y-4">
                        <Card>
                             <div className="overflow-hidden border border-amber-200/50 dark:border-white/10 shadow-inner rounded-lg h-[70vh] bg-gray-200 dark:bg-gray-700">
                                <iframe id="pdf-preview-iframe" src={generatedReport.dataUri} title={generatedReport.filename} className="w-full h-full border-0" />
                            </div>
                        </Card>
                        <button
                            onClick={handleShareOrPrint}
                            className="w-full flex items-center justify-center space-x-3 py-3 text-base font-bold bg-[#e3a869] hover:bg-[#d49758] text-white rounded-2xl shadow-lg transition-transform transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e3a869] dark:focus:ring-offset-gray-900"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            <span>Share or Print Report</span>
                        </button>
                    </div>
                ) : (
                     <Card>
                        <div className="text-center py-8">
                             <div className="inline-block p-4 bg-amber-100/60 dark:bg-gray-700/50 rounded-full text-amber-500 dark:text-amber-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"></path></svg>
                            </div>
                            <h3 className="mt-4 text-lg font-semibold text-stone-700 dark:text-gray-200">No report generated</h3>
                            <p className="mt-1 text-sm text-stone-500 dark:text-gray-400">Select options from the dropdowns to generate a report.</p>
                        </div>
                    </Card>
                )}

                <div className="space-y-4 pt-4">
                    <Card className="bg-purple-500/10 dark:bg-purple-900/20 !border-l-4 !border-purple-400">
                        <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 pt-0.5 text-purple-500 dark:text-purple-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                            </div>
                            <div>
                                <h4 className="font-semibold text-purple-700 dark:text-purple-300">Complete Monthly Reports</h4>
                                <p className="text-xs text-purple-600 dark:text-purple-300/80 mt-1">Enter cook information and other required details that are not auto-generated to create a fully compliant monthly report.</p>
                                <Button className="mt-3 !py-1.5 !px-4 !text-sm bg-purple-500 hover:bg-purple-600 focus:ring-purple-400">
                                    <span>🍳 Add Details</span>
                                </Button>
                            </div>
                        </div>
                    </Card>
                
                    <Card className="bg-yellow-500/10 dark:bg-yellow-900/20 !border-l-4 !border-yellow-400">
                        <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 pt-0.5 text-yellow-500 dark:text-yellow-400">
                               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            </div>
                            <div>
                                <h4 className="font-semibold text-yellow-700 dark:text-yellow-400">A4 Print Ready</h4>
                                <p className="text-xs text-yellow-600 dark:text-yellow-300/80 mt-1">Reports are optimized for A4 printing. Having layout issues? Try adjusting your device's font size to a smaller one.</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Reports;
