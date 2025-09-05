
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
        startY: doc.lastAutoTable.finalY + 8,
        head: [['S.No.', 'Cook Name', 'Gender', 'Category', 'Payment Mode', 'Amount Paid (In Rs.)']],
        body: settings.cooks.map((cook, i) => [
            i + 1, cook.name, cook.gender.charAt(0), cook.category, cook.paymentMode, cook.amountPaid.toFixed(2)
        ]),
        theme: 'grid', styles: { fontSize: 8, cellPadding: 1.5 },
        columnStyles: { 5: { cellWidth: 35 } } 
    });

    doc.addPage();

    // ======== 5. Food Grains Details (in KG.) ========
    doc.setFontSize(10).setFont(undefined, 'bold');
    doc.text('5. Food Grains Details (in KG.)', 14, 15);
    doc.autoTable({
        startY: 20,
        head: [['Category', 'Food Item', 'Opening Balance', 'Received', 'Consumption', 'Closing Balance']],
        body: [
            ['Balvatika', 'Rice', riceAbstracts.balvatika.opening.toFixed(3), riceAbstracts.balvatika.received.toFixed(3), riceAbstracts.balvatika.consumed.toFixed(3), riceAbstracts.balvatika.balance.toFixed(3)],
            ['Primary', 'Rice', riceAbstracts.primary.opening.toFixed(3), riceAbstracts.primary.received.toFixed(3), riceAbstracts.primary.consumed.toFixed(3), riceAbstracts.primary.balance.toFixed(3)],
            ['Middle', 'Rice', riceAbstracts.middle.opening.toFixed(3), riceAbstracts.middle.received.toFixed(3), riceAbstracts.middle.consumed.toFixed(3), riceAbstracts.middle.balance.toFixed(3)],
        ],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.5 },
        columnStyles: { 2: { cellWidth: 25 }, 3: { cellWidth: 25 }, 4: { cellWidth: 25 }, 5: { cellWidth: 25 } }
    });

    // ======== 6. Children Health Status ========
    doc.setFontSize(10).setFont(undefined, 'bold');
    doc.text('6. Children Health Status', 14, doc.lastAutoTable.finalY + 6);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 8,
        body: [
            ['No. of children from class 1 to 8 who had received 4 IFA tablets (Boys)', settings.healthStatus.ifaBoys],
            ['No. of children from class 1 to 8 who had received 4 IFA tablets (Girls)', settings.healthStatus.ifaGirls],
            ['No. of children screened by mobile health (RBSK) team', settings.healthStatus.screenedByRBSK],
            ['No. of children referred by mobile health (RBSK) team', settings.healthStatus.referredByRBSK],
        ],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.5 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { halign: 'center' } }
    });

    // ======== 7. School Inspection ========
    doc.setFontSize(10).setFont(undefined, 'bold');
    doc.text('7. School Inspection', 14, doc.lastAutoTable.finalY + 6);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 8,
        body: [['School Inspection done during the month', 'Yes', 'No']],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.5, valign: 'middle' },
        columnStyles: { 0: { cellWidth: 130 }, 1: { halign: 'center' }, 2: { halign: 'center' } },
        didDrawCell: (data: any) => {
            if (data.row.index === 0 && data.column.index > 0) {
                doc.rect(data.cell.x + 10, data.cell.y + 2, 3, 3);
                if ((data.column.index === 1 && settings.inspectionReport.inspected) || (data.column.index === 2 && !settings.inspectionReport.inspected)) {
                     doc.text('X', data.cell.x + 10.8, data.cell.y + 4.5);
                }
            }
        }
    });

    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 4,
        body: [['Number of Untoward Incidents Occurred', settings.inspectionReport.incidentsCount]],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 1.5 },
        columnStyles: { 0: { cellWidth: 80 }, 1: { halign: 'center' } }
    });

    // ======== Signatures ========
    addSignatureBlock(doc, settings, doc.lastAutoTable.finalY);

    return doc.output('blob');
};

const generateConsumptionRegister = (data: AppData, selectedMonth: string): Blob => {
    const { settings } = data;
    const { schoolDetails, rates } = settings;
    const summary = calculateMonthlySummary(data, selectedMonth);
    const { monthEntries, riceAbstracts, cashAbstracts } = summary;
    
    const doc = new jspdf.jsPDF({ orientation: 'portrait' });
    let isFirstCategoryPage = true;
    
    const categories: Category[] = ['balvatika', 'primary', 'middle'];
    
    const onRoll = categories.reduce((acc, cat) => {
        acc[cat] = settings.classRolls.filter(c => {
             if (['bal', 'pp1', 'pp2'].includes(c.id)) return cat === 'balvatika';
             if (['c1', 'c2', 'c3', 'c4', 'c5'].includes(c.id)) return cat === 'primary';
             if (['c6', 'c7', 'c8'].includes(c.id)) return cat === 'middle';
             return false;
        }).reduce((sum, c) => sum + c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls, 0);
        return acc;
    }, {} as Record<Category, number>);

    categories.forEach(category => {
        const hasStudentsOnRoll = onRoll[category] > 0;
        const hasActivity = monthEntries.some(e => e.present[category] > 0);
        
        if (!hasStudentsOnRoll || !hasActivity) return;

        if (!isFirstCategoryPage) {
            doc.addPage();
        }
        isFirstCategoryPage = false;
        
        const catName = category.charAt(0).toUpperCase() + category.slice(1);
        const monthDate = new Date(`${selectedMonth}-02`);
        const monthName = monthDate.toLocaleString('default', { month: 'long' });
        const year = monthDate.getFullYear();

        doc.setFontSize(14).setFont(undefined, 'bold');
        doc.text(schoolDetails.name, doc.internal.pageSize.getWidth() / 2, 10, { align: 'center' });
        doc.setFontSize(12).setFont(undefined, 'normal');
        doc.text('Daily Consumption Register of Mid-day Meals', doc.internal.pageSize.getWidth() / 2, 16, { align: 'center' });
        
        doc.autoTable({
            startY: 18,
            body: [[`Month: ${monthName}, ${year}`, `Department: ${catName}`]],
            theme: 'plain',
            styles: { fontSize: 10, cellPadding: 1 },
            columnStyles: { 0: { halign: 'left' }, 1: { halign: 'right' } }
        });

        const totalRate = rates.dalVeg[category] + rates.oilCond[category] + rates.salt[category] + rates.fuel[category];
        const head = [
            ['S.No', 'Date', 'Roll', 'Present', 'Rice Used\n(Kg)', 'Dal/Veg\n(Rs)', 'Oil/Cond\n(Rs)', 'Salt\n(Rs)', 'Fuel\n(Rs)', 'Total\n(Rs)', 'Sign', 'Reason for\nNo Meal'],
            [
                 { content: `Rates/Student ->`, colSpan: 4, styles: { halign: 'right', fontStyle: 'italic', cellPadding: 1 } },
                 `@ ${(rates.rice[category] / 1000).toFixed(3)}`, 
                 `@ ${rates.dalVeg[category].toFixed(2)}`, 
                 `@ ${rates.oilCond[category].toFixed(2)}`, 
                 `@ ${rates.salt[category].toFixed(2)}`, 
                 `@ ${rates.fuel[category].toFixed(2)}`, 
                 `@ ${totalRate.toFixed(2)}`,
                 '', ''
            ]
        ];

        const body = monthEntries.map((entry, index) => {
            const date = new Date(entry.date + 'T00:00:00');
            const isSunday = date.getDay() === 0;

            if (entry.totalPresent === 0 || isSunday) {
                const reason = entry.reasonForNoMeal || (isSunday ? 'Sunday' : 'No Meal Served');
                return [{ content: `${new Date(entry.date).toLocaleDateString('en-IN')} - ${reason}`, colSpan: 12, styles: { halign: 'center', fillColor: [255, 230, 230] } }];
            }

            const present = entry.present[category];
            const riceUsed = (present * rates.rice[category]) / 1000;
            const dalVeg = present * rates.dalVeg[category];
            const oilCond = present * rates.oilCond[category];
            const salt = present * rates.salt[category];
            const fuel = present * rates.fuel[category];
            const total = dalVeg + oilCond + salt + fuel;

            return [
                index + 1,
                new Date(entry.date).toLocaleDateString('en-IN'),
                onRoll[category],
                present,
                riceUsed.toFixed(3),
                dalVeg.toFixed(2),
                oilCond.toFixed(2),
                salt.toFixed(2),
                fuel.toFixed(2),
                total.toFixed(2),
                '', ''
            ];
        });

        const totals = monthEntries.reduce((acc, entry) => {
            if (entry.totalPresent > 0) {
                const present = entry.present[category];
                acc.present += present;
                acc.rice += (present * rates.rice[category]) / 1000;
                acc.dalVeg += present * rates.dalVeg[category];
                acc.oilCond += present * rates.oilCond[category];
                acc.salt += present * rates.salt[category];
                acc.fuel += present * rates.fuel[category];
                acc.total += acc.dalVeg + acc.oilCond + acc.salt + acc.fuel;
            }
            return acc;
        }, { present: 0, rice: 0, dalVeg: 0, oilCond: 0, salt: 0, fuel: 0, total: 0 });

        const foot = [[
            { content: 'Total', colSpan: 3, styles: { halign: 'right' } },
            totals.present,
            totals.rice.toFixed(3),
            totals.dalVeg.toFixed(2),
            totals.oilCond.toFixed(2),
            totals.salt.toFixed(2),
            totals.fuel.toFixed(2),
            (totals.dalVeg + totals.oilCond + totals.salt + totals.fuel).toFixed(2),
            '', ''
        ]];

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 1,
            head: head,
            body: body,
            foot: foot,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 1, halign: 'center' },
            headStyles: { fontStyle: 'bold', fillColor: [230, 230, 230], textColor: 0, lineWidth: 0.1, fontSize: 7 },
            footStyles: { fontStyle: 'bold', fillColor: [230, 230, 230], textColor: 0, lineWidth: 0.1 },
            columnStyles: {
                0: { cellWidth: 7 },    // S.No
                1: { cellWidth: 15 },   // Date
                2: { cellWidth: 10 },   // Roll
                3: { cellWidth: 10 },   // Present
                4: { cellWidth: 14 },   // Rice
                5: { cellWidth: 13 },   // Dal/Veg
                6: { cellWidth: 13 },   // Oil/Cond
                7: { cellWidth: 13 },   // Salt
                8: { cellWidth: 13 },   // Fuel
                9: { cellWidth: 14 },   // Total
                10: { cellWidth: 10 },  // Sign
                11: { cellWidth: 30, halign: 'left' } // Reason
            }
        });

        const mainTableFinalY = doc.lastAutoTable.finalY;

        const abstractBody = [
            [{ content: 'Abstract of Rice', colSpan: 2, styles: { fontStyle: 'bold', halign: 'center' } }, { content: 'Abstract of Cash', colSpan: 2, styles: { fontStyle: 'bold', halign: 'center' } }],
            ['1. Opening Balance:', `${riceAbstracts[category].opening.toFixed(3)} Kg`, '1. Opening Balance:', `Rs ${cashAbstracts[category].opening.toFixed(2)}`],
            ['2. Quantity received:', `${riceAbstracts[category].received.toFixed(3)} Kg`, '2. Amount received:', `Rs ${cashAbstracts[category].received.toFixed(2)}`],
            ['3. Total Quantity:', `${riceAbstracts[category].total.toFixed(3)} Kg`, '3. Total Amount:', `Rs ${cashAbstracts[category].total.toFixed(2)}`],
            ['4. Rice Consumed:', `${riceAbstracts[category].consumed.toFixed(3)} Kg`, '4. Expenditure:', `Rs ${cashAbstracts[category].expenditure.toFixed(2)}`],
            ['5. Closing Balance:', `${riceAbstracts[category].balance.toFixed(3)} Kg`, '5. closing balance:', `Rs ${cashAbstracts[category].balance.toFixed(2)}`],
        ];

        doc.autoTable({
            startY: mainTableFinalY + 5,
            body: abstractBody,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 2, lineWidth: 0.1 },
            columnStyles: {
                0: { cellWidth: 40, fontStyle: 'bold' }, 1: { cellWidth: 45, halign: 'right' },
                2: { cellWidth: 40, fontStyle: 'bold' }, 3: { cellWidth: 45, halign: 'right' },
            },
        });

        addSignatureBlock(doc, settings, doc.lastAutoTable.finalY);
    });

    return doc.output('blob');
};

const generateRollStatement = (data: AppData): Blob => {
    const doc = new jspdf.jsPDF();
    const { settings } = data;
    const { schoolDetails, classRolls } = settings;

    doc.setFontSize(14).setFont(undefined, 'bold');
    doc.text(schoolDetails.name, doc.internal.pageSize.getWidth() / 2, 10, { align: 'center' });
    doc.setFontSize(12).setFont(undefined, 'normal');
    doc.text('Student Roll Statement', doc.internal.pageSize.getWidth() / 2, 16, { align: 'center' });

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
    
    const classOrder = CLASS_STRUCTURE.reduce((acc, c, index) => ({...acc, [c.id]: index }), {} as Record<string, number>);
    const sortFunction = (a: ClassRoll, b: ClassRoll) => (classOrder[a.id] ?? 99) - (classOrder[b.id] ?? 99);
    
    const allRolls = [...(classRolls || [])].sort(sortFunction);
    
    const middleClasses = allRolls.filter(c => ['c6', 'c7', 'c8'].includes(c.id));
    const primaryClasses = allRolls.filter(c => ['c1', 'c2', 'c3', 'c4', 'c5'].includes(c.id));
    const prePrimaryClasses = allRolls.filter(c => ['bal', 'pp1', 'pp2'].includes(c.id));

    const grandTotal = calculateSectionTotals(allRolls);
    const middleTotals = calculateSectionTotals(middleClasses);
    const primaryTotals = calculateSectionTotals(primaryClasses);
    const prePrimaryTotals = calculateSectionTotals(prePrimaryClasses);
    
    const head = [
        [
            { content: 'Class', rowSpan: 2 }, { content: 'General', colSpan: 2 },
            { content: 'ST/SC', colSpan: 2 }, { content: 'Total', colSpan: 2 },
            { content: 'On Roll', rowSpan: 2 },
        ],
        ['Boys', 'Girls', 'Boys', 'Girls', 'Boys', 'Girls'],
    ];

    const body: any[] = [];
    
    const addSectionToBody = (title: string, classes: ClassRoll[], totals: ReturnType<typeof calculateSectionTotals>) => {
        if (classes.length === 0) return;
        body.push([{ content: title, colSpan: 8, styles: { fontStyle: 'bold', fillColor: [245, 245, 245], textColor: 0 } }]);
        classes.forEach(cr => {
            const totalBoys = cr.general.boys + cr.stsc.boys;
            const totalGirls = cr.general.girls + cr.stsc.girls;
            const onRoll = totalBoys + totalGirls;
            body.push([cr.name, cr.general.boys, cr.general.girls, cr.stsc.boys, cr.stsc.girls, totalBoys, totalGirls, onRoll]);
        });
        body.push([
            { content: `${title.split(' ')[0]} Total`, styles: { fontStyle: 'bold' } },
            totals.general.boys, totals.general.girls,
            totals.stsc.boys, totals.stsc.girls,
            totals.total.boys, totals.total.girls,
            totals.total.onRoll
        ]);
    };

    addSectionToBody('Middle (VI-VIII)', middleClasses, middleTotals);
    addSectionToBody('Primary (I-V)', primaryClasses, primaryTotals);
    addSectionToBody('Pre-Primary', prePrimaryClasses, prePrimaryTotals);
    
    const foot = [[
        { content: 'Grand Total', styles: { fontStyle: 'bold' } },
        grandTotal.general.boys, grandTotal.general.girls,
        grandTotal.stsc.boys, grandTotal.stsc.girls,
        grandTotal.total.boys, grandTotal.total.girls,
        grandTotal.total.onRoll
    ]];

    doc.autoTable({
        startY: 25,
        head: head,
        body: body,
        foot: foot,
        theme: 'grid',
        styles: { fontSize: 8, halign: 'center', cellPadding: 1.5 },
        headStyles: { fontStyle: 'bold', fillColor: [230, 230, 230], textColor: 0 },
        footStyles: { fontStyle: 'bold', fillColor: [230, 230, 230], textColor: 0 },
    });

    addSignatureBlock(doc, settings, doc.lastAutoTable.finalY);

    return doc.output('blob');
};

const generateRiceRequirementCertificate = (data: AppData, selectedMonth: string): Blob => {
    const { settings } = data;
    const { schoolDetails, rates } = settings;
    const summary = calculateMonthlySummary(data, selectedMonth);
    const { monthEntries } = summary;

    const doc = new jspdf.jsPDF();
    let pagesAdded = 0;

    const categories: Category[] = ['balvatika', 'primary', 'middle'];
    const monthDate = new Date(`${selectedMonth}-02`);
    const monthName = monthDate.toLocaleString('default', { month: 'long' });
    const year = monthDate.getFullYear();
    const workingDays = monthEntries.filter(e => e.totalPresent > 0).length;

    categories.forEach(category => {
        const catName = category.charAt(0).toUpperCase() + category.slice(1);
        const enrollment = settings.classRolls.filter(c => {
            if (['bal', 'pp1', 'pp2'].includes(c.id)) return category === 'balvatika';
            if (['c1', 'c2', 'c3', 'c4', 'c5'].includes(c.id)) return category === 'primary';
            if (['c6', 'c7', 'c8'].includes(c.id)) return category === 'middle';
            return false;
        }).reduce((sum, c) => sum + c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls, 0);

        if (enrollment === 0) return; // Skip certificate if no students are enrolled in this category

        if (pagesAdded > 0) {
            doc.addPage();
        }
        pagesAdded++;

        // ======== Header ========
        doc.setFontSize(16).setFont(undefined, 'bold');
        doc.text(schoolDetails.name, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
        doc.setFontSize(10).setFont(undefined, 'normal');
        doc.text(`UDISE: ${schoolDetails.udise}`, doc.internal.pageSize.getWidth() / 2, 26, { align: 'center' });
        doc.text(`${schoolDetails.village}, ${schoolDetails.block}, ${schoolDetails.district}`, doc.internal.pageSize.getWidth() / 2, 32, { align: 'center' });

        // ======== Title ========
        doc.setFontSize(14).setFont(undefined, 'bold');
        doc.text('Rice Requirement Certificate', doc.internal.pageSize.getWidth() / 2, 50, { align: 'center' });
        doc.setLineWidth(0.5);
        doc.line(70, 52, 140, 52);

        // ======== Body ========
        doc.setFontSize(11).setFont(undefined, 'normal');
        const bodyText = `This is to certify that the following quantity of rice is required for the ${catName} category under the PM-POSHAN (Mid-Day Meal) scheme at our school for the month of ${monthName}, ${year}.`;
        const splitText = doc.splitTextToSize(bodyText, 170);
        doc.text(splitText, 21, 70);

        // ======== Details Table ========
        const riceRateGrams = rates.rice[category];
        const totalRiceKg = (enrollment * workingDays * riceRateGrams) / 1000;

        doc.autoTable({
            startY: 90,
            head: [['Description', 'Value']],
            body: [
                ['Student Category', catName],
                ['Total Enrollment in Category', `${enrollment} students`],
                ['Number of School/Working Days', `${workingDays} days`],
                ['Rice Allocation Rate per Student', `${riceRateGrams} grams`],
                [{ content: 'Total Rice Requirement', styles: { fontStyle: 'bold' } }, { content: `${totalRiceKg.toFixed(3)} Kg`, styles: { fontStyle: 'bold' } }],
            ],
            theme: 'grid',
            headStyles: { fillColor: [240, 240, 240], textColor: 0 },
            styles: { fontSize: 10, cellPadding: 3 },
            columnStyles: { 0: { fontStyle: 'bold' } }
        });

        // ======== Footer ========
        const finalY = doc.lastAutoTable.finalY;
        doc.setFontSize(9).setFont(undefined, 'normal');
        doc.text(`Date of Issue: ${new Date().toLocaleDateString('en-IN')}`, 21, finalY + 15);
        addSignatureBlock(doc, settings, finalY + 15);
    });
    
    if (pagesAdded === 0) {
        throw new Error("No students enrolled in any category. Cannot generate requirement certificate.");
    }

    return doc.output('blob');
};

export const generatePDFReport = (reportType: string, data: AppData, selectedMonth: string): { pdfBlob: Blob; filename: string } => {
    const schoolName = data.settings.schoolDetails.name.replace(/\s+/g, '_');
    let pdfBlob: Blob;
    let filename: string;

    switch (reportType) {
        case 'mdcf':
            pdfBlob = generateMDCF(data, selectedMonth);
            filename = `MDCF_${schoolName}_${selectedMonth}.pdf`;
            break;
        case 'daily_consumption':
            pdfBlob = generateConsumptionRegister(data, selectedMonth);
            filename = `Consumption_Register_${schoolName}_${selectedMonth}.pdf`;
            break;
        case 'roll_statement':
            pdfBlob = generateRollStatement(data);
            filename = `Roll_Statement_${schoolName}.pdf`;
            break;
        case 'rice_requirement':
            pdfBlob = generateRiceRequirementCertificate(data, selectedMonth);
            filename = `Rice_Requirement_${schoolName}_${selectedMonth}.pdf`;
            break;
        default:
            throw new Error(`Unknown report type: ${reportType}`);
    }

    if (!pdfBlob || pdfBlob.size === 0) {
        if (reportType === 'daily_consumption') {
             const summary = calculateMonthlySummary(data, selectedMonth);
             const { monthEntries } = summary;
             if (monthEntries.length === 0) {
                 throw new Error('No meal entries found for this month to generate a consumption report.');
             }
        }
        throw new Error('Generated PDF is empty. This might be due to a lack of data.');
    }

    return { pdfBlob, filename };
};
