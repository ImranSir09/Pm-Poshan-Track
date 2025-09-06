import { AppData, Category, ClassRoll } from '../types';
import { calculateMonthlySummary } from '../services/summaryCalculator';

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
    doc.text(`(${settings.mdmIncharge?.name || 'Name'})`, leftPos, y + 4, { align: 'center' });
    doc.setFont(undefined, 'bold');
    doc.text('MDM Incharge', leftPos, y + 8, { align: 'center' });

    // Head of Institution Signature (Right)
    doc.setFont(undefined, 'normal');
    doc.text('.........................................', rightPos, y, { align: 'center' });
    doc.text(`(${settings.headOfInstitution?.name || 'Name'})`, rightPos, y + 4, { align: 'center' });
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
    
    const calculateSectionTotals = (classes: ClassRoll[]) => {
        return classes.reduce((acc, cr) => {
            acc.genB += cr.general.boys;
            acc.genG += cr.general.girls;
            acc.stscB += cr.stsc.boys;
            acc.stscG += cr.stsc.girls;
            const totalBoys = cr.general.boys + cr.stsc.boys;
            const totalGirls = cr.general.girls + cr.stsc.girls;
            acc.totalB += totalBoys;
            acc.totalG += totalGirls;
            acc.onRoll += totalBoys + totalGirls;
            return acc;
        }, { genB: 0, genG: 0, stscB: 0, stscG: 0, totalB: 0, totalG: 0, onRoll: 0 });
    };
    
    const sections = [
        { title: 'Middle (VI-VIII)', ids: ['c8', 'c7', 'c6'] },
        { title: 'Primary (I-V)', ids: ['c5', 'c4', 'c3', 'c2', 'c1'] },
        { title: 'Pre-Primary', ids: ['bal', 'pp1', 'pp2'] },
    ];

    sections.forEach(section => {
        const sectionClasses = (settings.classRolls || []).filter(cr => section.ids.includes(cr.id));
        if (sectionClasses.length > 0) {
            body.push([{ content: section.title, colSpan: 8, styles: { fontStyle: 'bold', fillColor: [254, 243, 199] } }]);
            
            sectionClasses.forEach(cr => {
                const totalBoys = cr.general.boys + cr.stsc.boys;
                const totalGirls = cr.general.girls + cr.stsc.girls;
                const onRoll = totalBoys + totalGirls;
                body.push([cr.name, cr.general.boys, cr.general.girls, cr.stsc.boys, cr.stsc.girls, totalBoys, totalGirls, onRoll]);
            });

            const sectionTotals = calculateSectionTotals(sectionClasses);
            body.push([
                { content: `${section.title.split(' ')[0]} Total`, styles: { fontStyle: 'bold' } },
                { content: sectionTotals.genB, styles: { fontStyle: 'bold' } },
                { content: sectionTotals.genG, styles: { fontStyle: 'bold' } },
                { content: sectionTotals.stscB, styles: { fontStyle: 'bold' } },
                { content: sectionTotals.stscG, styles: { fontStyle: 'bold' } },
                { content: sectionTotals.totalB, styles: { fontStyle: 'bold' } },
                { content: sectionTotals.totalG, styles: { fontStyle: 'bold' } },
                { content: sectionTotals.onRoll, styles: { fontStyle: 'bold', fillColor: [252, 211, 77] } },
            ]);
            
            grandTotal.genB += sectionTotals.genB;
            grandTotal.genG += sectionTotals.genG;
            grandTotal.stscB += sectionTotals.stscB;
            grandTotal.stscG += sectionTotals.stscG;
            grandTotal.totalB += sectionTotals.totalB;
            grandTotal.totalG += sectionTotals.totalG;
            grandTotal.onRoll += sectionTotals.onRoll;
        }
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
    const { schoolDetails, rates } = settings;
    const summaryData = calculateMonthlySummary(data, selectedMonth);
    const { monthEntries, riceAbstracts, cashAbstracts } = summaryData;
    
    const monthDate = new Date(`${selectedMonth}-02`);
    const monthName = monthDate.toLocaleString('default', { month: 'long' });
    const year = monthDate.getFullYear();
    const categories: Category[] = ['balvatika', 'primary', 'middle'];

    const onRollTotals: Record<Category, number> = { balvatika: 0, primary: 0, middle: 0 };
    settings.classRolls.forEach(c => {
        const classTotal = c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls;
        if (['bal', 'pp1', 'pp2'].includes(c.id)) onRollTotals.balvatika += classTotal;
        else if (['c1', 'c2', 'c3', 'c4', 'c5'].includes(c.id)) onRollTotals.primary += classTotal;
        else if (['c6', 'c7', 'c8'].includes(c.id)) onRollTotals.middle += classTotal;
    });

    categories.forEach((category, index) => {
        const categoryOnRoll = onRollTotals[category];
        if (categoryOnRoll === 0) return; // Skip category if no students are enrolled

        if (index > 0) {
            doc.addPage();
        }

        const categoryName = category.charAt(0).toUpperCase() + category.slice(1);

        doc.setFontSize(14).setFont(undefined, 'bold');
        doc.text(schoolDetails.name, doc.internal.pageSize.getWidth() / 2, 10, { align: 'center' });
        doc.setFontSize(11).setFont(undefined, 'normal');
        doc.text(`Daily Consumption Register for ${categoryName} - ${monthName} ${year}`, doc.internal.pageSize.getWidth() / 2, 16, { align: 'center' });
        
        const head = [['S.No', 'Date', 'Roll', 'Present', 'Rice (kg)', 'Dal/Veg (Rs)', 'Oil/Cond (Rs)', 'Salt (Rs)', 'Fuel (Rs)', 'Total (Rs)', 'Reason']];
        const body: any[][] = [];
        const totals = { present: 0, riceUsed: 0, dalVeg: 0, oilCond: 0, salt: 0, fuel: 0, totalCost: 0 };

        monthEntries.forEach((entry, entryIndex) => {
            const present = entry.present[category];
            const mealServed = present > 0;
            
            if (mealServed) {
                const riceUsed = (present * rates.rice[category]) / 1000;
                const dalVeg = present * rates.dalVeg[category];
                const oilCond = present * rates.oilCond[category];
                const salt = present * rates.salt[category];
                const fuel = present * rates.fuel[category];
                const totalCost = dalVeg + oilCond + salt + fuel;

                totals.present += present;
                totals.riceUsed += riceUsed;
                totals.dalVeg += dalVeg;
                totals.oilCond += oilCond;
                totals.salt += salt;
                totals.fuel += fuel;
                totals.totalCost += totalCost;

                body.push([
                    entryIndex + 1,
                    new Date(entry.date + 'T00:00:00').toLocaleDateString('en-IN'),
                    categoryOnRoll,
                    present,
                    riceUsed.toFixed(3),
                    dalVeg.toFixed(2),
                    oilCond.toFixed(2),
                    salt.toFixed(2),
                    fuel.toFixed(2),
                    totalCost.toFixed(2),
                    '-'
                ]);
            } else {
                 body.push([
                    { content: `${new Date(entry.date + 'T00:00:00').toLocaleDateString('en-IN')} - ${entry.reasonForNoMeal || 'No Meal Served'}`, colSpan: 11, styles: { halign: 'center', fontStyle: 'italic', textColor: [255, 0, 0] } }
                ]);
            }
        });

        const foot = [[ 'Total', '', '', totals.present, totals.riceUsed.toFixed(3), totals.dalVeg.toFixed(2), totals.oilCond.toFixed(2), totals.salt.toFixed(2), totals.fuel.toFixed(2), totals.totalCost.toFixed(2), '' ]];

        doc.autoTable({
            startY: 22,
            head: head,
            body: body,
            foot: foot,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
            headStyles: { fillColor: [245, 158, 11] },
            footStyles: { fillColor: [252, 211, 77] },
        });

        const mainTableFinalY = doc.lastAutoTable.finalY;
        let abstractStartY = mainTableFinalY + 5;
        
        if (abstractStartY > doc.internal.pageSize.getHeight() - 50) {
            doc.addPage();
            abstractStartY = 20;
        }

        const riceCatAbstract = riceAbstracts[category];
        const cashCatAbstract = cashAbstracts[category];
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const tableWidth = (pageWidth / 2) - 18;
        
        doc.autoTable({
            startY: abstractStartY,
            head: [['Rice Abstract (kg)', 'Amount']],
            body: [
                ['Opening', riceCatAbstract.opening.toFixed(3)],
                ['Received', riceCatAbstract.received.toFixed(3)],
                ['Total', riceCatAbstract.total.toFixed(3)],
                ['Consumed', riceCatAbstract.consumed.toFixed(3)],
                ['Balance', { content: riceCatAbstract.balance.toFixed(3), styles: { fontStyle: 'bold' } }],
            ],
            theme: 'grid',
            tableWidth: tableWidth,
            margin: { left: 14 },
            styles: { fontSize: 8, cellPadding: 1.5, halign: 'right' },
            headStyles: { halign: 'center', fillColor: [254, 249, 195] },
            columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
        });

        doc.autoTable({
            startY: abstractStartY,
            head: [['Cash Abstract (Rs)', 'Amount']],
            body: [
                ['Opening', cashCatAbstract.opening.toFixed(2)],
                ['Received', cashCatAbstract.received.toFixed(2)],
                ['Total', cashCatAbstract.total.toFixed(2)],
                ['Expenditure', cashCatAbstract.expenditure.toFixed(2)],
                ['Balance', { content: cashCatAbstract.balance.toFixed(2), styles: { fontStyle: 'bold' } }],
            ],
            theme: 'grid',
            tableWidth: tableWidth,
            margin: { left: pageWidth / 2 + 4 },
            styles: { fontSize: 8, cellPadding: 1.5, halign: 'right' },
            headStyles: { halign: 'center', fillColor: [254, 249, 195] },
            columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
        });
        
        const abstractTablesFinalY = doc.lastAutoTable.finalY;
        addSignatureBlock(doc, settings, abstractTablesFinalY);
    });
    
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

const generateYearlyConsumptionDetailedPDF = (data: AppData, financialYear: string): Blob => {
    const doc = new jspdf.jsPDF('l', 'mm', 'a4'); // Landscape
    const { settings, receipts } = data;
    const { schoolDetails } = settings;

    const [startYear, endYear] = financialYear.split('-').map(Number);

    doc.setFontSize(14).setFont(undefined, 'bold');
    doc.text(schoolDetails.name.toUpperCase(), doc.internal.pageSize.getWidth() / 2, 12, { align: 'center' });
    doc.setFontSize(11).setFont(undefined, 'normal');
    doc.text(`Detailed Yearly Consumption & Fund Report for Financial Year ${financialYear}`, doc.internal.pageSize.getWidth() / 2, 18, { align: 'center' });

    const formatNum = (num: number, decimals: number) => num.toFixed(decimals);

    const head = [[
        { content: 'Month-Year', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Category', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Meal\nDays', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Students\nFed', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Rice (kg)', colSpan: 3, styles: { halign: 'center' } },
        { content: 'Cash (₹)', colSpan: 3, styles: { halign: 'center' } },
    ], [
        'Received', 'Used', 'Balance',
        'Received', 'Used', 'Balance',
    ]];
    
    const body: any[][] = [];
    const grandTotals = { mealDays: 0, present: 0, riceRcvd: 0, riceUsed: 0, cashRcvd: 0, cashUsed: 0 };
    const categories: Category[] = ['balvatika', 'primary', 'middle'];
    
    for (let i = 0; i < 12; i++) {
        const month = (i + 3) % 12 + 1; // April is month 4
        const year = i < 9 ? startYear : endYear;
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        
        const summary = calculateMonthlySummary(data, monthKey);
        const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'short', year: 'numeric' });

        const receiptsForThisMonth = receipts
            .filter(r => r.date.startsWith(monthKey))
            .reduce((acc, r) => {
                categories.forEach(cat => {
                    acc.rice[cat] += r.rice[cat];
                    acc.cash[cat] += r.cash[cat];
                });
                return acc;
            }, {
                rice: { balvatika: 0, primary: 0, middle: 0 },
                cash: { balvatika: 0, primary: 0, middle: 0 },
            });

        const monthTotals = { present: 0, riceRcvd: 0, riceUsed: 0, cashRcvd: 0, cashUsed: 0 };
        
        categories.forEach((cat, catIndex) => {
            const mealDays = summary.monthEntries.filter(e => e.present[cat] > 0).length;
            const present = summary.categoryTotals.present[cat];
            const riceRcvd = receiptsForThisMonth.rice[cat];
            const riceUsed = summary.categoryTotals.rice[cat];
            const riceBal = summary.closingBalance.rice[cat];
            const cashRcvd = receiptsForThisMonth.cash[cat];
            const cashUsed = summary.categoryTotals.expenditure[cat];
            const cashBal = summary.closingBalance.cash[cat];

            monthTotals.present += present;
            monthTotals.riceRcvd += riceRcvd;
            monthTotals.riceUsed += riceUsed;
            monthTotals.cashRcvd += cashRcvd;
            monthTotals.cashUsed += cashUsed;
            
            const rowContent = [
                cat.charAt(0).toUpperCase() + cat.slice(1),
                mealDays, present,
                formatNum(riceRcvd, 3), formatNum(riceUsed, 3), formatNum(riceBal, 3),
                formatNum(cashRcvd, 2), formatNum(cashUsed, 2), formatNum(cashBal, 2),
            ];

            if (catIndex === 0) {
                 body.push([
                    { content: monthName, rowSpan: 3, styles: { valign: 'middle', halign: 'center' } },
                    ...rowContent
                ]);
            } else {
                body.push(rowContent);
            }
        });
        
        const totalMonthMealDays = summary.monthEntries.filter(e => e.totalPresent > 0).length;

        grandTotals.mealDays += totalMonthMealDays; // Note: This could over-count if categories have different meal days. A distinct count of dates might be better. For now, using the overall count.
        grandTotals.present += monthTotals.present;
        grandTotals.riceRcvd += monthTotals.riceRcvd;
        grandTotals.riceUsed += monthTotals.riceUsed;
        grandTotals.cashRcvd += monthTotals.cashRcvd;
        grandTotals.cashUsed += monthTotals.cashUsed;
    }
    
    const finalMonthKey = `${endYear}-03`;
    const finalSummary = calculateMonthlySummary(data, finalMonthKey);
    const finalRiceBalance = finalSummary.closingBalance.rice.balvatika + finalSummary.closingBalance.rice.primary + finalSummary.closingBalance.rice.middle;
    const finalCashBalance = finalSummary.closingBalance.cash.balvatika + finalSummary.closingBalance.cash.primary + finalSummary.closingBalance.cash.middle;
    
    // Calculate total meal days based on unique days across the year for accuracy
    const allMealDays = new Set<string>();
    for (let i = 0; i < 12; i++) {
        const month = (i + 3) % 12 + 1;
        const year = i < 9 ? startYear : endYear;
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        data.entries
            .filter(e => e.date.startsWith(monthKey) && e.totalPresent > 0)
            .forEach(e => allMealDays.add(e.id));
    }


    const foot = [[
        { content: 'Grand Total', colSpan: 2, styles: { halign: 'right' } },
        allMealDays.size, grandTotals.present,
        formatNum(grandTotals.riceRcvd, 3), formatNum(grandTotals.riceUsed, 3), formatNum(finalRiceBalance, 3),
        formatNum(grandTotals.cashRcvd, 2), formatNum(grandTotals.cashUsed, 2), formatNum(finalCashBalance, 2),
    ]];

    doc.autoTable({
        startY: 22, head, body, foot, theme: 'grid',
        styles: { fontSize: 7, cellPadding: 1, halign: 'right' },
        headStyles: { fillColor: [245, 158, 11], halign: 'center' },
        footStyles: { fillColor: [252, 211, 77], fontStyle: 'bold' },
        columnStyles: { 0: { halign: 'left' }, 1: { halign: 'left' } },
    });
    
    const finalY = doc.lastAutoTable.finalY;
    const pageHeight = doc.internal.pageSize.getHeight();
    let certificateY = finalY + 15;
    if (certificateY > pageHeight - 40) {
        doc.addPage();
        certificateY = 20;
    }

    doc.setFontSize(10).setFont(undefined, 'normal');
    const certificateText = `This is to certify that the information provided in this report for the financial year ${financialYear} is true and correct to the best of my knowledge, based on the records maintained at the school.`;
    doc.text(certificateText, 14, certificateY, { maxWidth: doc.internal.pageSize.getWidth() - 28, align: 'justify' });

    addSignatureBlock(doc, settings, certificateY + 10);
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
    const period = monthOrYear.includes('-') && !['yearly_consumption_detailed'].includes(reportType) 
        ? new Date(`${monthOrYear}-02`).toLocaleString('default', { month: 'short', year: 'numeric' }).replace(' ', '-')
        : monthOrYear;

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
        case 'yearly_consumption_detailed':
            pdfBlob = generateYearlyConsumptionDetailedPDF(data, monthOrYear);
            filename = `Yearly_Report_Detailed_${schoolName}_${period}.pdf`;
            break;
        default:
            throw new Error(`Unknown report type: ${reportType}`);
    }

    return { pdfBlob, filename };
};