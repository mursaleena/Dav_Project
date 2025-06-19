// Global variables
let allData = [];
let trueData = [];
let falseData = [];
let charts = {};
let filteredData = [];
let categories = [];

// Chart color schemes
const colorSchemes = {
    primary: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'],
    secondary: ['#a8edea', '#fed6e3', '#ffecd2', '#fcb69f', '#667eea', '#764ba2'],
    gradient: [
        'rgba(102, 126, 234, 0.8)',
        'rgba(118, 75, 162, 0.8)',
        'rgba(240, 147, 251, 0.8)',
        'rgba(245, 87, 108, 0.8)',
        'rgba(79, 172, 254, 0.8)',
        'rgba(0, 242, 254, 0.8)'
    ]
};

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

async function initializeDashboard() {
    try {
        showLoadingScreen();
        await loadCSVData();
        setupEventListeners();
        populateFilters();
        updateCharts();
        updateSummaryStats();
        hideLoadingScreen();
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        alert('Error loading data. Please check if CSV files are present.');
        hideLoadingScreen();
    }
}

function showLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'flex';
    document.getElementById('dashboard').classList.add('hidden');
}

function hideLoadingScreen() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('fade-in');
}

// Load CSV data
async function loadCSVData() {
    try {
        // Load main data
        const finalDataResponse = await fetch('Final_Data.csv');
        const finalDataText = await finalDataResponse.text();
        allData = Papa.parse(finalDataText, { header: true, skipEmptyLines: true }).data;

        // Load true data (hourly jobs)
        const trueDataResponse = await fetch('True.csv');
        const trueDataText = await trueDataResponse.text();
        trueData = Papa.parse(trueDataText, { header: true, skipEmptyLines: true }).data;

        // Load false data (fixed budget jobs)
        const falseDataResponse = await fetch('False.csv');
        const falseDataText = await falseDataResponse.text();
        falseData = Papa.parse(falseDataText, { header: true, skipEmptyLines: true }).data;

        // Process data
        processData();
        
    } catch (error) {
        console.error('Error loading CSV files:', error);
        throw error;
    }
}

function processData() {
    // Clean and process the data
    allData = allData.filter(row => row.title && row.category);
    trueData = trueData.filter(row => row.title && row.category);
    falseData = falseData.filter(row => row.title && row.category);

    // Extract unique categories
    categories = [...new Set(allData.map(row => row.category))].filter(cat => cat && cat.trim());
    
    // Convert budget and hourly values to numbers
    allData.forEach(row => {
        row.budget = parseFloat(row.budget) || 0;
        row.hourly_low = parseFloat(row.hourly_low) || 0;
        row.hourly_high = parseFloat(row.hourly_high) || 0;
        row.is_hourly = row.is_hourly === 'True' || row.is_hourly === true;
    });

    trueData.forEach(row => {
        row.budget = parseFloat(row.budget) || 0;
        row.hourly_low = parseFloat(row.hourly_low) || 0;
        row.hourly_high = parseFloat(row.hourly_high) || 0;
    });

    falseData.forEach(row => {
        row.budget = parseFloat(row.budget) || 0;
        row.hourly_low = parseFloat(row.hourly_low) || 0;
        row.hourly_high = parseFloat(row.hourly_high) || 0;
    });

    filteredData = [...allData];
}

function setupEventListeners() {
    // Filter event listeners
    document.getElementById('timePeriodSelect').addEventListener('change', updateCharts);
    document.getElementById('categorySelect').addEventListener('change', handleCategoryChange);
    document.getElementById('chartTypeSelect').addEventListener('change', updateCharts);
    
    // Time period control buttons
    document.getElementById('selectAllMonths').addEventListener('click', selectAllMonths);
    document.getElementById('clearAllMonths').addEventListener('click', clearAllMonths);
    
    // Category control buttons
    document.getElementById('selectAllCategories').addEventListener('click', selectAllCategories);
    document.getElementById('clearAllCategories').addEventListener('click', clearAllCategories);
    
    // Export and refresh buttons
    document.getElementById('exportChart').addEventListener('click', exportChart);
    document.getElementById('refreshChart').addEventListener('click', refreshData);
    document.getElementById('exportReport').addEventListener('click', exportReport);
    document.getElementById('refreshData').addEventListener('click', refreshData);
}

function populateFilters() {
    const categorySelect = document.getElementById('categorySelect');
    categorySelect.innerHTML = '';

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        option.selected = true; // Select all by default
        categorySelect.appendChild(option);
    });
    
    // Initialize time period select with all months selected
    const timePeriodSelect = document.getElementById('timePeriodSelect');
    Array.from(timePeriodSelect.options).forEach(option => {
        option.selected = true;
    });
}

function selectAllCategories() {
    const categorySelect = document.getElementById('categorySelect');
    Array.from(categorySelect.options).forEach(option => {
        option.selected = true;
    });
    updateCharts();
}

function clearAllCategories() {
    const categorySelect = document.getElementById('categorySelect');
    Array.from(categorySelect.options).forEach(option => {
        option.selected = false;
    });
    updateCharts();
}

function selectAllMonths() {
    const timePeriodSelect = document.getElementById('timePeriodSelect');
    Array.from(timePeriodSelect.options).forEach(option => {
        option.selected = true;
    });
    updateCharts();
}

function clearAllMonths() {
    const timePeriodSelect = document.getElementById('timePeriodSelect');
    Array.from(timePeriodSelect.options).forEach(option => {
        option.selected = false;
    });
    updateCharts();
}

function handleCategoryChange() {
    updateCharts();
    updateBudgetAnalysis();
    updateAIRecommendation();
}

function getSelectedCategories() {
    const categorySelect = document.getElementById('categorySelect');
    return Array.from(categorySelect.selectedOptions).map(option => option.value);
}

function getSelectedTimePeriods() {
    const timePeriodSelect = document.getElementById('timePeriodSelect');
    return Array.from(timePeriodSelect.selectedOptions).map(option => option.value);
}

function filterData() {
    const selectedCategories = getSelectedCategories();
    const selectedTimePeriods = getSelectedTimePeriods();
    
    filteredData = allData.filter(row => {
        const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(row.category);
        
        // Filter by selected months if any are selected
        let timeMatch = true;
        if (selectedTimePeriods.length > 0) {
            const rowDate = new Date(row.published_date);
            const rowMonth = rowDate.getFullYear() + '-' + String(rowDate.getMonth() + 1).padStart(2, '0');
            timeMatch = selectedTimePeriods.includes(rowMonth);
        }
        
        return categoryMatch && timeMatch;
    });
    
    return filteredData;
}

function updateCharts() {
    const data = filterData();
    const chartType = document.getElementById('chartTypeSelect').value;
    const selectedCategories = getSelectedCategories();
    
    updatePrimaryChart(data, chartType);
    updateCategoryChart(data);
    updatePredictiveChart(data, selectedCategories);
    updateGeographicChart(data);
    updateHeaderStats(data);
}

function updatePrimaryChart(data, chartType) {
    const ctx = document.getElementById('primaryChart').getContext('2d');
    
    if (charts.primary) {
        charts.primary.destroy();
    }
    
    const categoryData = getCategoryDistribution(data);
    
    const config = {
        type: chartType,
        data: {
            labels: categoryData.labels,
            datasets: [{
                label: 'Job Count',
                data: categoryData.values,
                backgroundColor: chartType === 'pie' || chartType === 'doughnut' ? 
                    colorSchemes.primary : colorSchemes.gradient,
                borderColor: colorSchemes.primary,
                borderWidth: 2,
                borderRadius: chartType === 'bar' ? 8 : 0,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: chartType === 'pie' || chartType === 'doughnut',
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: '#667eea',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true
                }
            },
            scales: chartType !== 'pie' && chartType !== 'doughnut' ? {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: '#6b7280'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#6b7280',
                        maxRotation: 45
                    }
                }
            } : {}
        }
    };
    
    charts.primary = new Chart(ctx, config);
}

function updateCategoryChart(data) {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    if (charts.category) {
        charts.category.destroy();
    }
    
    const categoryData = getCategoryDistribution(data);
    
    charts.category = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categoryData.labels,
            datasets: [{
                label: 'Job Volume',
                data: categoryData.values,
                backgroundColor: colorSchemes.gradient,
                borderColor: colorSchemes.primary,
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: '#667eea',
                    borderWidth: 1,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: '#6b7280'
                    }
                },
                y: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#6b7280'
                    }
                }
            }
        }
    });
}

// Function to generate monthly data for historical (2024) and predicted (2025) periods
function generateMonthlyData(data, selectedCategories) {
    // Create labels for all months from Jan 2024 to Dec 2025
    const labels = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // 2024 months
    for (let i = 0; i < 12; i++) {
        labels.push(`${months[i]} 2024`);
    }
    // 2025 months
    for (let i = 0; i < 12; i++) {
        labels.push(`${months[i]} 2025`);
    }
    
    const historical = {};
    const predicted = {};
    
    // Initialize data structures for each category
    selectedCategories.forEach(category => {
        historical[category] = new Array(24).fill(null); // 24 months total
        predicted[category] = new Array(24).fill(null);
    });
    
    // Process historical data (2024)
    selectedCategories.forEach(category => {
        const categoryData = data.filter(row => row.category === category);
        
        // Count jobs per month in 2024
        for (let month = 0; month < 12; month++) {
            const monthStr = `2024-${String(month + 1).padStart(2, '0')}`;
            const jobsInMonth = categoryData.filter(row => {
                const rowDate = new Date(row.published_date);
                const rowMonth = rowDate.getFullYear() + '-' + String(rowDate.getMonth() + 1).padStart(2, '0');
                return rowMonth === monthStr;
            }).length;
            
            historical[category][month] = jobsInMonth;
        }
        
        // Generate predictions for 2025 (simple trend-based prediction)
        const historicalValues = historical[category].slice(0, 12).filter(val => val !== null);
        if (historicalValues.length > 0) {
            const avgJobs = historicalValues.reduce((sum, val) => sum + val, 0) / historicalValues.length;
            const trend = historicalValues.length > 6 ? 
                (historicalValues.slice(-6).reduce((sum, val) => sum + val, 0) / 6) - 
                (historicalValues.slice(0, 6).reduce((sum, val) => sum + val, 0) / 6) : 0;
            
            // Generate predictions with some variation
            for (let month = 12; month < 24; month++) {
                const seasonalFactor = 1 + 0.1 * Math.sin((month - 12) * Math.PI / 6); // Seasonal variation
                const trendFactor = 1 + (trend / avgJobs) * (month - 11);
                const randomFactor = 0.9 + Math.random() * 0.2; // ±10% random variation
                
                predicted[category][month] = Math.max(0, Math.round(avgJobs * seasonalFactor * trendFactor * randomFactor));
            }
        }
    });
    
    return {
        labels: labels,
        historical: historical,
        predicted: predicted
    };
}

// Updated predictive chart function
function updatePredictiveChart(data, selectedCategories = []) {
    const ctx = document.getElementById('predictiveChart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (charts.predictive) {
        charts.predictive.destroy();
    }
    
    // If no categories selected, show message
    if (selectedCategories.length === 0) {
        ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
        return;
    }
    
    // Generate monthly data for 2024 (historical) and 2025 (predicted)
    const monthlyData = generateMonthlyData(data, selectedCategories);
    
    // Create datasets for each selected category
    const datasets = [];
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];
    
    selectedCategories.forEach((category, index) => {
        const color = colors[index % colors.length];
        
        // Historical data (2024) - circles
        datasets.push({
            label: `${category} (Historical)`,
            data: monthlyData.historical[category] || [],
            borderColor: color,
            backgroundColor: color + '20',
            pointBackgroundColor: color,
            pointBorderColor: color,
            pointRadius: 6,
            pointStyle: 'circle',
            tension: 0.4,
            borderWidth: 2,
            fill: false
        });
        
        // Predicted data (2025) - triangles
        datasets.push({
            label: `${category} (Predicted)`,
            data: monthlyData.predicted[category] || [],
            borderColor: color,
            backgroundColor: color + '20',
            pointBackgroundColor: color,
            pointBorderColor: color,
            pointRadius: 8,
            pointStyle: 'triangle',
            tension: 0.4,
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false
        });
    });
    
    charts.predictive = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthlyData.labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15,
                        color: '#374151',
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: '#667eea',
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        title: function(context) {
                            return context[0].label;
                        },
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y} jobs`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: '#6b7280',
                        callback: function(value) {
                            return value + ' jobs';
                        }
                    },
                    title: {
                        display: true,
                        text: 'Number of Jobs',
                        color: '#374151'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: '#6b7280'
                    },
                    title: {
                        display: true,
                        text: 'Time Period (2024-2025)',
                        color: '#374151'
                    }
                }
            },
            elements: {
                point: {
                    hoverRadius: 10
                }
            }
        }
    });
}

function updateGeographicChart(data) {
    const ctx = document.getElementById('geoChart').getContext('2d');
    
    if (charts.geographic) {
        charts.geographic.destroy();
    }
    
    const countryData = getCountryDistribution(data);
    
    charts.geographic = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: countryData.labels,
            datasets: [{
                label: 'Job Count',
                data: countryData.values,
                backgroundColor: colorSchemes.gradient,
                borderColor: colorSchemes.primary,
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: '#667eea',
                    borderWidth: 1,
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: '#6b7280'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#6b7280',
                        maxRotation: 45
                    }
                }
            }
        }
    });
}

function updateBudgetAnalysis() {
    const selectedCategories = getSelectedCategories();
    const budgetMessage = document.getElementById('budgetMessage');
    const budgetCharts = document.getElementById('budgetCharts');
    
    if (selectedCategories.length === 1) {
        budgetMessage.classList.add('hidden');
        budgetCharts.classList.remove('hidden');
        
        const category = selectedCategories[0];
        updateFixedBudgetChart(category);
        updateHourlyBudgetChart(category);
    } else {
        budgetMessage.classList.remove('hidden');
        budgetCharts.classList.add('hidden');
    }
}

function updateFixedBudgetChart(category) {
    const ctx = document.getElementById('fixedBudgetChart').getContext('2d');
    
    if (charts.fixedBudget) {
        charts.fixedBudget.destroy();
    }
    
    const fixedData = falseData.filter(row => row.category === category);
    const budgetRanges = getBudgetRanges(fixedData, 'budget');
    
    charts.fixedBudget = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: budgetRanges.labels,
            datasets: [{
                label: 'Job Count',
                data: budgetRanges.values,
                backgroundColor: colorSchemes.gradient,
                borderColor: colorSchemes.primary,
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: '#667eea',
                    borderWidth: 1,
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: '#6b7280'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#6b7280'
                    }
                }
            }
        }
    });
}

function updateHourlyBudgetChart(category) {
    const ctx = document.getElementById('hourlyBudgetChart').getContext('2d');
    
    if (charts.hourlyBudget) {
        charts.hourlyBudget.destroy();
    }
    
    const hourlyData = trueData.filter(row => row.category === category);
    const hourlyRanges = getHourlyRanges(hourlyData);
    
    charts.hourlyBudget = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hourlyRanges.labels,
            datasets: [{
                label: 'Job Count',
                data: hourlyRanges.values,
                backgroundColor: colorSchemes.gradient,
                borderColor: colorSchemes.primary,
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: '#667eea',
                    borderWidth: 1,
                    cornerRadius: 8
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: '#6b7280'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#6b7280'
                    }
                }
            }
        }
    });
}

function updateAIRecommendation() {
    const selectedCategories = getSelectedCategories();
    const recommendationMessage = document.getElementById('recommendationMessage');
    const recommendationContent = document.getElementById('recommendationContent');
    
    if (selectedCategories.length === 1) {
        recommendationMessage.classList.add('hidden');
        recommendationContent.classList.remove('hidden');
        
        const category = selectedCategories[0];
        generateAIRecommendation(category);
    } else {
        recommendationMessage.classList.remove('hidden');
        recommendationContent.classList.add('hidden');
    }
}

function generateAIRecommendation(category) {
    const categoryData = allData.filter(row => row.category === category);
    const fixedJobs = falseData.filter(row => row.category === category);
    const hourlyJobs = trueData.filter(row => row.category === category);
    
    // Calculate metrics
    const jobVolume = categoryData.length;
    const avgBudget = calculateAverageBudget(categoryData);
    const competition = calculateCompetition(category);
    const growth = calculateGrowthTrend(category);
    
    // Calculate profitability score (0-100)
    const volumeScore = Math.min(jobVolume / 10, 10) * 3; // Max 30 points
    const budgetScore = Math.min(avgBudget / 100, 10) * 4; // Max 40 points
    const competitionScore = (10 - competition) * 2; // Max 20 points (lower competition = higher score)
    const growthScore = growth * 1; // Max 10 points
    
    const profitabilityScore = Math.round(volumeScore + budgetScore + competitionScore + growthScore);
    
    // Update UI
    document.getElementById('recommendationScore').querySelector('.score-value').textContent = profitabilityScore;
    document.getElementById('jobVolume').textContent = jobVolume;
    document.getElementById('avgCategoryBudget').textContent = `$${avgBudget.toFixed(0)}`;
    document.getElementById('competitionLevel').textContent = getCompetitionLabel(competition);
    document.getElementById('growthTrend').textContent = getGrowthLabel(growth);
    
    // Generate recommendation text
    const recommendationText = generateRecommendationText(category, profitabilityScore, {
        jobVolume,
        avgBudget,
        competition,
        growth
    });
    
    document.getElementById('recommendationText').innerHTML = recommendationText;
}

function generateRecommendationText(category, score, metrics) {
    let recommendation = '';
    let reasoning = '';
    
    if (score >= 80) {
        recommendation = `<strong>Highly Recommended:</strong> ${category} is an excellent category to work in.`;
        reasoning = 'This category shows strong job volume, competitive budgets, and favorable market conditions.';
    } else if (score >= 60) {
        recommendation = `<strong>Recommended:</strong> ${category} is a good category with solid opportunities.`;
        reasoning = 'This category offers decent job opportunities with reasonable competition levels.';
    } else if (score >= 40) {
        recommendation = `<strong>Moderate Potential:</strong> ${category} has mixed opportunities.`;
        reasoning = 'Consider this category if you have specific expertise, but be aware of market challenges.';
    } else {
        recommendation = `<strong>Proceed with Caution:</strong> ${category} may have limited opportunities.`;
        reasoning = 'This category shows lower job volume or budget potential. Consider specializing or exploring alternatives.';
    }
    
    const keyFactors = [];
    if (metrics.jobVolume > 20) keyFactors.push('High job volume');
    if (metrics.avgBudget > 500) keyFactors.push('Above-average budgets');
    if (metrics.competition < 5) keyFactors.push('Low competition');
    if (metrics.growth > 5) keyFactors.push('Positive growth trend');
    
    const factorsText = keyFactors.length > 0 ? 
        `<br><br><strong>Key Factors:</strong> ${keyFactors.join(', ')}.` : '';
    
    return `${recommendation}<br><br>${reasoning}${factorsText}`;
}

// Helper functions
function getCategoryDistribution(data) {
    const distribution = {};
    data.forEach(row => {
        distribution[row.category] = (distribution[row.category] || 0) + 1;
    });
    
    const sorted = Object.entries(distribution)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    return {
        labels: sorted.map(([category]) => category),
        values: sorted.map(([, count]) => count)
    };
}

function getCountryDistribution(data) {
    const distribution = {};
    data.forEach(row => {
        if (row.country) {
            distribution[row.country] = (distribution[row.country] || 0) + 1;
        }
    });
    
    const sorted = Object.entries(distribution)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
    
    return {
        labels: sorted.map(([country]) => country),
        values: sorted.map(([, count]) => count)
    };
}

function getBudgetRanges(data, field) {
    const ranges = {
        '$0-$100': 0,
        '$100-$500': 0,
        '$500-$1000': 0,
        '$1000-$2000': 0,
        '$2000-$5000': 0,
        '$5000+': 0
    };
    
    data.forEach(row => {
        const value = parseFloat(row[field]) || 0;
        if (value <= 100) ranges['$0-$100']++;
        else if (value <= 500) ranges['$100-$500']++;
        else if (value <= 1000) ranges['$500-$1000']++;
        else if (value <= 2000) ranges['$1000-$2000']++;
        else if (value <= 5000) ranges['$2000-$5000']++;
        else ranges['$5000+']++;
    });
    
    return {
        labels: Object.keys(ranges),
        values: Object.values(ranges)
    };
}

function getHourlyRanges(data) {
    const ranges = {
        '$0-$15': 0,
        '$15-$30': 0,
        '$30-$50': 0,
        '$50-$75': 0,
        '$75-$100': 0,
        '$100+': 0
    };
    
    data.forEach(row => {
        const low = parseFloat(row.hourly_low) || 0;
        const high = parseFloat(row.hourly_high) || 0;
        const avg = (low + high) / 2;
        
        if (avg <= 15) ranges['$0-$15']++;
        else if (avg <= 30) ranges['$15-$30']++;
        else if (avg <= 50) ranges['$30-$50']++;
        else if (avg <= 75) ranges['$50-$75']++;
        else if (avg <= 100) ranges['$75-$100']++;
        else ranges['$100+']++;
    });
    
    return {
        labels: Object.keys(ranges),
        values: Object.values(ranges)
    };
}

function generateHistoricalData(data) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const values = [];
    
    // Generate realistic historical data based on current data
    const baseValue = data.length;
    for (let i = 0; i < 6; i++) {
        const variation = (Math.random() - 0.5) * 0.3; // ±15% variation
        values.push(Math.round(baseValue * (1 + variation)));
    }
    
    return { labels: months, values };
}

function generatePredictedData(historicalData) {
    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const values = [];
    
    // Simple trend prediction based on historical data
    const trend = (historicalData.values[5] - historicalData.values[0]) / 5;
    let lastValue = historicalData.values[5];
    
    for (let i = 0; i < 6; i++) {
        lastValue += trend + (Math.random() - 0.5) * 10;
        values.push(Math.max(0, Math.round(lastValue)));
    }
    
    return { labels: months, values };
}

function calculateAverageBudget(data) {
    const budgets = data.map(row => {
        if (row.is_hourly) {
            const low = parseFloat(row.hourly_low) || 0;
            const high = parseFloat(row.hourly_high) || 0;
            return (low + high) / 2 * 40; // Assume 40 hours per week
        } else {
            return parseFloat(row.budget) || 0;
        }
    }).filter(budget => budget > 0);
    
    return budgets.length > 0 ? budgets.reduce((a, b) => a + b, 0) / budgets.length : 0;
}

function calculateCompetition(category) {
    // Mock competition calculation (1-10 scale)
    const categoryData = allData.filter(row => row.category === category);
    const jobCount = categoryData.length;
    
    // Higher job count = higher competition
    if (jobCount > 50) return 8 + Math.random() * 2;
    if (jobCount > 20) return 5 + Math.random() * 3;
    if (jobCount > 10) return 3 + Math.random() * 3;
    return 1 + Math.random() * 3;
}

function calculateGrowthTrend(category) {
    // Mock growth calculation (0-10 scale)
    return Math.random() * 10;
}

function getCompetitionLabel(competition) {
    if (competition >= 8) return 'High';
    if (competition >= 5) return 'Medium';
    return 'Low';
}

function getGrowthLabel(growth) {
    if (growth >= 7) return 'Strong Growth';
    if (growth >= 4) return 'Moderate Growth';
    return 'Stable';
}

function updateHeaderStats(data) {
    const totalJobs = data.length;
    const avgBudget = calculateAverageBudget(data);
    const categoryDist = getCategoryDistribution(data);
    const topCategory = categoryDist.labels[0] || 'N/A';
    
    document.getElementById('totalJobs').textContent = totalJobs.toLocaleString();
    document.getElementById('avgBudget').textContent = `$${avgBudget.toFixed(0)}`;
    document.getElementById('topCategory').textContent = topCategory;
}

function updateSummaryStats() {
    // Fixed budget average
    const fixedBudgets = falseData.map(row => parseFloat(row.budget) || 0).filter(b => b > 0);
    const fixedAvg = fixedBudgets.length > 0 ? fixedBudgets.reduce((a, b) => a + b, 0) / fixedBudgets.length : 0;
    
    // Hourly rate average
    const hourlyRates = trueData.map(row => {
        const low = parseFloat(row.hourly_low) || 0;
        const high = parseFloat(row.hourly_high) || 0;
        return (low + high) / 2;
    }).filter(r => r > 0);
    const hourlyAvg = hourlyRates.length > 0 ? hourlyRates.reduce((a, b) => a + b, 0) / hourlyRates.length : 0;
    
    // Overall average
    const overallAvg = calculateAverageBudget(allData);
    
    document.getElementById('fixedBudgetAvg').textContent = `$${fixedAvg.toFixed(0)}`;
    document.getElementById('hourlyRateAvg').textContent = `$${hourlyAvg.toFixed(0)}/hr`;
    document.getElementById('overallAvg').textContent = `$${overallAvg.toFixed(0)}`;
    
    document.getElementById('fixedJobsCount').textContent = falseData.length.toLocaleString();
    document.getElementById('hourlyJobsCount').textContent = trueData.length.toLocaleString();
    document.getElementById('totalCategories').textContent = categories.length;
}

// Export functions
function exportChart() {
    if (charts.primary) {
        const link = document.createElement('a');
        link.download = 'upwork-chart.png';
        link.href = charts.primary.toBase64Image();
        link.click();
    }
}

function exportReport() {
    // Create a simple report
    const selectedCategories = getSelectedCategories();
    const data = filterData();
    
    let report = `Upwork Job Analysis Report\n`;
    report += `Generated on: ${new Date().toLocaleDateString()}\n\n`;
    report += `Total Jobs Analyzed: ${data.length}\n`;
    report += `Categories Selected: ${selectedCategories.join(', ')}\n`;
    report += `Average Budget: $${calculateAverageBudget(data).toFixed(0)}\n\n`;
    
    const categoryDist = getCategoryDistribution(data);
    report += `Top Categories:\n`;
    categoryDist.labels.forEach((cat, i) => {
        report += `${i + 1}. ${cat}: ${categoryDist.values[i]} jobs\n`;
    });
    
    const blob = new Blob([report], { type: 'text/plain' });
    const link = document.createElement('a');
    link.download = 'upwork-report.txt';
    link.href = URL.createObjectURL(blob);
    link.click();
}

function refreshData() {
    showLoadingScreen();
    setTimeout(() => {
        updateCharts();
        updateSummaryStats();
        hideLoadingScreen();
    }, 1000);
}

// Initialize charts object
charts = {
    primary: null,
    category: null,
    predictive: null,
    geographic: null,
    fixedBudget: null,
    hourlyBudget: null
};

