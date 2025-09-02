import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useData } from '../../hooks/useData';
import { useToast } from '../../hooks/useToast';
import { generatePDFReport } from '../../hooks/pdfGenerator';
import PDFPreviewModal from '../ui/PDFPreviewModal';

const Reports: React.FC = () => {
    const { data } = useData();
    const { showToast } = useToast();
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [month, setMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
    const [reportType, setReportType] = useState('mdcf');
    const [isGenerating, setIsGenerating] = useState(false);
    
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [pdfPreviewData, setPdfPreviewData] = useState<{ dataUri: string; filename: string } | null>(null);

    const handleGenerateReport = () => {
        if (!reportType) {
            showToast('Please select a report type.', 'error');
            return;
        }
        if (isGenerating) return;
        setIsGenerating(true);
        
        setTimeout(() => {
            try {
                const selectedMonth = `${year}-${month}`;
                const result = generatePDFReport(reportType, data, selectedMonth);
                setPdfPreviewData(result);
                if (!isPreviewOpen) {
                    setIsPreviewOpen(true);
                }
                showToast('Report generated successfully!', 'success');
            } catch (error: any) {
                console.error("PDF generation failed:", error);
                showToast(error.message || 'Failed to generate PDF report.', 'error');
            } finally {
                setIsGenerating(false);
            }
        }, 100);
    };

    const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());
    const months = [
        { value: '01', name: 'January' }, { value: '02', name: 'February' }, { value: '03', name: 'March' },
        { value: '04', name: 'April' }, { value: '05', name: 'May' }, { value: '06', name: 'June' },
        { value: '07', name: 'July' }, { value: '08', name: 'August' }, { value: '09', name: 'September' },
        { value: '10', name: 'October' }, { value: '11', name: 'November' }, { value: '12', name: 'December' },
    ];
    
    const selectClasses = "w-full bg-amber-100/60 dark:bg-gray-700/50 border border-amber-300/50 dark:border-gray-600 text-stone-900 dark:text-white text-sm rounded-lg p-2.5 focus:ring-amber-500 focus:border-amber-500";

    return (
        <>
            <PDFPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                pdfDataUri={pdfPreviewData?.dataUri || ''}
                filename={pdfPreviewData?.filename || 'report.pdf'}
                onRegenerate={handleGenerateReport}
            />
            <div className="space-y-4 pb-4">
                <Card>
                    <h2 className="text-lg font-bold text-amber-700 dark:text-amber-400 mb-4">Generate Reports</h2>
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
                        <div className="col-span-2">
                             <label htmlFor="report-type" className="block text-xs font-medium mb-1 text-stone-600 dark:text-gray-300">Report Type</label>
                            <select id="report-type" value={reportType} onChange={e => setReportType(e.target.value)} className={selectClasses}>
                                <option value="mdcf">Monthly Data Collection Format (MDCF)</option>
                                <option value="roll_statement">Roll Statement</option>
                                <option value="daily_consumption">Daily Consumption Register</option>
                            </select>
                        </div>
                        <Button onClick={handleGenerateReport} className="w-full" disabled={isGenerating}>
                            {isGenerating ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Generating...
                                </span>
                            ) : (
                                'Generate & Preview PDF'
                            )}
                        </Button>
                    </div>
                </Card>

                <Card>
                    <h3 className="font-semibold text-amber-700 dark:text-amber-400 mb-2">Help & Tips</h3>
                    <ul className="space-y-2 text-xs text-stone-600 dark:text-gray-300 list-disc list-inside">
                        <li>Ensure all settings (school details, enrollment, rates) are up-to-date for accurate reports.</li>
                        <li>The "Roll Statement" report does not depend on the selected month and year.</li>
                        <li>Reports are optimized for A4 printing. For best results, use the 'Download' button in the preview and print from a PDF viewer.</li>
                        <li>The 'Regenerate' button in the preview will create a new report with the latest data and selections.</li>
                    </ul>
                </Card>
            </div>
        </>
    );
};

export default Reports;
