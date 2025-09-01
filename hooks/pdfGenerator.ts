import { AppData, Category, ClassRoll } from '../types';
import { calculateMonthlySummary } from '../services/summaryCalculator';
import { CLASS_STRUCTURE } from '../constants';


interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
    [key: string]: any;
}

declare const jspdf: any;

const generateNewMDCFReport = (data: AppData, month: string) => {
    const doc = new jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as jsPDF;
    const { settings, entries } = data;
    const { schoolDetails, healthStatus, inspectionReport, cooks } = settings;

    const summary = calculateMonthlySummary(data, month);
    const { riceAbstracts, cashAbstracts, categoryTotals } = summary;

    const monthDate = new Date(`${month}-02T00:00:00Z`);
    const monthName = monthDate.toLocaleString('default', { month: 'long' });
    const year = monthDate.getFullYear();

    // --- PAGE 1 ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Pradhan Mantri Poshan Shakti Nirman (PM POSHAN)', doc.internal.pageSize.getWidth() / 2, 10, { align: 'center' });
    doc.setFontSize(10);
    doc.text('School Monthly Data Capture Format (MDCF)', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.text('Instructions: Keep following registers at the time of filling the form:-', 14, 22);
    doc.text('1) Enrolment Register. 2) Account 3) Bank Account Pass book. 4) Cooking cost details etc.', 14, 26);

    // 1. School Details - Refactored to a single, robust table
    doc.setFont('helvetica', 'bold');
    doc.text('1. School Details', 14, 33);

    const typeCheckbox = (label: string, value: string, currentValue: string) => {
        return `${currentValue === value ? '☑' : '☐'} ${label}`;
    };

    const schoolTypeMDCF = settings.schoolDetails.schoolTypeMDCF;
    const schoolCategoryMDCF = settings.schoolDetails.schoolCategoryMDCF;
    const totalEnrollment = settings.classRolls.reduce((sum, c) => sum + c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls, 0);

    const typeContent = [
        typeCheckbox('Government', 'Government', schoolTypeMDCF),
        typeCheckbox('Local Body', 'Local Body', schoolTypeMDCF),
        typeCheckbox('EGS/AIE Centers', 'EGS/AIE Centers', schoolTypeMDCF),
        typeCheckbox('NCLP', 'NCLP', schoolTypeMDCF),
        typeCheckbox('Madras / Maqtab', 'Madras / Maqtab', schoolTypeMDCF)
    ].join('  ');

    const categoryContent = [
        typeCheckbox('Primary', 'Primary', schoolCategoryMDCF),
        typeCheckbox('Upper Primary', 'Upper Primary', schoolCategoryMDCF),
        typeCheckbox('Primary with Upper Primary', 'Primary with Upper Primary', schoolCategoryMDCF)
    ].join('   ');

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
        columnStyles: {
            0: { cellWidth: 30 },
            2: { cellWidth: 30 },
        }
    });
    
    let currentY = doc.lastAutoTable.finalY;

    // 2. Meals Availed Status
    const mealDays = entries.filter(e => e.date.startsWith(month) && e.totalPresent > 0).length;
    const holidays = entries.filter(e => e.date.startsWith(month) && e.totalPresent === 0 && e.reasonForNoMeal?.toLowerCase().includes('holiday')).length;
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const sundays = Array.from({ length: daysInMonth }, (_, i) => new Date(monthDate.getFullYear(), monthDate.getMonth(), i + 1).getDay()).filter(day => day === 0).length;
    const schoolDays = daysInMonth - sundays - holidays;

    doc.setFont('helvetica', 'bold');
    doc.text('2. Meals Availed Status', 14, currentY + 10);
    doc.autoTable({
        startY: currentY + 12,
        theme: 'grid',
        head: [['', 'Bal Vatika', 'Primary', 'Upper Primary']],
        body: [
            ['Number of School days during month', { content: schoolDays, colSpan: 3, styles: { halign: 'center' } }],
            ['Actual number of days Mid Day Meal served', { content: mealDays, colSpan: 3, styles: { halign: 'center' } }],
            ['Total Meals served during the month', categoryTotals.present.balvatika, categoryTotals.present.primary, categoryTotals.present.middle],
        ],
        styles: { fontSize: 8 },
    });
    
    currentY = doc.lastAutoTable.finalY;

    // 3. Fund Details
    const cookHelperExpenditure = cooks.reduce((sum, cook) => sum + cook.amountPaid, 0);
    const totalClosing = cashAbstracts.balvatika.balance + cashAbstracts.primary.balance + cashAbstracts.middle.balance + cookHelperExpenditure + settings.mmeExpenditure;
    doc.setFont('helvetica', 'bold');
    doc.text('3. Fund Details (in Rs.)', 14, currentY + 10);
    doc.autoTable({
        startY: currentY + 12,
        theme: 'grid',
        head: [['Component', 'Opening Balance', 'Received during the Month', 'Expenditure during the Month', 'Closing Balance']],
        body: [
            ['Cooking Cost - Bal Vatika', cashAbstracts.balvatika.opening.toFixed(2), cashAbstracts.balvatika.received.toFixed(2), cashAbstracts.balvatika.expenditure?.toFixed(2), cashAbstracts.balvatika.balance.toFixed(2)],
            ['Cooking Cost - Primary', cashAbstracts.primary.opening.toFixed(2), cashAbstracts.primary.received.toFixed(2), cashAbstracts.primary.expenditure?.toFixed(2), cashAbstracts.primary.balance.toFixed(2)],
            ['Cooking Cost - Uper Primary', cashAbstracts.middle.opening.toFixed(2), cashAbstracts.middle.received.toFixed(2), cashAbstracts.middle.expenditure?.toFixed(2), cashAbstracts.middle.balance.toFixed(2)],
            ['Cook Cum Helper', '', '', cookHelperExpenditure.toFixed(2), ''],
            ['School Expenses : MME Expenses', '', '', settings.mmeExpenditure.toFixed(2), ''],
            [{ content: 'Whether the Sum of above Closing Balance matches with Bank Account Closing Balance. Yes [ ] No [ ]', colSpan: 5 }]
        ],
        styles: { fontSize: 8 },
    });
    
    currentY = doc.lastAutoTable.finalY;

    // 4. Cook Cum Helper Payment Details
    const cchBody = [];
    for (let i = 0; i < 4; i++) {
        const cook = cooks[i];
        cchBody.push([
            i + 1,
            cook ? cook.name : '',
            cook ? cook.gender.charAt(0) : '',
            cook ? cook.category : '',
            cook ? cook.paymentMode : '',
            cook ? cook.amountPaid.toFixed(2) : ''
        ]);
    }

    doc.setFont('helvetica', 'bold');
    doc.text('4. Cook Cum Helper Payment Details', 14, currentY + 10);
    doc.autoTable({
        startY: currentY + 12,
        theme: 'grid',
        head: [['S.No.', 'Cook Name', 'Gender (M/F)', 'Category (SC/ST/OBC/GEN)', 'Payment Mode (Cash/Bank)', 'Amount Received during month (In Rs.)']],
        body: cchBody,
        styles: { fontSize: 8 },
    });

    // --- PAGE 2 ---
    doc.addPage();
    
    // 5. Food Grains Details (in KG.)
    doc.setFont('helvetica', 'bold');
    doc.text('5. Food Grains Details (in KG.)', 14, 15);
    doc.autoTable({
        startY: 17,
        theme: 'grid',
        head: [['Category', 'Food Item', 'Opening Balance', 'Received during the Month', 'Consumption during the Month', 'Closing Balance']],
        body: [
            ['Bal Vatika', 'Wheat', '0.000', '0.000', '0.000', '0.000'],
            ['', 'Rice', riceAbstracts.balvatika.opening.toFixed(3), riceAbstracts.balvatika.received.toFixed(3), riceAbstracts.balvatika.consumed?.toFixed(3), riceAbstracts.balvatika.balance.toFixed(3)],
            ['Primary', 'Wheat', '0.000', '0.000', '0.000', '0.000'],
            ['', 'Rice', riceAbstracts.primary.opening.toFixed(3), riceAbstracts.primary.received.toFixed(3), riceAbstracts.primary.consumed?.toFixed(3), riceAbstracts.primary.balance.toFixed(3)],
            ['Upper Primary', 'Wheat', '0.000', '0.000', '0.000', '0.000'],
            ['', 'Rice', riceAbstracts.middle.opening.toFixed(3), riceAbstracts.middle.received.toFixed(3), riceAbstracts.middle.consumed?.toFixed(3), riceAbstracts.middle.balance.toFixed(3)],
        ],
        didParseCell: (data: any) => {
            if (data.cell.raw === '') { data.cell.styles.border = [false, false, false, false]; }
        },
        styles: { fontSize: 8 },
    });
    
    currentY = doc.lastAutoTable.finalY;

    // 6. Children Health Status
    doc.setFont('helvetica', 'bold');
    doc.text('6. Children Health Status', 14, currentY + 10);
    doc.autoTable({
        startY: currentY + 12,
        theme: 'grid',
        body: [
            ['No. of children from class 1 to 8 who had received 4 IFA tablets (Boys) -', healthStatus.ifaBoys],
            ['No. of children from class 1 to 8 who had received 4 IFA tablets (Girls)', healthStatus.ifaGirls],
            ['No. of children screened by mobile health (RBSK) team', healthStatus.screenedByRBSK],
            ['No. of children referred by mobile health (RBSK) team', healthStatus.referredByRBSK],
        ],
        styles: { fontSize: 8 },
    });
    
    currentY = doc.lastAutoTable.finalY;
    
    // 7. School Inspection
    const inspectedByText = Object.entries(inspectionReport.inspectedBy)
        .filter(([, checked]) => checked)
        .map(([key]) => key.replace(/([A-Z])/g, ' $1').replace('Smc', 'SMC').trim().replace(/\b\w/g, l => l.toUpperCase()))
        .join(', ');

    doc.setFont('helvetica', 'bold');
    doc.text('7. School Inspection', 14, currentY + 10);
    doc.autoTable({
        startY: currentY + 12,
        theme: 'grid',
        body: [
            ['School Inspection done during the month', `Yes [${inspectionReport.inspected ? '✔' : ' '}] No [${!inspectionReport.inspected ? '✔' : ' '}]`],
            ['By Members of Task Force / District Officials / Block Officials / SMC Members', inspectedByText]
        ],
        styles: { fontSize: 8 },
    });
    
    currentY = doc.lastAutoTable.finalY;

    // 8. Incidents & Signatures
    doc.setFont('helvetica', 'bold');
    doc.text('Number of Untoward Incidents Occurred', 14, currentY + 10);
    doc.autoTable({
        startY: currentY + 12,
        theme: 'grid',
        body: [[inspectionReport.incidentsCount]],
        styles: { fontSize: 8 },
    });
    
    const finalY = doc.lastAutoTable.finalY;
    doc.text('....................................................................', 14, finalY + 25);
    doc.text('Signature of the SMC Chairperson / Gram Pradhan', 14, finalY + 30);
    
    doc.text('....................................................................', 110, finalY + 25);
    doc.text('Signature of Head Teacher', 110, finalY + 30);

    const filename = `MDCF_${schoolDetails.name.replace(/\s+/g, '_')}_${month}.pdf`;
    return { dataUri: doc.output('datauristring'), filename };
};

const generateNewDailyConsumptionReport = (data: AppData, month: string) => {
    const doc = new jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as jsPDF;
    const { settings } = data;
    const { schoolDetails, rates } = settings;

    const summary = calculateMonthlySummary(data, month);
    // Correctly create a UTC date to avoid timezone-off-by-one errors.
    const monthDate = new Date(month + '-01T12:00:00Z');
    const monthName = monthDate.toLocaleString('en-IN', { month: 'long', timeZone: 'UTC' });
    const yearName = monthDate.toLocaleString('en-IN', { year: 'numeric', timeZone: 'UTC' });
    
    const categories: Category[] = ['balvatika', 'primary', 'middle'];
    const departmentMap = {
        balvatika: 'Pre-Primary',
        primary: 'Primary',
        middle: 'Upper-Primary'
    };

    const onRolls = categories.reduce((acc, category) => {
        let total = 0;
        const catClasses = {
            balvatika: ['bal', 'pp1', 'pp2'],
            primary: ['c1', 'c2', 'c3', 'c4', 'c5'],
            middle: ['c6', 'c7', 'c8']
        }[category];

        settings.classRolls.forEach(c => {
            if (catClasses.includes(c.id)) {
                total += c.general.boys + c.general.girls + c.stsc.boys + c.stsc.girls;
            }
        });
        acc[category] = total;
        return acc;
    }, {} as Record<Category, number>);

    let firstPageDrawn = false;
    categories.forEach((category) => {
        if (onRolls[category] === 0) return; // Skip departments with no students

        if (firstPageDrawn) {
            doc.addPage();
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(schoolDetails.name, doc.internal.pageSize.getWidth() / 2, 12, { align: 'center' });
        doc.setFontSize(11);
        doc.text('Daily Consumption Register of Mid-day Meals', doc.internal.pageSize.getWidth() / 2, 18, { align: 'center' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.text(`Month: ${monthName} ${yearName}`, 14, 25);
        doc.text(`Department: ${departmentMap[category]}`, pageWidth - 14, 25, { align: 'right' });
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        const totalCost = (rates.dalVeg[category] + rates.salt[category] + rates.oilCond[category] + rates.fuel[category]).toFixed(2);
        doc.text(
            `Rates per student: Rice @ ${(rates.rice[category] / 1000).toFixed(3)} kg | Cooking Cost @ Rs ${totalCost}`,
            14, 30
        );
        
        const head = [['S.No', 'Date', 'Roll', 'Present', 'Rice (kg)', 'Dal/Veg', 'Salt', 'Oil/Cond', 'Fuel', 'Total (Rs.)']];
        
        const body: any[] = [];
        const year = monthDate.getUTCFullYear();
        const monthIndex = monthDate.getUTCMonth();
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(Date.UTC(year, monthIndex, i));
            
            const yearStr = date.getUTCFullYear();
            const monthStr = (date.getUTCMonth() + 1).toString().padStart(2, '0');
            const dayStr = date.getUTCDate().toString().padStart(2, '0');
            const dateString = `${yearStr}-${monthStr}-${dayStr}`;

            const entry = summary.monthEntries.find(e => e.id === dateString);

            if (date.getUTCDay() === 0) { // Sunday
                body.push([i, date.toLocaleDateString('en-GB', { timeZone: 'UTC' }), '', '', { content: 'Sunday', colSpan: 6, styles: { halign: 'center' } }]);
            } else if (entry) {
                const present = entry.present[category];
                const fgUsed = (present * rates.rice[category]) / 1000;
                const dalVeg = present * rates.dalVeg[category];
                const salt = present * rates.salt[category];
                const oilCond = present * rates.oilCond[category];
                const fuel = present * rates.fuel[category];
                const total = dalVeg + salt + oilCond + fuel;
                
                body.push([
                    i,
                    date.toLocaleDateString('en-GB', { timeZone: 'UTC' }),
                    onRolls[category],
                    present,
                    present > 0 ? fgUsed.toFixed(3) : '0.000',
                    present > 0 ? dalVeg.toFixed(2) : '0.00',
                    present > 0 ? salt.toFixed(2) : '0.00',
                    present > 0 ? oilCond.toFixed(2) : '0.00',
                    present > 0 ? fuel.toFixed(2) : '0.00',
                    present > 0 ? total.toFixed(2) : '0.00',
                ]);
            } else {
                 body.push([i, date.toLocaleDateString('en-GB', { timeZone: 'UTC' }), onRolls[category], 0, '0.000', '0.00', '0.00', '0.00', '0.00', '0.00']);
            }
        }
        
        doc.autoTable({
            head, body, startY: 34, theme: 'grid',
            styles: { fontSize: 8, halign: 'center' },
            headStyles: { fontStyle: 'bold' }
        });
        
        const riceAbstract = summary.riceAbstracts[category];
        const cashAbstract = summary.cashAbstracts[category];
        
        doc.autoTable({
            head: [['Abstract of Rice', 'Abstract of Cash']],
            body: [
                [`1. Opening Balance:-   ${riceAbstract.opening.toFixed(3)} Kg`, `1. Opening Balance:-   Rs ${cashAbstract.opening.toFixed(2)}`],
                [`2. Quantity received:- ${riceAbstract.received.toFixed(3)} Kg`, `2. Amount received:-   Rs ${cashAbstract.received.toFixed(2)}`],
                [`3. Total Quantity:-    ${riceAbstract.total.toFixed(3)} Kg`, `3. Total Amount:-      Rs ${cashAbstract.total.toFixed(2)}`],
                [`4. Rice Consumed:-     ${riceAbstract.consumed?.toFixed(3)} Kg`, `4. Expenditure:-       Rs ${cashAbstract.expenditure?.toFixed(2)}`],
                [`5. Closing Balance:-   ${riceAbstract.balance.toFixed(3)} Kg`, `5. Closing Balance:-   Rs ${cashAbstract.balance.toFixed(2)}`],
            ],
            startY: doc.lastAutoTable.finalY + 5,
            theme: 'grid',
            styles: { fontSize: 9 },
            headStyles: { fontStyle: 'bold', halign: 'center' }
        });
        
        doc.setFontSize(8);
        doc.text('created from pm poshan track app by Imran Gani Mugloo Teacher Zone Vailoo', doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' });

        firstPageDrawn = true;
    });

    const filename = `DailyConsumption_${schoolDetails.name.replace(/\s+/g, '_')}_${month}.pdf`;
    return { dataUri: doc.output('datauristring'), filename };
};

const generateRollStatementReport = (data: AppData) => {
    const doc = new jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as jsPDF;
    const { settings } = data;
    const { schoolDetails, classRolls } = settings;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Student Roll Statement', doc.internal.pageSize.getWidth() / 2, 12, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`School: ${schoolDetails.name} (${schoolDetails.udise})`, doc.internal.pageSize.getWidth() / 2, 18, { align: 'center' });

    const head = [[
        { content: 'Class', rowSpan: 2 },
        { content: 'General', colSpan: 2, styles: { halign: 'center' } },
        { content: 'ST/SC', colSpan: 2, styles: { halign: 'center' } },
        { content: 'Total', colSpan: 2, styles: { halign: 'center' } },
        { content: 'On Roll', rowSpan: 2 },
    ], [
        'Boys', 'Girls', 'Boys', 'Girls', 'Boys', 'Girls'
    ]];

    const calculateSectionTotals = (classes: ClassRoll[]) => {
        return classes.reduce((acc, cr) => {
            acc.general.boys += cr.general.boys;
            acc.general.girls += cr.general.girls;
            acc.stsc.boys += cr.stsc.boys;
            acc.stsc.girls += cr.stsc.girls;
            const totalBoys = cr.general.boys + cr.stsc.boys;
            const totalGirls = cr.general.girls + cr.stsc.girls;
            acc.total.boys += totalBoys;
            acc.total.girls += totalGirls;
            acc.total.onRoll += totalBoys + totalGirls;
            return acc;
        }, {
            general: { boys: 0, girls: 0 },
            stsc: { boys: 0, girls: 0 },
            total: { boys: 0, girls: 0, onRoll: 0 },
        });
    };
    
    const classOrder = CLASS_STRUCTURE.reduce((acc, c, index) => ({...acc, [c.id]: index}), {} as Record<string, number>);
    const sortFn = (a: ClassRoll, b: ClassRoll) => (classOrder[a.id] ?? 99) - (classOrder[b.id] ?? 99);

    const prePrimary = classRolls.filter(c => ['bal', 'pp1', 'pp2'].includes(c.id)).sort(sortFn);
    const primary = classRolls.filter(c => ['c1', 'c2', 'c3', 'c4', 'c5'].includes(c.id)).sort(sortFn);
    const middle = classRolls.filter(c => ['c6', 'c7', 'c8'].includes(c.id)).sort(sortFn);
    
    const body: any[] = [];
    const sectionRow = (label: string, totals: ReturnType<typeof calculateSectionTotals>) => [
        { content: label, styles: { fontStyle: 'bold' } },
        totals.general.boys, totals.general.girls,
        totals.stsc.boys, totals.stsc.girls,
        totals.total.boys, totals.total.girls,
        { content: totals.total.onRoll, styles: { fontStyle: 'bold' } }
    ];

    const processSection = (title: string, classes: ClassRoll[]) => {
        if (classes.length === 0) return;
        body.push([{ content: title, colSpan: 8, styles: { fontStyle: 'bold', fillColor: [253, 246, 235] } }]);
        classes.forEach(cr => {
            const totalBoys = cr.general.boys + cr.stsc.boys;
            const totalGirls = cr.general.girls + cr.stsc.girls;
            body.push([
                cr.name, cr.general.boys, cr.general.girls, cr.stsc.boys, cr.stsc.girls, totalBoys, totalGirls, totalBoys + totalGirls
            ]);
        });
        body.push(sectionRow(`${title.split(' ')[0]} Total`, calculateSectionTotals(classes)));
    }

    processSection('Pre-Primary', prePrimary);
    processSection('Primary (I-V)', primary);
    processSection('Middle (VI-VIII)', middle);

    body.push(sectionRow('Grand Total', calculateSectionTotals(classRolls)));

    doc.autoTable({
        head,
        body,
        startY: 25,
        theme: 'grid',
        styles: { fontSize: 9, halign: 'center' },
        headStyles: { halign: 'center', valign: 'middle' },
        didParseCell: function (data: any) {
            if (data.row.raw[0].content?.includes('Total')) {
                data.cell.styles.fontStyle = 'bold';
            }
        },
    });

    const filename = `RollStatement_${schoolDetails.name.replace(/\s+/g, '_')}.pdf`;
    return { dataUri: doc.output('datauristring'), filename };
};

export const generatePDFReport = (reportType: string, data: AppData, month: string): { dataUri: string, filename: string } => {
    switch (reportType) {
        case 'mdcf':
            return generateNewMDCFReport(data, month);
        case 'daily_consumption':
            return generateNewDailyConsumptionReport(data, month);
        case 'roll_statement':
            return generateRollStatementReport(data);
        default:
            throw new Error(`Unknown report type: ${reportType}`);
    }
};