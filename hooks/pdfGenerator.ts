import { AppData, Category, ClassRoll } from '../types';
import { calculateMonthlySummary } from '../services/summaryCalculator';
import { CLASS_STRUCTURE } from '../constants';

interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
    [key: string]: any;
}

// These are loaded from index.html
declare const jspdf: any;

// A reusable function to add signature blocks to the bottom of a page
const addSignatureBlock = (doc: jsPDF, settings: AppData['settings'], startY: number) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const leftPos = pageWidth / 4;
    const rightPos = pageWidth * 3 / 4;
    const signatureSpacing = 15;

    let y = startY + signatureSpacing;

    // Check if there's enough space, if not, add a new page
    if (y > pageHeight - 40) {
        doc.addPage();
        y = 20; // Reset y to top of new page
    }

    doc.setFontSize(9).setFont(undefined, 'normal');

    // MDM Incharge Signature (Left)
    doc.text('.........................................', leftPos, y, { align: 'center' });
    doc.text(`(${settings.mdmIncharge.name || 'Name'})`, leftPos, y + 4, { align: 'center' });
    doc.setFont(undefined, 'bold');
    doc.text('MDM Incharge', leftPos, y + 8, { align: 'center' });

    // Head of Institution Signature (Right)
    doc.setFont(undefined, 'normal');
    doc.text('.........................................', rightPos, y, { align: 'center' });
    doc.text(`(${settings.headOfInstitution.name || 'Name'})`, rightPos, y + 4, { align: 'center' });
    doc.setFont(undefined, 'bold');
    doc.text('Head of the Institution', rightPos, y + 8, { align: 'center' });
};


// Helper to draw a checkbox for MDCF report
const drawCheckbox = (doc: jsPDF, x: number, y: number, text: string, checked: boolean) => {
    doc.rect(x, y, 3, 3); // Draw the box
    doc.text(text, x + 5, y + 2.5); // Draw the label
    if (checked) {
        doc.setFont(undefined, 'bold');
        doc.text('X', x + 0.8, y + 2.5); // Draw the 'X' if checked
        doc.setFont(undefined, 'normal');
    }
};

const generateMDCF = (data: AppData, selectedMonth: string): Blob => {
    const doc = new jspdf.jsPDF();
    const { settings } = data;
    const { schoolDetails } = settings;
    const summaryData = calculateMonthlySummary(data, selectedMonth);
    const { monthEntries, riceAbstracts, cashAbstracts, categoryTotals } = summaryData;

    const monthDate = new Date(`${selectedMonth}-02`);
    const monthName = monthDate.toLocaleString('default', { month: 'long' });
    const year = monthDate.getFullYear();

    // ======== HEADERS ========
    doc.setFontSize(12).setFont(undefined, 'bold');
    doc.text('Pradhan Mantri Poshan Shakti Nirman (PM POSHAN)', doc.internal.pageSize.getWidth() / 2, 10, { align: 'center' });
    doc.setFontSize(10).setFont(undefined, 'normal');
    doc.text('School Monthly Data Capture Format (MDCF)', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.setFontSize(8);
    doc.text('Instructions: Keep following registers at the time of filling the form:-', 14, 22);
    doc.text('1) Enrolment Register. 2) Account 3) Bank Account Pass book. 4) Cooking cost details etc.', 14, 26);

    // ======== 1. School Details ========
    doc.setFontSize(10).setFont(undefined, 'bold');
    doc.text('1. School Details', 14, 32);
    doc.autoTable({
        startY: 34,
        body: [[`Month-Year: ${monthName} ${year}`, `UDISE Code: ${schoolDetails.udise}`, `School Name: ${schoolDetails.name}`]],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.5 },
    });

    const onRoll = data.settings.classRolls.reduce((sum, c) => sum + c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls, 0);

    // Checkbox section
    doc.setFontSize(8);
    drawCheckbox(doc, 20, 50, 'Government', schoolDetails.schoolTypeMDCF === 'Government');
    drawCheckbox(doc, 20, 55, 'Local Body', schoolDetails.schoolTypeMDCF === 'Local Body');
    drawCheckbox(doc, 20, 60, 'EGS/AIE Centers', schoolDetails.schoolTypeMDCF === 'EGS/AIE Centers');
    drawCheckbox(doc, 65, 50, 'NCLP', schoolDetails.schoolTypeMDCF === 'NCLP');
    drawCheckbox(doc, 65, 55, 'Madras / Maqtab', schoolDetails.schoolTypeMDCF === 'Madras / Maqtab');
    
    drawCheckbox(doc, 110, 50, 'Primary', schoolDetails.schoolCategoryMDCF === 'Primary');
    drawCheckbox(doc, 110, 55, 'Upper Primary', schoolDetails.schoolCategoryMDCF === 'Upper Primary');
    drawCheckbox(doc, 110, 60, 'Primary with Upper Primary', schoolDetails.schoolCategoryMDCF === 'Primary with Upper Primary');

    // Location Details
    doc.autoTable({ 
        startY: 65, 
        body: [
            [`State / UT: ${schoolDetails.state}`, `District: ${schoolDetails.district}`, `Block/NP: ${schoolDetails.block}`, `Village/Ward: ${schoolDetails.village}`],
            [`Kitchen Type: ${schoolDetails.kitchenType}`, `Enrolment: ${onRoll}`, '', '']
        ], 
        theme: 'grid', 
        styles: { fontSize: 8, cellPadding: 1.5 } 
    });

    // ======== 2. Meals Availed Status ========
    const actualDaysServed = {
        balvatika: monthEntries.filter(e => e.present.balvatika > 0).length,
        primary: monthEntries.filter(e => e.present.primary > 0).length,
        middle: monthEntries.filter(e => e.present.middle > 0).length,
    };
    doc.setFontSize(10).setFont(undefined, 'bold');
    doc.text('2. Meals Availed Status', 14, doc.lastAutoTable.finalY + 6);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 8,
        head: [['', 'Bal Vatika', 'Primary', 'Upper Primary']],
        body: [
            ['Number of School days during month', monthEntries.length, monthEntries.length, monthEntries.length],
            ['Number of actual days MDM served', actualDaysServed.balvatika, actualDaysServed.primary, actualDaysServed.middle],
            ['Total Meals served during the month', categoryTotals.present.balvatika, categoryTotals.present.primary, categoryTotals.present.middle],
        ],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.5 }
    });
    
    // ======== 3. Fund Details (in Rs.) ========
    doc.setFontSize(10).setFont(undefined, 'bold');
    doc.text('3. Fund Details (in Rs.)', 14, doc.lastAutoTable.finalY + 6);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 8,
        head: [['Component', 'Opening Balance', 'Received', 'Expenditure', 'Closing Balance']],
        body: [
            ['Cooking Cost - Bal Vatika', cashAbstracts.balvatika.opening.toFixed(2), cashAbstracts.balvatika.received.toFixed(2), cashAbstracts.balvatika.expenditure.toFixed(2), cashAbstracts.balvatika.balance.toFixed(2)],
            ['Cooking Cost - Primary', cashAbstracts.primary.opening.toFixed(2), cashAbstracts.primary.received.toFixed(2), cashAbstracts.primary.expenditure.toFixed(2), cashAbstracts.primary.balance.toFixed(2)],
            ['Cooking Cost - Uper Primary', cashAbstracts.middle.opening.toFixed(2), cashAbstracts.middle.received.toFixed(2), cashAbstracts.middle.expenditure.toFixed(2), cashAbstracts.middle.balance.toFixed(2)],
        ],
        theme: 'grid', styles: { fontSize: 8, cellPadding: 1.5 },
    });

    // ======== 4. Cook Cum Helper Payment Details ========
    doc.setFontSize(10).setFont(undefined, 'bold');
    doc.text('4. Cook Cum Helper Payment Details', 14, doc.lastAutoTable.finalY + 6);
    doc.autoTable({
        startY: doc