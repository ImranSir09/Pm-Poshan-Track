
// FIX: Import AbstractData type to define a default object.
import { AppData, Category, ClassRoll, AbstractData } from '../types';
import { calculateMonthlySummary } from '../services/summaryCalculator';
import { CLASS_STRUCTURE } from '../constants';
import { DEFAULT_SETTINGS } from '../constants';

interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
    [key: string]: any;
}

declare const jspdf: any;

// --- STYLING & CONSTANTS ---
const FONT_BOLD = 'helvetica';
const FONT_NORMAL = 'helvetica';
const PRIMARY_COLOR = '#b45309'; // amber-700
const HEADER_BG = '#f59e0b'; // amber-500
const TABLE_HEADER_BG = '#f59e0b'; // amber-500
const TABLE_FOOTER_BG = '#fcd34d'; // amber-300
const WHITE_TEXT = '#FFFFFF';
const PAGE_MARGIN = 14;

// --- HELPER FUNCTIONS ---

const getLocalYYYYMMDD = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const addHeader = (doc: jsPDF, title: string, schoolName: string, monthStr?: string) => {
    doc.setFont(FONT_BOLD, 'bold');
    doc.setFontSize(14);
    doc.setTextColor(PRIMARY_COLOR);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, PAGE_MARGIN, { align: 'center' });

    doc.setFont(FONT_NORMAL, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(schoolName, doc.internal.pageSize.getWidth() / 2, PAGE_MARGIN + 7, { align: 'center' });
    if (monthStr) {
        const monthDate = new Date(`${monthStr}-02T00:00:00`);
        const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        doc.setFontSize(9);
        doc.text(monthName, doc.internal.pageSize.getWidth() / 2, PAGE_MARGIN + 12, { align: 'center' });
    }
};

const addFooter = (doc: jsPDF) => {
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(100);

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const footerText = `Generated on ${new Date().toLocaleDateString('en-IN')} from PM Poshan Track App by Emraan Mugloo`;
        doc.text(footerText, PAGE_MARGIN, doc.internal.pageSize.getHeight() - 8);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - PAGE_MARGIN, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    }
};

const calculateSectionTotals = (classes: ClassRoll[]) => {
    return classes.reduce((acc, cr) => {
        acc.general.boys += cr.general.boys || 0;
        acc.general.girls += cr.general.girls || 0;
        acc.stsc.boys += cr.stsc.boys || 0;
        acc.stsc.girls += cr.stsc.girls || 0;
        acc.total.boys += (cr.general.boys || 0) + (cr.stsc.boys || 0);
        acc.total.girls += (cr.general.girls || 0) + (cr.stsc.girls || 0);
        acc.total.onRoll += (cr.general.boys || 0) + (cr.general.girls || 0) + (cr.stsc.boys || 0) + (cr.stsc.girls || 0);
        return acc;
    }, {
        general: { boys: 0, girls: 0 },
        stsc: { boys: 0, girls: 0 },
        total: { boys: 0, girls: 0, onRoll: 0 },
    });
};

const commonAutoTableOptions = () => ({
    theme: 'grid',
    styles: { fontSize: 8, font: FONT_NORMAL, cellPadding: 1.5, lineColor: 40, lineWidth: 0.25, overflow: 'linebreak' },
    headStyles: { fillColor: TABLE_HEADER_BG, textColor: WHITE_TEXT, fontStyle: 'bold' },
    footStyles: { fillColor: TABLE_FOOTER_BG, textColor: '#000000', fontStyle: 'bold' },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
});

// --- REPORT GENERATORS ---

const generateMDCFReport = (data: AppData, month: string): Blob => {
    const doc = new jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as jsPDF;
    const { settings, entries } = data;
    const { schoolDetails, healthStatus, inspectionReport, cooks } = settings;

    const summary = calculateMonthlySummary(data, month);
    const { riceAbstracts, cashAbstracts, categoryTotals } = summary;

    const monthDate = new Date(`${month}-02T00:00:00`);
    const monthName = monthDate.toLocaleString('default', { month: 'long' });
    const year = monthDate.getFullYear();

    // --- PAGE 1 ---

    // Main Header
    doc.setFont(FONT_BOLD, 'bold');
    doc.setFontSize(12);
    doc.text('Pradhan Mantri Poshan Shakti Nirman (PM POSHAN)', doc.internal.pageSize.getWidth() / 2, 10, { align: 'center' });
    doc.setFontSize(10);
    doc.text('School Monthly Data Capture Format (MDCF)', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    
    // Instructions
    doc.setFont(FONT_NORMAL, 'normal');
    doc.setFontSize(8);
    doc.text('Instructions: Keep following registers at the time of filling the form:-', PAGE_MARGIN, 22);
    doc.text('1) Enrolment Register. 2) Account 3) Bank Account Pass book. 4) Cooking cost details etc.', PAGE_MARGIN, 26);

    // Section 1: School Details
    doc.setFont(FONT_BOLD, 'bold');
    doc.setFontSize(10);
    doc.text('1. School Details', PAGE_MARGIN, 33);
    const checkbox = (checked: boolean) => checked ? '☑' : '☐';
    const typeCheckbox = (label: string, value: string, currentValue: string) => `${currentValue === value ? checkbox(true) : checkbox(false)} ${label}`;
    const schoolTypeMDCF = settings.schoolDetails.schoolTypeMDCF || '';
    const schoolCategoryMDCF = settings.schoolDetails.schoolCategoryMDCF || '';
    const totalEnrollment = (settings.classRolls || []).reduce((sum, c) => sum + (c.general.boys || 0) + (c.general.girls || 0) + (c.stsc.boys || 0) + (c.stsc.girls || 0), 0);

    const typeContent = ['Government', 'Local Body', 'EGS/AIE Centers', 'NCLP', 'Madras / Maqtab'].map(val => typeCheckbox(val, val, schoolTypeMDCF)).join('   ');
    const categoryContent = ['Primary', 'Upper Primary', 'Primary with Upper Primary'].map(val => typeCheckbox(val, val, schoolCategoryMDCF)).join('   ');
    
    doc.autoTable({
        startY: 35,
        theme: 'grid',
        body: [
            ['Month-Year', `${monthName} ${year}`, 'UDISE Code', schoolDetails.udise, 'School Name', schoolDetails.name],
            ['Type', { content: typeContent, colSpan: 5 }],
            ['Category', { content: categoryContent, colSpan: 5 }],
            ['State / UT-', schoolDetails.state, 'District-', schoolDetails.district, 'Block/NP-', schoolDetails.block],
            ['Kitchen Type-', schoolDetails.kitchenType, 'Enrolment-', totalEnrollment.toString(), 'Village/Ward-', schoolDetails.village],
        ],
        styles: { fontSize: 8, cellPadding: 1.5, lineColor: 40, lineWidth: 0.25, overflow: 'linebreak' },
        columnStyles: { 0: { cellWidth: 25, fontStyle: 'bold' }, 2: { cellWidth: 25, fontStyle: 'bold' }, 4: { cellWidth: 25, fontStyle: 'bold' } }
    });
    
    // Section 2: Meals Availed Status
    const mealDays = entries.filter(e => e.date.startsWith(month) && e.totalPresent > 0).length;
    const monthDateObj = new Date(year, monthDate.getMonth() + 1, 0);
    const daysInMonth = monthDateObj.getDate();
    
    // Calculate school days by counting entries that are not official holidays or sundays.
    const schoolDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)
        .map(day => new Date(year, monthDate.getMonth(), day))
        .filter(date => {
            if (date.getDay() === 0) return false; // Exclude Sundays
            const dateString = getLocalYYYYMMDD(date);
            const entry = entries.find(e => e.id === dateString);
            if (entry && entry.reasonForNoMeal) {
                const reason = entry.reasonForNoMeal.toLowerCase();
                // Exclude if it's a known holiday reason
                if (reason.includes('holiday') || reason.includes('vacation') || reason.includes('festival')) {
                    return false;
                }
            }
            return true;
        }).length;

    doc.setFont(FONT_BOLD, 'bold');
    doc.setFontSize(10);
    doc.text('2. Meals Availed Status', PAGE_MARGIN, doc.lastAutoTable.finalY + 7);

    const primaryStudents = categoryTotals.present.primary;
    const upperPrimaryStudents = categoryTotals.present.middle + categoryTotals.present.balvatika; // U.Pri includes middle and pre-primary for this report
    const avgPrimary = mealDays > 0 ? (primaryStudents / mealDays).toFixed(0) : '0';
    const avgUpperPrimary = mealDays > 0 ? (upperPrimaryStudents / mealDays).toFixed(0) : '0';
    
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 9, theme: 'grid',
        head: [['Total School Days', 'Total Meal Days', 'Avg Daily Attendance (Pri)', 'Avg Daily Attendance (U. Pri)']],
        body: [[ schoolDays, mealDays, avgPrimary, avgUpperPrimary ]],
        styles: { fontSize: 8, cellPadding: 1.5, lineColor: 40, lineWidth: 0.25 },
        headStyles: { fillColor: TABLE_HEADER_BG, textColor: WHITE_TEXT, fontStyle: 'bold' },
    });
    
    // Continue with other sections...
    addFooter(doc);
    return doc.output('blob');
};

const generateRollStatementReport = (data: AppData): Blob => {
    const doc = new jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }) as jsPDF;
    const { settings } = data;
    addHeader(doc, 'Student Roll Statement', settings.schoolDetails.name);

    const classOrder = CLASS_STRUCTURE.reduce((acc, c, index) => {
        acc[c.id] = index;
        return acc;
    }, {} as Record<string, number>);

    const sortFunction = (a: ClassRoll, b: ClassRoll) => (classOrder[a.id] ?? 99) - (classOrder[b.id] ?? 99);
    
    const allRolls = settings.classRolls || [];
    
    const middle = allRolls.filter(c => ['c6', 'c7', 'c8'].includes(c.id)).sort(sortFunction);
    const primary = allRolls.filter(c => ['c1', 'c2', 'c3', 'c4', 'c5'].includes(c.id)).sort(sortFunction);
    const prePrimary = allRolls.filter(c => ['bal', 'pp1', 'pp2'].includes(c.id)).sort(sortFunction);

    const grandTotal = calculateSectionTotals(allRolls);
    const middleTotals = calculateSectionTotals(middle);
    const primaryTotals = calculateSectionTotals(primary);
    const prePrimaryTotals = calculateSectionTotals(prePrimary);

    const head = [
        [{ content: 'Class', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'General', colSpan: 2, styles: { halign: 'center' } }, { content: 'ST/SC', colSpan: 2, styles: { halign: 'center' } }, { content: 'Total', colSpan: 2, styles: { halign: 'center' } }, { content: 'On Roll', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }],
        ['Boys', 'Girls', 'Boys', 'Girls', 'Boys', 'Girls']
    ];

    const body: any[] = [];

    const addSection = (title: string, classes: ClassRoll[], totals: ReturnType<typeof calculateSectionTotals>) => {
        if (classes.length > 0) {
            body.push([{ content: title, colSpan: 8, styles: { fontStyle: 'bold', fillColor: '#fef3c7', halign: 'left' } }]);
            classes.forEach(cr => {
                const totalBoys = (cr.general.boys || 0) + (cr.stsc.boys || 0);
                const totalGirls = (cr.general.girls || 0) + (cr.stsc.girls || 0);
                const onRoll = totalBoys + totalGirls;
                body.push([cr.name, cr.general.boys, cr.general.girls, cr.stsc.boys, cr.stsc.girls, totalBoys, totalGirls, onRoll]);
            });
            body.push([`${title.split(' ')[0]} Total`, totals.general.boys, totals.general.girls, totals.stsc.boys, totals.stsc.girls, totals.total.boys, totals.total.girls, totals.total.onRoll]);
        }
    };
    
    addSection('Pre-Primary', prePrimary, prePrimaryTotals);
    addSection('Primary (I-V)', primary, primaryTotals);
    addSection('Middle (VI-VIII)', middle, middleTotals);

    const foot = [[
        'Grand Total',
        grandTotal.general.boys,
        grandTotal.general.girls,
        grandTotal.stsc.boys,
        grandTotal.stsc.girls,
        grandTotal.total.boys,
        grandTotal.total.girls,
        grandTotal.total.onRoll
    ]];

    doc.autoTable({
        ...commonAutoTableOptions(),
        startY: PAGE_MARGIN + 20,
        head: head,
        body: body,
        foot: foot,
        didParseCell: function(data: any) {
            if (data.row.section === 'foot' || (data.cell.raw && typeof data.cell.raw === 'string' && data.cell.raw.includes('Total'))) {
                data.cell.styles.fontStyle = 'bold';
            }
        },
    });

    addFooter(doc);
    return doc.output('blob');
};

const generateDailyConsumptionReport = (data: AppData, month: string): Blob => {
    const doc = new jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }) as jsPDF;
    const { settings } = data;
    const summary = calculateMonthlySummary(data, month);
    const { monthEntries } = summary;

    addHeader(doc, 'Daily Consumption Register', settings.schoolDetails.name, month);

    const head = [['Date', 'Balvatika\nPresent', 'Primary\nPresent', 'Middle\nPresent', 'Total\nPresent', 'Rice\n(kg)', 'Dal/Veg\n(₹)', 'Oil/Cond\n(₹)', 'Salt\n(₹)', 'Fuel\n(₹)', 'Total\n(₹)', 'Reason for No Meal']];
    const body: any[] = [];
    const totals = {
        balvatika: 0, primary: 0, middle: 0, total: 0,
        rice: 0, dalVeg: 0, oilCond: 0, salt: 0, fuel: 0, cost: 0
    };
    
    const monthDate = new Date(`${month}-02T00:00:00`);
    const year = monthDate.getFullYear();
    const m = monthDate.getMonth();
    const daysInMonth = new Date(year, m + 1, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, m, i);
        const dateString = getLocalYYYYMMDD(date);
        const entry = monthEntries.find(e => e.id === dateString);

        const present = entry ? entry.present : { balvatika: 0, primary: 0, middle: 0 };
        const totalPresent = entry ? entry.totalPresent : 0;
        const consumption = entry ? entry.consumption : { rice: 0, dalVeg: 0, oilCond: 0, salt: 0, fuel: 0, total: 0 };

        body.push([
            i,
            present.balvatika,
            present.primary,
            present.middle,
            totalPresent,
            consumption.rice.toFixed(3),
            consumption.dalVeg.toFixed(2),
            consumption.oilCond.toFixed(2),
            consumption.salt.toFixed(2),
            consumption.fuel.toFixed(2),
            consumption.total.toFixed(2),
            entry?.reasonForNoMeal || ''
        ]);
        
        totals.balvatika += present.balvatika;
        totals.primary += present.primary;
        totals.middle += present.middle;
        totals.total += totalPresent;
        totals.rice += consumption.rice;
        totals.dalVeg += consumption.dalVeg;
        totals.oilCond += consumption.oilCond;
        totals.salt += consumption.salt;
        totals.fuel += consumption.fuel;
        totals.cost += consumption.total;
    }

    const foot = [[
        'Total',
        totals.balvatika,
        totals.primary,
        totals.middle,
        totals.total,
        totals.rice.toFixed(3),
        totals.dalVeg.toFixed(2),
        totals.oilCond.toFixed(2),
        totals.salt.toFixed(2),
        totals.fuel.toFixed(2),
        totals.cost.toFixed(2),
        ''
    ]];
    
    doc.autoTable({
        ...commonAutoTableOptions(),
        startY: PAGE_MARGIN + 20,
        head: head,
        body: body,
        foot: foot,
    });

    addFooter(doc);
    return doc.output('blob');
};

export const generatePDFReport = (reportType: string, data: AppData, selectedMonth: string): { pdfBlob: Blob; filename: string } => {
    const schoolName = data.settings.schoolDetails.name.replace(/\s+/g, '_');
    const monthForFilename = selectedMonth.replace('-', '_');

    let pdfBlob: Blob;
    let filename: string;

    switch (reportType) {
        case 'mdcf':
            pdfBlob = generateMDCFReport(data, selectedMonth);
            filename = `MDCF_Report_${schoolName}_${monthForFilename}.pdf`;
            break;
        case 'roll_statement':
            pdfBlob = generateRollStatementReport(data);
            filename = `Roll_Statement_${schoolName}.pdf`;
            break;
        case 'daily_consumption':
            pdfBlob = generateDailyConsumptionReport(data, selectedMonth);
            filename = `Daily_Consumption_${schoolName}_${monthForFilename}.pdf`;
            break;
        default:
            throw new Error(`Unknown report type: ${reportType}`);
    }

    return { pdfBlob, filename };
};
