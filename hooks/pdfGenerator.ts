
import { AppData, Category, ClassRoll } from '../types';
import { calculateMonthlySummary } from '../services/summaryCalculator';
import { CLASS_STRUCTURE } from '../constants';

interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
    [key: string]: any;
}

declare const jspdf: any;

const getLocalYYYYMMDD = (date: Date): string => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const calculateSectionTotals = (classes: ClassRoll[]) => {
    return classes.reduce((acc, cr) => {
        acc.general.boys += cr.general.boys;
        acc.general.girls += cr.general.girls;
        acc.stsc.boys += cr.stsc.boys;
        acc.stsc.girls += cr.stsc.girls;
        acc.total.boys += cr.general.boys + cr.stsc.boys;
        acc.total.girls += cr.general.girls + cr.stsc.girls;
        acc.total.onRoll += cr.general.boys + cr.general.girls + cr.stsc.boys + cr.stsc.girls;
        return acc;
    }, {
        general: { boys: 0, girls: 0 },
        stsc: { boys: 0, girls: 0 },
        total: { boys: 0, girls: 0, onRoll: 0 },
    });
};

const generateMDCFReport = (data: AppData, month: string): Blob => {
    const doc = new jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as jsPDF;
    const { settings, entries } = data;
    const { schoolDetails, healthStatus, inspectionReport, cooks } = settings;

    const summary = calculateMonthlySummary(data, month);
    const { riceAbstracts, cashAbstracts, categoryTotals } = summary;

    const monthDate = new Date(`${month}-02T00:00:00`);
    const monthName = monthDate.toLocaleString('default', { month: 'long' });
    const year = monthDate.getFullYear();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Pradhan Mantri Poshan Shakti Nirman (PM POSHAN)', doc.internal.pageSize.getWidth() / 2, 10, { align: 'center' });
    doc.setFontSize(10);
    doc.text('School Monthly Data Capture Format (MDCF)', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.text('Instructions: Keep following registers at the time of filling the form:-', 14, 22);
    doc.text('1) Enrolment Register. 2) Account 3) Bank Account Pass book. 4) Cooking cost details etc.', 14, 26);

    doc.setFont('helvetica', 'bold');
    doc.text('1. School Details', 14, 33);

    const typeCheckbox = (label: string, value: string, currentValue: string) => `${currentValue === value ? '☑' : '☐'} ${label}`;
    const schoolTypeMDCF = settings.schoolDetails.schoolTypeMDCF;
    const schoolCategoryMDCF = settings.schoolDetails.schoolCategoryMDCF;
    const totalEnrollment = settings.classRolls.reduce((sum, c) => sum + c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls, 0);

    const typeContent = ['Government', 'Local Body', 'EGS/AIE Centers', 'NCLP', 'Madras / Maqtab'].map(val => typeCheckbox(val, val, schoolTypeMDCF)).join('  ');
    const categoryContent = ['Primary', 'Upper Primary', 'Primary with Upper Primary'].map(val => typeCheckbox(val, val, schoolCategoryMDCF)).join('   ');

    doc.autoTable({
        startY: 35,
        theme: 'grid',
        body: [
            ['Month-Year', `${monthName} ${year}`, 'UDISE Code', schoolDetails.udise],
            [{ content: 'School Name', styles: { fontStyle: 'bold' } }, { content: schoolDetails.name, colSpan: 3 }],
            [{ content: 'Type', styles: { fontStyle: 'bold', valign: 'middle' } }, { content: typeContent, colSpan: 3 }],
            [{ content: 'Category', styles: { fontStyle: 'bold', valign: 'middle' } }, { content: categoryContent, colSpan: 3 }],
            ['State / UT', schoolDetails.state, 'District', schoolDetails.district],
            ['Block/NP', schoolDetails.block, 'Village/Ward', schoolDetails.village],
            ['Kitchen Type', schoolDetails.kitchenType, 'Total Enrolment', totalEnrollment.toString()],
        ],
        styles: { fontSize: 8 },
        columnStyles: { 0: { cellWidth: 30 }, 2: { cellWidth: 30 } }
    });
    
    let currentY = doc.lastAutoTable.finalY;

    const mealDays = entries.filter(e => e.date.startsWith(month) && e.totalPresent > 0).length;
    const holidays = entries.filter(e => e.date.startsWith(month) && e.totalPresent === 0 && e.reasonForNoMeal?.toLowerCase().includes('holiday')).length;
    const daysInMonth = new Date(year, monthDate.getMonth() + 1, 0).getDate();
    const sundays = Array.from({ length: daysInMonth }, (_, i) => new Date(year, monthDate.getMonth(), i + 1).getDay()).filter(day => day === 0).length;
    const schoolDays = daysInMonth - sundays - holidays;

    doc.setFont('helvetica', 'bold');
    doc.text('2. Meals Availed Status', 14, currentY + 10);
    doc.autoTable({
        startY: currentY + 12, theme: 'grid', head: [['', 'Bal Vatika', 'Primary', 'Upper Primary']],
        body: [
            ['Number of School days during month', { content: schoolDays, colSpan: 3, styles: { halign: 'center' } }],
            ['Actual number of days Mid Day Meal served', { content: mealDays, colSpan: 3, styles: { halign: 'center' } }],
            ['Total Meals served during the month', categoryTotals.present.balvatika, categoryTotals.present.primary, categoryTotals.present.middle],
        ],
        styles: { fontSize: 8 },
    });
    
    currentY = doc.lastAutoTable.finalY;

    const cookHelperExpenditure = cooks.reduce((sum, cook) => sum + cook.amountPaid, 0);
    const totalCashOpening = cashAbstracts.balvatika.opening + cashAbstracts.primary.opening + cashAbstracts.middle.opening;
    const totalCashReceived = cashAbstracts.balvatika.received + cashAbstracts.primary.received + cashAbstracts.middle.received;
    const totalCashExpenditure = (cashAbstracts.balvatika.expenditure || 0) + (cashAbstracts.primary.expenditure || 0) + (cashAbstracts.middle.expenditure || 0) + cookHelperExpenditure + settings.mmeExpenditure;
    const totalCashClosing = cashAbstracts.balvatika.balance + cashAbstracts.primary.balance + cashAbstracts.middle.balance;
    
    doc.setFont('helvetica', 'bold');
    doc.text('3. Fund Details (in Rs.)', 14, currentY + 10);
    doc.autoTable({
        startY: currentY + 12, theme: 'grid', head: [['Component', 'Opening Balance', 'Received during the Month', 'Expenditure during the Month', 'Closing Balance']],
        body: [
            ['Cooking Cost - Bal Vatika', cashAbstracts.balvatika.opening.toFixed(2), cashAbstracts.balvatika.received.toFixed(2), cashAbstracts.balvatika.expenditure?.toFixed(2), cashAbstracts.balvatika.balance.toFixed(2)],
            ['Cooking Cost - Primary', cashAbstracts.primary.opening.toFixed(2), cashAbstracts.primary.received.toFixed(2), cashAbstracts.primary.expenditure?.toFixed(2), cashAbstracts.primary.balance.toFixed(2)],
            ['Cooking Cost - Upper Primary', cashAbstracts.middle.opening.toFixed(2), cashAbstracts.middle.received.toFixed(2), cashAbstracts.middle.expenditure?.toFixed(2), cashAbstracts.middle.balance.toFixed(2)],
            ['Cook Cum Helper', '', '', cookHelperExpenditure.toFixed(2), ''],
            ['School Expenses : MME Expenses', '', '', settings.mmeExpenditure.toFixed(2), ''],
            [{ content: 'Total', styles: { fontStyle: 'bold' } }, totalCashOpening.toFixed(2), totalCashReceived.toFixed(2), totalCashExpenditure.toFixed(2), totalCashClosing.toFixed(2)],
        ],
        styles: { fontSize: 8 },
    });
    currentY = doc.lastAutoTable.finalY;

    const totalRiceOpening = riceAbstracts.balvatika.opening + riceAbstracts.primary.opening + riceAbstracts.middle.opening;
    const totalRiceReceived = riceAbstracts.balvatika.received + riceAbstracts.primary.received + riceAbstracts.middle.received;
    const totalRiceConsumed = (riceAbstracts.balvatika.consumed || 0) + (riceAbstracts.primary.consumed || 0) + (riceAbstracts.middle.consumed || 0);
    const totalRiceBalance = riceAbstracts.balvatika.balance + riceAbstracts.primary.balance + riceAbstracts.middle.balance;

    doc.setFont('helvetica', 'bold');
    doc.text('4. Food Grain Details (in Kg)', 14, currentY + 10);
    doc.autoTable({
        startY: currentY + 12, theme: 'grid', head: [['Item', 'Opening Balance', 'Received during the Month', 'Total', 'Utilized during the Month', 'Closing Balance']],
        body: [
            ['Rice - Bal Vatika', riceAbstracts.balvatika.opening.toFixed(3), riceAbstracts.balvatika.received.toFixed(3), riceAbstracts.balvatika.total.toFixed(3), riceAbstracts.balvatika.consumed?.toFixed(3), riceAbstracts.balvatika.balance.toFixed(3)],
            ['Rice - Primary', riceAbstracts.primary.opening.toFixed(3), riceAbstracts.primary.received.toFixed(3), riceAbstracts.primary.total.toFixed(3), riceAbstracts.primary.consumed?.toFixed(3), riceAbstracts.primary.balance.toFixed(3)],
            ['Rice - Upper Primary', riceAbstracts.middle.opening.toFixed(3), riceAbstracts.middle.received.toFixed(3), riceAbstracts.middle.total.toFixed(3), riceAbstracts.middle.consumed?.toFixed(3), riceAbstracts.middle.balance.toFixed(3)],
            [{ content: 'Total', styles: { fontStyle: 'bold' } }, totalRiceOpening.toFixed(3), totalRiceReceived.toFixed(3), (totalRiceOpening + totalRiceReceived).toFixed(3), totalRiceConsumed.toFixed(3), totalRiceBalance.toFixed(3)],
        ],
        styles: { fontSize: 8 },
    });
    currentY = doc.lastAutoTable.finalY;

    if (currentY > 250) { doc.addPage(); currentY = 15; }

    doc.setFont('helvetica', 'bold');
    doc.text('5. Cook-cum-helper Details', 14, currentY + 10);
    const cookBody = Array.from({ length: 4 }, (_, i) => {
        const cook = cooks[i];
        return [i + 1, cook?.name || '', cook?.gender || '', cook?.category || '', cook ? 'Yes' : 'No', cook?.amountPaid.toFixed(2) || '0.00', cook?.paymentMode || ''];
    });
    doc.autoTable({
        startY: currentY + 12, theme: 'grid', head: [['S.No', 'Name', 'Gender', 'Category', 'Trained in hygiene', 'Honorarium Paid (Rs)', 'Payment Mode']],
        body: cookBody, styles: { fontSize: 8 },
    });
    currentY = doc.lastAutoTable.finalY;
    
    doc.setFont('helvetica', 'bold');
    doc.text('6. Other Details', 14, currentY + 10);
    const inspectedByText = Object.entries(inspectionReport.inspectedBy).filter(([, val]) => val).map(([key]) => key.replace(/([A-Z])/g, ' $1').replace('Smc', 'SMC').trim().replace(/\b\w/g, l => l.toUpperCase())).join(', ') || (inspectionReport.inspected ? 'Not Specified' : 'N/A');
    doc.autoTable({
        startY: currentY + 12, theme: 'grid', body: [
            ['Number of Children given IFA Tablets', `Boys: ${healthStatus.ifaBoys}, Girls: ${healthStatus.ifaGirls}`],
            ['Number of Children screened by RBSK Team', healthStatus.screenedByRBSK],
            ['Number of Children referred by RBSK Team', healthStatus.referredByRBSK],
            ['Was inspection done this month?', inspectionReport.inspected ? 'Yes' : 'No'],
            ['Inspected By', inspectedByText],
            ['Number of untoward incidents reported', inspectionReport.incidentsCount],
        ],
        styles: { fontSize: 8 }, columnStyles: { 0: { cellWidth: 80 } }
    });

    doc.setFontSize(9);
    doc.text('Signature of MDM Incharge', 14, doc.internal.pageSize.getHeight() - 20);
    doc.text('Signature of Head of School', doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
    
    doc.setFontSize(8);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, doc.internal.pageSize.getHeight() - 10);
    doc.text('Created from PM Poshan Track App by Imran Gani Mugloo, Teacher Zone Vailoo', doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });

    return doc.output('blob');
};

const generateRollStatementReport = (data: AppData): Blob => {
    const doc = new jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as jsPDF;
    const { settings } = data;
    const { schoolDetails, classRolls } = settings;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Roll Statement', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(schoolDetails.name, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
    doc.text(`UDISE: ${schoolDetails.udise}`, doc.internal.pageSize.getWidth() / 2, 27, { align: 'center' });

    const classOrder = CLASS_STRUCTURE.reduce((acc, c, index) => ({ ...acc, [c.id]: index }), {} as Record<string, number>);
    const sortFunction = (a: ClassRoll, b: ClassRoll) => (classOrder[a.id] ?? 99) - (classOrder[b.id] ?? 99);
    
    const allRolls = classRolls || [];
    const middleClasses = allRolls.filter(c => ['c6', 'c7', 'c8'].includes(c.id)).sort(sortFunction);
    const primaryClasses = allRolls.filter(c => ['c1', 'c2', 'c3', 'c4', 'c5'].includes(c.id)).sort(sortFunction);
    const prePrimaryClasses = allRolls.filter(c => ['bal', 'pp1', 'pp2'].includes(c.id)).sort(sortFunction);

    const grandTotal = calculateSectionTotals(allRolls);

    const head = [
        [{ content: 'Class', rowSpan: 2 }, { content: 'General', colSpan: 2 }, { content: 'ST/SC', colSpan: 2 }, { content: 'Total', colSpan: 2 }, { content: 'On Roll', rowSpan: 2 }],
        ['Boys', 'Girls', 'Boys', 'Girls', 'Boys', 'Girls']
    ];
    const body: any[] = [];
    const mapClassToRow = (cr: ClassRoll) => {
        const totalBoys = cr.general.boys + cr.stsc.boys;
        const totalGirls = cr.general.girls + cr.stsc.girls;
        return [cr.name, cr.general.boys, cr.general.girls, cr.stsc.boys, cr.stsc.girls, totalBoys, totalGirls, totalBoys + totalGirls];
    };
    const mapTotalToRow = (label: string, totals: ReturnType<typeof calculateSectionTotals>) => ({
        content: [label, totals.general.boys, totals.general.girls, totals.stsc.boys, totals.stsc.girls, totals.total.boys, totals.total.girls, totals.total.onRoll],
        styles: { fontStyle: 'bold', fillColor: [251, 243, 219] }
    });

    if (middleClasses.length > 0) {
        middleClasses.forEach(c => body.push(mapClassToRow(c)));
        body.push(mapTotalToRow('Middle Total', calculateSectionTotals(middleClasses)));
    }
    if (primaryClasses.length > 0) {
        primaryClasses.forEach(c => body.push(mapClassToRow(c)));
        body.push(mapTotalToRow('Primary Total', calculateSectionTotals(primaryClasses)));
    }
    if (prePrimaryClasses.length > 0) {
        prePrimaryClasses.forEach(c => body.push(mapClassToRow(c)));
        body.push(mapTotalToRow('Pre-Primary Total', calculateSectionTotals(prePrimaryClasses)));
    }

    doc.autoTable({
        startY: 35,
        head: head,
        body: body,
        foot: [[ { content: 'Grand Total', styles: { fontStyle: 'bold', fillColor: [252, 211, 77] } }, { content: grandTotal.general.boys, styles: { fontStyle: 'bold', fillColor: [252, 211, 77] } }, { content: grandTotal.general.girls, styles: { fontStyle: 'bold', fillColor: [252, 211, 77] } }, { content: grandTotal.stsc.boys, styles: { fontStyle: 'bold', fillColor: [252, 211, 77] } }, { content: grandTotal.stsc.girls, styles: { fontStyle: 'bold', fillColor: [252, 211, 77] } }, { content: grandTotal.total.boys, styles: { fontStyle: 'bold', fillColor: [252, 211, 77] } }, { content: grandTotal.total.girls, styles: { fontStyle: 'bold', fillColor: [252, 211, 77] } }, { content: grandTotal.total.onRoll, styles: { fontStyle: 'bold', fillColor: [252, 211, 77] } }, ]],
        theme: 'grid',
        styles: { fontSize: 8, halign: 'center', valign: 'middle' },
        headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] }
    });
    
    doc.setFontSize(8);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, doc.internal.pageSize.getHeight() - 10);
    doc.text('Created from PM Poshan Track App by Imran Gani Mugloo, Teacher Zone Vailoo', doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });

    return doc.output('blob');
};

const generateDailyConsumptionReport = (data: AppData, month: string): Blob => {
    const doc = new jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as jsPDF;
    const { settings, entries } = data;
    const monthEntries = entries.filter(e => e.date.startsWith(month));
    const monthDate = new Date(`${month}-02T00:00:00`);
    const monthName = monthDate.toLocaleString('default', { month: 'long' });
    const year = monthDate.getFullYear();

    const categories: Category[] = ['balvatika', 'primary', 'middle'];
    const onRoll = categories.reduce((acc, cat) => ({...acc, [cat]: 0}), {} as Record<Category, number>);
    settings.classRolls.forEach(c => {
        const total = c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls;
        if (['bal', 'pp1', 'pp2'].includes(c.id)) onRoll.balvatika += total;
        else if (['c1', 'c2', 'c3', 'c4', 'c5'].includes(c.id)) onRoll.primary += total;
        else if (['c6', 'c7', 'c8'].includes(c.id)) onRoll.middle += total;
    });

    let isFirstPage = true;
    categories.forEach(category => {
        if (onRoll[category] === 0) return;

        if (!isFirstPage) doc.addPage();
        isFirstPage = false;

        doc.setFontSize(14); doc.setFont('helvetica', 'bold');
        doc.text('Daily Consumption Register', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Month: ${monthName} ${year}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
        doc.text(`Category: ${category.charAt(0).toUpperCase() + category.slice(1)}`, doc.internal.pageSize.getWidth() / 2, 27, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text(settings.schoolDetails.name, 14, 20);
        doc.text(`UDISE: ${settings.schoolDetails.udise}`, 14, 25);
        doc.text(`On Roll: ${onRoll[category]}`, doc.internal.pageSize.getWidth() - 14, 20, { align: 'right' });

        const rates = settings.rates;
        const rateHeaders = [`Rice: ${rates.rice[category]}g`, `Dal/Veg: Rs ${rates.dalVeg[category].toFixed(2)}`, `Oil/Cond: Rs ${rates.oilCond[category].toFixed(2)}`, `Salt: Rs ${rates.salt[category].toFixed(2)}`, `Fuel: Rs ${rates.fuel[category].toFixed(2)}`];
        doc.setFontSize(8);
        doc.text(rateHeaders.join(' | '), doc.internal.pageSize.getWidth() / 2, 34, { align: 'center' });

        const head = [['Date', 'Present', 'Rice (kg)', 'Dal/Veg (Rs)', 'Oil/Cond (Rs)', 'Salt (Rs)', 'Fuel (Rs)', 'Total (Rs)', 'Reason for No Meal']];
        const body = [];
        const daysInMonth = new Date(year, monthDate.getMonth() + 1, 0).getDate();
        const totals = { present: 0, rice: 0, dalVeg: 0, oilCond: 0, salt: 0, fuel: 0, cost: 0 };

        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, monthDate.getMonth(), i);
            const dateString = getLocalYYYYMMDD(date);
            const entry = monthEntries.find(e => e.id === dateString);
            
            const present = entry?.present[category] || 0;
            const dailyRice = (present * rates.rice[category]) / 1000;
            const dailyDalVeg = present * rates.dalVeg[category];
            const dailyOilCond = present * rates.oilCond[category];
            const dailySalt = present * rates.salt[category];
            const dailyFuel = present * rates.fuel[category];
            
            totals.present += present; totals.rice += dailyRice; totals.dalVeg += dailyDalVeg;
            totals.oilCond += dailyOilCond; totals.salt += dailySalt; totals.fuel += dailyFuel;
            totals.cost += dailyDalVeg + dailyOilCond + dailySalt + dailyFuel;

            body.push([i, present, dailyRice.toFixed(3), dailyDalVeg.toFixed(2), dailyOilCond.toFixed(2), dailySalt.toFixed(2), dailyFuel.toFixed(2), (dailyDalVeg + dailyOilCond + dailySalt + dailyFuel).toFixed(2), entry?.reasonForNoMeal || '']);
        }
        
        const foot = [['Total', totals.present, totals.rice.toFixed(3), totals.dalVeg.toFixed(2), totals.oilCond.toFixed(2), totals.salt.toFixed(2), totals.fuel.toFixed(2), totals.cost.toFixed(2), '']];
        
        doc.autoTable({
            startY: 40, head, body, foot, theme: 'grid', styles: { fontSize: 7 },
            headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255] },
            footStyles: { fillColor: [252, 211, 77] },
            columnStyles: { 8: { cellWidth: 40 } }
        });
        
        doc.setFontSize(8);
        doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, doc.internal.pageSize.getHeight() - 10);
        doc.text('Created from PM Poshan Track App by Imran Gani Mugloo, Teacher Zone Vailoo', doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
    });

    return doc.output('blob');
};

export const generatePDFReport = (reportType: string, data: AppData, selectedMonth: string): { pdfBlob: Blob; filename: string } => {
    let pdfBlob: Blob;
    let filename: string;
    const schoolName = data.settings.schoolDetails.name.replace(/\s+/g, '_');
    const monthFormatted = selectedMonth.replace('-', '_');

    try {
        switch (reportType) {
            case 'roll_statement':
                pdfBlob = generateRollStatementReport(data);
                filename = `Roll_Statement_${schoolName}.pdf`;
                break;
            case 'daily_consumption':
                pdfBlob = generateDailyConsumptionReport(data, selectedMonth);
                filename = `Daily_Consumption_${schoolName}_${monthFormatted}.pdf`;
                break;
            case 'mdcf':
                pdfBlob = generateMDCFReport(data, selectedMonth);
                filename = `MDCF_Report_${schoolName}_${monthFormatted}.pdf`;
                break;
            default:
                throw new Error('Unknown report type');
        }
        return { pdfBlob, filename };
    } catch (error) {
        console.error("Error generating PDF:", error);
        throw new Error("Failed to generate PDF. Check console for details.");
    }
};
