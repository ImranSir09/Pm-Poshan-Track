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
            ['Cooking Cost - Upper Primary', cashAbstracts.middle.opening.toFixed(2), cashAbstracts.middle.received.toFixed(2), cashAbstracts.middle.expenditure.toFixed(2), cashAbstracts.middle.balance.toFixed(2)],
        ],
        theme: 'grid', styles: { fontSize: 8, cellPadding: 1.5 },
    });

    // ======== 4. Cook Cum Helper Payment Details ========
    doc.setFontSize(10).setFont(undefined, 'bold');
    doc.text('4. Cook Cum Helper Payment Details', 14, doc.lastAutoTable.finalY + 6);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 8,
        head: [['S.No', 'Name', 'Gender', 'Category', 'Mode of Payment', 'Amount Paid (Rs.)']],
        body: settings.cooks.map((cook, index) => [
            index + 1,
            cook.name,
            cook.gender,
            cook.category,
            cook.paymentMode,
            cook.amountPaid.toFixed(2)
        ]),
        theme: 'grid', styles: { fontSize: 8, cellPadding: 1.5 },
    });

    // ======== 5. Food Grains Details (in Kgs) ========
    doc.setFontSize(10).setFont(undefined, 'bold');
    doc.text('5. Food Grains Details (in Kgs)', 14, doc.lastAutoTable.finalY + 6);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 8,
        head: [['Component', 'Opening Balance', 'Received', 'Utilized', 'Closing Balance']],
        body: [
            ['Rice - Bal Vatika', riceAbstracts.balvatika.opening.toFixed(3), riceAbstracts.balvatika.received.toFixed(3), riceAbstracts.balvatika.consumed.toFixed(3), riceAbstracts.balvatika.balance.toFixed(3)],
            ['Rice - Primary', riceAbstracts.primary.opening.toFixed(3), riceAbstracts.primary.received.toFixed(3), riceAbstracts.primary.consumed.toFixed(3), riceAbstracts.primary.balance.toFixed(3)],
            ['Rice - Upper Primary', riceAbstracts.middle.opening.toFixed(3), riceAbstracts.middle.received.toFixed(3), riceAbstracts.middle.consumed.toFixed(3), riceAbstracts.middle.balance.toFixed(3)],
        ],
        theme: 'grid', styles: { fontSize: 8, cellPadding: 1.5 },
    });

    // ======== 6. Other Details ========
    doc.setFontSize(10).setFont(undefined, 'bold');
    doc.text('6. Other Details', 14, doc.lastAutoTable.finalY + 6);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 8,
        body: [
            ['No. of Children given IFA Tablets (Boys)', settings.healthStatus.ifaBoys],
            ['No. of Children given IFA Tablets (Girls)', settings.healthStatus.ifaGirls],
            ['No. of Children Screened by RBSK team', settings.healthStatus.screenedByRBSK],
            ['No. of Children Referred by RBSK team', settings.healthStatus.referredByRBSK],
            ['Was MDM Inspected?', settings.inspectionReport.inspected ? 'Yes' : 'No'],
            ['If Yes, by Whom', settings.inspectionReport.inspected ? settings.inspectionReport.inspectedBy : 'N/A'],
            ['Untoward Incidents Reported', settings.inspectionReport.incidentsCount],
            ['MME Expenditure (in Rs.)', settings.mmeExpenditure.toFixed(2)]
        ],
        theme: 'grid', styles: { fontSize: 8, cellPadding: 1.5 },
    });

    addSignatureBlock(doc, settings, doc.lastAutoTable.finalY);

    return doc.output('blob');
};

const generateRollStatementPDF = (data: AppData): Blob => {
    const doc = new jspdf.jsPDF();
    const { settings } = data;
    const { schoolDetails } = settings;

    doc.setFontSize(14).setFont(undefined, 'bold');
    doc.text(schoolDetails.name, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.setFontSize(11).setFont(undefined, 'normal');
    doc.text('Student Enrollment (Roll Statement)', doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

    const head = [['Class', 'Gen (Boys)', 'Gen (Girls)', 'ST/SC (Boys)', 'ST/SC (Girls)', 'Total Boys', 'Total Girls', 'On Roll']];
    const body: any[][] = [];
    
    let grandTotal = { genB: 0, genG: 0, stscB: 0, stscG: 0, totalB: 0, totalG: 0, onRoll: 0 };

    (settings.classRolls || []).forEach(cr => {
        const totalBoys = cr.general.boys + cr.stsc.boys;
        const totalGirls = cr.general.girls + cr.stsc.girls;
        const onRoll = totalBoys + totalGirls;
        
        body.push([cr.name, cr.general.boys, cr.general.girls, cr.stsc.boys, cr.stsc.girls, totalBoys, totalGirls, onRoll]);

        grandTotal.genB += cr.general.boys;
        grandTotal.genG += cr.general.girls;
        grandTotal.stscB += cr.stsc.boys;
        grandTotal.stscG += cr.stsc.girls;
        grandTotal.totalB += totalBoys;
        grandTotal.totalG += totalGirls;
        grandTotal.onRoll += onRoll;
    });

    const foot = [['Grand Total', grandTotal.genB, grandTotal.genG, grandTotal.stscB, grandTotal.stscG, grandTotal.totalB, grandTotal.totalG, grandTotal.onRoll]];

    doc.autoTable({
        startY: 30,
        head: head,
        body: body,
        foot: foot,
        theme: 'grid', styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [245, 158, 11] }, footStyles: { fillColor: [252, 211, 77] },
    });

    addSignatureBlock(doc, settings, doc.lastAutoTable.finalY);

    return doc.output('blob');
};

const generateDailyConsumptionPDF = (data: AppData, selectedMonth: string): Blob => {
    const doc = new jspdf.jsPDF('l', 'mm', 'a4');
    const { settings } = data;
    const { schoolDetails } = settings;
    const summaryData = calculateMonthlySummary(data, selectedMonth);
    
    const monthDate = new Date(`${selectedMonth}-02`);
    const monthName = monthDate.toLocaleString('default', { month: 'long' });
    const year = monthDate.getFullYear();

    doc.setFontSize(14).setFont(undefined, 'bold');
    doc.text(schoolDetails.name, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.setFontSize(11).setFont(undefined, 'normal');
    doc.text(`Daily Consumption Register for ${monthName} ${year}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

    const head = [['Date', 'Balvatika', 'Primary', 'Middle', 'Total Present', 'Rice (kg)', 'Dal/Veg (₹)', 'Oil/Cond (₹)', 'Salt (₹)', 'Fuel (₹)', 'Total Cost (₹)', 'Reason for No Meal']];
    const body: any[][] = [];
    
    const totals = { present: 0, rice: 0, cost: 0, dalVeg: 0, oilCond: 0, salt: 0, fuel: 0 };

    summaryData.monthEntries.forEach(entry => {
        body.push([
            new Date(entry.date + 'T00:00:00').toLocaleDateString('en-IN'),
            entry.present.balvatika, entry.present.primary, entry.present.middle, entry.totalPresent,
            entry.consumption.rice.toFixed(3), entry.consumption.dalVeg.toFixed(2), entry.consumption.oilCond.toFixed(2),
            entry.consumption.salt.toFixed(2), entry.consumption.fuel.toFixed(2), entry.consumption.total.toFixed(2),
            entry.reasonForNoMeal || '-',
        ]);
        totals.present += entry.totalPresent;
        totals.rice += entry.consumption.rice;
        totals.cost += entry.consumption.total;
        totals.dalVeg += entry.consumption.dalVeg;
        totals.oilCond += entry.consumption.oilCond;
        totals.salt += entry.consumption.salt;
        totals.fuel += entry.consumption.fuel;
    });

    const foot = [['Total', '', '', '', totals.present, totals.rice.toFixed(3), totals.dalVeg.toFixed(2), totals.oilCond.toFixed(2), totals.salt.toFixed(2), totals.fuel.toFixed(2), totals.cost.toFixed(2), '']];

    doc.autoTable({
        startY: 30, head: head, body: body, foot: foot,
        theme: 'grid', styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
        headStyles: { fillColor: [245, 158, 11] }, footStyles: { fillColor: [252, 211, 77] },
    });

    addSignatureBlock(doc, settings, doc.lastAutoTable.finalY);
    
    return doc.output('blob');
};

const generateRiceRequirementPDF = (data: AppData, selectedMonth: string): Blob => {
    const doc = new jspdf.jsPDF();
    const { settings } = data;
    const { schoolDetails } = settings;
    const summary = calculateMonthlySummary(data, selectedMonth);
    const workingDays = summary.monthEntries.filter(e => e.totalPresent > 0).length;
    
    const monthDate = new Date(`${selectedMonth}-02`);
    const monthName = monthDate.toLocaleString('default', { month: 'long' });
    const year = monthDate.getFullYear();

    doc.setFontSize(14).setFont(undefined, 'bold');
    doc.text(schoolDetails.name.toUpperCase(), doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('CERTIFICATE', doc.internal.pageSize.getWidth() / 2, 30, { align: 'center', 'charSpace': 1 });
    doc.line(88, 31, 122, 31); // Underline

    const enrollment = settings.classRolls.reduce((sum, c) => sum + c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls, 0);

    const riceByCategory = { balvatika: 0, primary: 0, middle: 0 };
    settings.classRolls.forEach(c => {
        let cat: Category | null = null;
        if (['bal', 'pp1', 'pp2'].includes(c.id)) cat = 'balvatika';
        else if (['c1', 'c2', 'c3', 'c4', 'c5'].includes(c.id)) cat = 'primary';
        else if (['c6', 'c7', 'c8'].includes(c.id)) cat = 'middle';
        if (cat) {
            const classRoll = c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls;
            riceByCategory[cat] += (classRoll * workingDays * settings.rates.rice[cat]) / 1000;
        }
    });
    const totalRiceKg = Object.values(riceByCategory).reduce((sum, val) => sum + val, 0);

    doc.setFontSize(11).setFont(undefined, 'normal');
    const bodyText = `Certified that the total enrollment of students in this school is ${enrollment} for the month of ${monthName}, ${year}. The school remained open for ${workingDays} days during the month. The requirement of rice for the month of ${monthName}, ${year} under PM POSHAN is as under:`;
    doc.text(bodyText, 14, 45, { maxWidth: 180, align: 'justify' });

    doc.autoTable({
        startY: 80,
        head: [['Category', 'Enrollment', 'Working Days', 'Rate (g/day)', 'Total Rice (kg)']],
        body: [
            ['Balvatika', settings.classRolls.filter(c => ['bal', 'pp1', 'pp2'].includes(c.id)).reduce((s, c) => s + c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls, 0), workingDays, settings.rates.rice.balvatika, riceByCategory.balvatika.toFixed(3)],
            ['Primary (I-V)', settings.classRolls.filter(c => ['c1', 'c2', 'c3', 'c4', 'c5'].includes(c.id)).reduce((s, c) => s + c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls, 0), workingDays, settings.rates.rice.primary, riceByCategory.primary.toFixed(3)],
            ['Middle (VI-VIII)', settings.classRolls.filter(c => ['c6', 'c7', 'c8'].includes(c.id)).reduce((s, c) => s + c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls, 0), workingDays, settings.rates.rice.middle, riceByCategory.middle.toFixed(3)],
        ],
        foot: [['Total', enrollment, '', '', totalRiceKg.toFixed(3)]],
        theme: 'grid',
    });

    addSignatureBlock(doc, settings, doc.lastAutoTable.finalY + 20);
    return doc.output('blob');
};

const generateYearlyConsumptionPDF = (data: AppData, financialYear: string): Blob => {
    const doc = new jspdf.jsPDF('l', 'mm', 'a4'); // Landscape
    const { settings } = data;
    const { schoolDetails } = settings;

    const [startYear, endYear] = financialYear.split('-').map(Number);

    doc.setFontSize(14).setFont(undefined, 'bold');
    doc.text(schoolDetails.name.toUpperCase(), doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.setFontSize(11).setFont(undefined, 'normal');
    doc.text(`Yearly Consumption & Fund Report for Financial Year ${financialYear}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

    const head = [['Month', 'Meal Days', 'Students Fed', 'Rice Rcvd (kg)', 'Rice Used (kg)', 'Rice Balance (kg)', 'Cash Rcvd (₹)', 'Cash Used (₹)', 'Cash Balance (₹)']];
    const body: any[][] = [];
    const totals = { mealDays: 0, present: 0, riceRcvd: 0, riceUsed: 0, cashRcvd: 0, cashUsed: 0 };
    
    for (let i = 0; i < 12; i++) {
        const month = (i + 3) % 12 + 1; // April is month 4
        const year = i < 9 ? startYear : endYear;
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const summary = calculateMonthlySummary(data, monthKey);
        
        const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'short' });
        const mealDays = summary.monthEntries.filter(e => e.totalPresent > 0).length;
        const riceReceived = summary.riceAbstracts.balvatika.received + summary.riceAbstracts.primary.received + summary.riceAbstracts.middle.received;
        const cashReceived = summary.cashAbstracts.balvatika.received + summary.cashAbstracts.primary.received + summary.cashAbstracts.middle.received;
        const riceBalance = summary.closingBalance.rice.balvatika + summary.closingBalance.rice.primary + summary.closingBalance.rice.middle;
        const cashBalance = summary.closingBalance.cash.balvatika + summary.closingBalance.cash.primary + summary.closingBalance.cash.middle;
        
        totals.mealDays += mealDays;
        totals.present += summary.totals.present;
        totals.riceRcvd += riceReceived;
        totals.riceUsed += summary.totals.rice;
        totals.cashRcvd += cashReceived;
        totals.cashUsed += summary.totals.expenditure;
        
        body.push([ `${monthName} ${year}`, mealDays, summary.totals.present, riceReceived.toFixed(3), summary.totals.rice.toFixed(3), riceBalance.toFixed(3), cashReceived.toFixed(2), summary.totals.expenditure.toFixed(2), cashBalance.toFixed(2) ]);
    }
    
    const finalMonthKey = `${endYear}-03`;
    const finalSummary = calculateMonthlySummary(data, finalMonthKey);
    const finalRiceBalance = finalSummary.closingBalance.rice.balvatika + finalSummary.closingBalance.rice.primary + finalSummary.closingBalance.rice.middle;
    const finalCashBalance = finalSummary.closingBalance.cash.balvatika + finalSummary.closingBalance.cash.primary + finalSummary.closingBalance.cash.middle;

    const foot = [[ 'Total', totals.mealDays, totals.present, totals.riceRcvd.toFixed(3), totals.riceUsed.toFixed(3), finalRiceBalance.toFixed(3), totals.cashRcvd.toFixed(2), totals.cashUsed.toFixed(2), finalCashBalance.toFixed(2) ]];

    doc.autoTable({
        startY: 30, head: head, body: body, foot: foot,
        theme: 'grid', styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: [245, 158, 11] }, footStyles: { fillColor: [252, 211, 77] },
    });
    
    addSignatureBlock(doc, settings, doc.lastAutoTable.finalY);
    return doc.output('blob');
};


export const generatePDFReport = (
    reportType: string,
    data: AppData,
    monthOrYear: string
): { pdfBlob: Blob; filename: string } => {
    
    let pdfBlob: Blob;
    let filename: string;

    const schoolName = (data.settings.schoolDetails.name || 'School').replace(/[\\/:"*?<>|.\s]+/g, '_');
    const monthDate = new Date(`${monthOrYear}-02`);
    const monthName = monthDate.toLocaleString('default', { month: 'short' });
    const year = monthDate.getFullYear();
    const period = monthOrYear.includes('-') && reportType !== 'yearly_consumption' ? `${monthName}-${year}` : monthOrYear;

    switch (reportType) {
        case 'mdcf':
            pdfBlob = generateMDCF(data, monthOrYear);
            filename = `MDCF_${schoolName}_${period}.pdf`;
            break;
        case 'roll_statement':
            pdfBlob = generateRollStatementPDF(data);
            filename = `Roll_Statement_${schoolName}.pdf`;
            break;
        case 'daily_consumption':
            pdfBlob = generateDailyConsumptionPDF(data, monthOrYear);
            filename = `Daily_Consumption_${schoolName}_${period}.pdf`;
            break;
        case 'rice_requirement':
            pdfBlob = generateRiceRequirementPDF(data, monthOrYear);
            filename = `Rice_Requirement_${schoolName}_${period}.pdf`;
            break;
        case 'yearly_consumption':
            pdfBlob = generateYearlyConsumptionPDF(data, monthOrYear);
            filename = `Yearly_Report_${schoolName}_${period}.pdf`;
            break;
        default:
            throw new Error(`Unknown report type: ${reportType}`);
    }

    return { pdfBlob, filename };
};
