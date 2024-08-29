window.onload = function() {
    let reloadFlag = false;  // لمنع عمليات إعادة التحميل المتعددة

    if ('caches' in window) {
        caches.keys().then(function(names) {
            Promise.all(names.map(name => caches.delete(name)))
                .then(function() {
                    reloadWithoutCache();
                })
                .catch(function(error) {
                    console.error('Error deleting caches:', error);
                    reloadWithoutCache();
                });
        });
    } else {
        reloadWithoutCache();
    }

    function reloadWithoutCache() {
        if (!reloadFlag && !window.location.href.includes('nocache')) {
            reloadFlag = true;  // تعيين العلامة لمنع عمليات إعادة التحميل الإضافية
            window.location.href = window.location.href.split('?')[0] + '?nocache=' + new Date().getTime();
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    fetch('Detailed.xlsx?' + new Date().getTime()) // Append timestamp to avoid caching
        .then(response => response.arrayBuffer())
        .then(data => {
            const workbook = XLSX.read(data, { type: 'array' });

            // Calculate totals for each status across all sheets
            let totalPass = 0, totalFail = 0, totalNotRun = 0;

            // Process data for each sheet
            ['Sheet1', 'Sheet2', 'Sheet3' , 'Sheet4'].forEach(sheetName => {
                const sheet = workbook.Sheets[sheetName];
                const excelData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                excelData.slice(1).forEach(row => {
                    const status = row[2]?.toLowerCase();
                    if (status === 'pass') totalPass++;
                    else if (status === 'fail') totalFail++;
                    else if (status === 'notrun') totalNotRun++;
                });
            });

            // Create Donut Chart
            createDonutChart(totalPass, totalFail, totalNotRun, 'donutChart');

            // Generate charts for Part 1
            generateCharts(workbook, 'Sheet1', 'stackedColumnChartBSS', 'pieChartBSS', 'Part 1: Site / Vendor / Technology Status', 'Part 1: Site / Vendor / Technology', 'Part 1: Overall Status');

            // Generate pie chart only for Part 2
            createPieChartForPart(workbook, 'Sheet2', 'pieChartSanity', 'Part 2: Overall Status');

            // Generate pie chart only for Part 3
            createPieChartForPart(workbook, 'Sheet3', 'pieChartRA', 'Part 3: Overall Status');

            // Generate charts for Part 4
            generateCharts(workbook, 'Sheet4', 'stackedColumnChartSanityScope', 'pieChartSaS', 'Part 4 Sanity Scope', 'Categories', 'Part 4: Overall Status');
        })
        .catch(error => console.error('Error fetching Detailed.xlsx:', error));
});

function createDonutChart(totalPass, totalFail, totalNotRun, chartId) {
    Highcharts.chart(chartId, {
        chart: {
            type: 'pie',
            options3d: {
                enabled: true,
                alpha: 15,
                beta: 0
            }
        },
        title: {
            text: 'Go / No Go Smoke Status'
        },
        plotOptions: {
            pie: {
                innerSize: '60%',
                depth: 35,
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: true,
                    format: '{point.name}: {point.percentage:.1f} %',
                    connectorColor: 'silver'
                },
                showInLegend: true
            }
        },
        series: [{
            type: 'pie',
            name: 'Test Cases',
            data: [
                { name: 'Pass', y: totalPass, color: '#2ecc71' },
                { name: 'Fail', y: totalFail, color: '#CB0640' },
                { name: 'Not Run', y: totalNotRun, color: '#1DB5B1' }
            ]
        }]
    });
}

function createPieChartForPart(workbook, sheetName, chartId, titleText) {
    const sheet = workbook.Sheets[sheetName];
    const excelData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const passCounts = [];
    const failCounts = [];
    const notRunCounts = [];

    excelData.slice(1).forEach(row => {
        const status = row[2]?.toLowerCase();
        if (status === 'pass') passCounts.push(1);
        else if (status === 'fail') failCounts.push(1);
        else if (status === 'notrun') notRunCounts.push(1);
    });

    const totalPass = passCounts.reduce((a, b) => a + b, 0);
    const totalFail = failCounts.reduce((a, b) => a + b, 0);
    const totalNotRun = notRunCounts.reduce((a, b) => a + b, 0);

    Highcharts.chart(chartId, {
        chart: {
            type: 'pie',
            options3d: {
                enabled: false // Ensure it's a flat pie chart
            }
        },
        title: {
            text: titleText
        },
        plotOptions: {
            pie: {
                innerSize: 50,
                depth: 45,
                dataLabels: {
                    enabled: true,
                    formatter: function() {
                        const percentage = ((this.y / (totalPass + totalFail + totalNotRun)) * 100).toFixed(2);
                        return this.point.name + ': ' + this.y + ' (' + percentage + '%)';
                    }
                }
            }
        },
        series: [{
            name: 'Test Cases',
            data: [
                { name: 'Pass', y: totalPass, color: '#2ecc71' },
                { name: 'Fail', y: totalFail, color: '#CB0640' },
                { name: 'Not Run', y: totalNotRun, color: '#1DB5B1' }
            ]
        }]
    });
}

function generateCharts(workbook, sheetName, stackedColumnId, pieChartId, stackedTitle, xAxisTitle, pieTitle) {
    const sheet = workbook.Sheets[sheetName];
    const excelData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const locations = [];
    const passCounts = [];
    const failCounts = [];
    const notRunCounts = [];

    excelData.slice(1).forEach(row => {
        const location = row[0];
        const status = row[2]?.toLowerCase();

        if (!locations.includes(location)) {
            locations.push(location);
            passCounts.push(0);
            failCounts.push(0);
            notRunCounts.push(0);
        }

        const locIndex = locations.indexOf(location);

        if (status === 'pass') {
            passCounts[locIndex]++;
        } else if (status === 'fail') {
            failCounts[locIndex]++;
        } else if (status === 'notrun') {
            notRunCounts[locIndex]++;
        }
    });

    createStackedColumnChart(locations, passCounts, failCounts, notRunCounts, stackedColumnId, stackedTitle, xAxisTitle);
    createPieChart(passCounts, failCounts, notRunCounts, pieChartId, pieTitle); // Use specific title for each pie chart
}

function createStackedColumnChart(locations, passCounts, failCounts, notRunCounts, containerId, titleText, xAxisTitle) {
    const totalCounts = passCounts.map((count, i) => count + failCounts[i] + notRunCounts[i]);

    Highcharts.chart(containerId, {
        chart: {
            type: 'column'
        },
        title: {
            text: titleText
        },
        xAxis: {
            categories: locations,
            title: {
                text: xAxisTitle
            }
        },
        yAxis: {
            min: 0,
            max: 100,
            title: {
                text: ' Test Cases',
                align: 'high'
            },
            labels: {
                format: '{value}%'
            }
        },
        tooltip: {
            pointFormat: '{series.name}: {point.y:.1f}%<br/>Total: {point.stackTotal:.0f}%'
        },
        plotOptions: {
            column: {
                stacking: 'percent',
                dataLabels: {
                    enabled: false,
                    formatter: function() {
                        return this.y > 0 ? Highcharts.numberFormat(this.y, 1) + '%' : null;
                    }
                }
            }
        },
        series: [{
            name: 'Pass',
            data: passCounts.map((count, i) => (count / totalCounts[i]) * 100),
            color: '#2ecc71'
        }, {
            name: 'Fail',
            data: failCounts.map((count, i) => (count / totalCounts[i]) * 100),
            color: '#CB0640'
        }, {
            name: 'Not Run',
            data: notRunCounts.map((count, i) => (count / totalCounts[i]) * 100),
            color: '#1DB5B1'
        }]
    });
}





function createPieChart(passCounts, failCounts, notRunCounts, chartId, titleText) {
    const totalPass = passCounts.reduce((a, b) => a + b, 0);
    const totalFail = failCounts.reduce((a, b) => a + b, 0);
    const totalNotRun = notRunCounts.reduce((a, b) => a + b, 0);
    const total = totalPass + totalFail + totalNotRun;

    Highcharts.chart(chartId, {
        chart: {
            type: 'pie',
            options3d: {
                enabled: false // Ensure it's a flat pie chart
            }
        },
        title: {
            text: titleText
        },
        plotOptions: {
            pie: {
                innerSize: 50,
                depth: 45,
                dataLabels: {
                    enabled: true,
                    formatter: function() {
                        const percentage = ((this.y / total) * 100).toFixed(2);
                        return this.point.name + ': ' + this.y + ' (' + percentage + '%)';
                    }
                }
            }
        },
        series: [{
            name: 'Test Cases',
            data: [
                { name: 'Pass', y: totalPass, color: '#2ecc71' },
                { name: 'Fail', y: totalFail, color: '#CB0640' },
                { name: 'Not Run', y: totalNotRun, color: '#1DB5B1' }
            ]
        }]
    });
}

function updateWarning() {
    const hasIssue = false; // يمكنك تغيير هذا إلى true لاختبار ظهور التحذير
    showWarning('There is an issue with the data. Please check the source.', hasIssue ? 2 : 0); // إذا كانت hasIssue true، سيتم عرض التحذير
}

function showWarning(message, defectCount) {
    const warningDiv = document.getElementById('warning-message');
    const warningButton = document.getElementById('warning-button');
    const defectDetails = document.getElementById('defect-details');

    if (defectCount > 0) {
        warningDiv.textContent = message;
        warningDiv.classList.remove('hidden');
        warningButton.classList.remove('hidden');
        defectDetails.classList.remove('hidden');
        document.getElementById('defect-count').textContent = defectCount;

        warningDiv.onclick = scrollToDefects;
    } else {
        warningDiv.classList.add('hidden');
        warningButton.classList.add('hidden');
        defectDetails.classList.add('hidden');
    }
}

function scrollToDefects() {
    document.getElementById('defect-details').scrollIntoView({ behavior: 'smooth' });
}

const hasIssue = false;
if (hasIssue) {
    showWarning('There is a showstopper on location("Kayan") Click here for More details', 2);
}

function displayCurrentTime() {
    const currentTimeElement = document.getElementById('current-time');
    const now = new Date();
    
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    const formattedTime = `${day}/${month}/${year} - ${hours}:${minutes} ${ampm}`;
    currentTimeElement.textContent = `Current time: ${formattedTime}`;
}

setInterval(displayCurrentTime, 60000);
displayCurrentTime();

// Show the button when scrolling down 100px from the top
window.onscroll = function() {
    const scrollToTopBtn = document.getElementById("scrollToTopBtn");
    if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
        scrollToTopBtn.style.display = "block";
    } else {
        scrollToTopBtn.style.display = "none";
    }
};

// Scroll to the top smoothly when the button is clicked
document.getElementById("scrollToTopBtn").addEventListener("click", function() {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});
