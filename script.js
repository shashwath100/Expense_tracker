// ── DOM References ─────────────────────────────────────────
const balanceEl = document.getElementById('balance');
const moneyPlus = document.getElementById('money-plus');
const moneyMinus = document.getElementById('money-minus');
const list = document.getElementById('list');
const form = document.getElementById('form');
const textInput = document.getElementById('text');
const amountInput = document.getElementById('amount');
const dateInput = document.getElementById('date');
const categoryEl = document.getElementById('category');
const searchInput = document.getElementById('search');
const emptyState = document.getElementById('empty-state');
const headerDate = document.getElementById('header-date');
const btnIncome = document.getElementById('btn-income');
const btnExpense = document.getElementById('btn-expense');
const currencySelect = document.getElementById('currency-select');
const amountCurrLabel = document.getElementById('amount-currency-label');

// ── Currency Config ────────────────────────────────────────
// Maps currency code → { locale, symbol }
const CURRENCIES = {
    USD: { locale: 'en-US', symbol: '$' },
    INR: { locale: 'en-IN', symbol: '₹' },
    EUR: { locale: 'de-DE', symbol: '€' },
    GBP: { locale: 'en-GB', symbol: '£' },
    JPY: { locale: 'ja-JP', symbol: '¥' },
    CNY: { locale: 'zh-CN', symbol: '¥' },
    AED: { locale: 'ar-AE', symbol: 'د.إ' },
    AUD: { locale: 'en-AU', symbol: 'A$' },
    CAD: { locale: 'en-CA', symbol: 'C$' },
    SGD: { locale: 'en-SG', symbol: 'S$' },
    CHF: { locale: 'de-CH', symbol: 'Fr' },
    MYR: { locale: 'ms-MY', symbol: 'RM' },
    BRL: { locale: 'pt-BR', symbol: 'R$' },
    ZAR: { locale: 'en-ZA', symbol: 'R' },
    MXN: { locale: 'es-MX', symbol: 'MX$' },
    IDR: { locale: 'id-ID', symbol: 'Rp' },
    PKR: { locale: 'ur-PK', symbol: '₨' },
    BDT: { locale: 'bn-BD', symbol: '৳' },
    NGN: { locale: 'en-NG', symbol: '₦' },
    KRW: { locale: 'ko-KR', symbol: '₩' },
};

// ── State ──────────────────────────────────────────────────
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let currentType = 'income';
let activeCurrency = localStorage.getItem('currency') || 'USD';
let barChart, pieChart;

// ── Category Icons ─────────────────────────────────────────
const categoryIcons = {
    General: '📋',
    Food: '🍔',
    Transport: '🚗',
    Shopping: '🛍️',
    Health: '💊',
    Entertainment: '🎬',
    Bills: '🧾',
    Salary: '💼',
    Investment: '📈',
    Other: '📦',
};

// ── Format Currency ────────────────────────────────────────
function formatCurrency(val) {
    const { locale } = CURRENCIES[activeCurrency] || CURRENCIES['USD'];
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: activeCurrency,
        maximumFractionDigits: ['JPY', 'KRW', 'IDR'].includes(activeCurrency) ? 0 : 2,
    }).format(val);
}

function getCurrencySymbol() {
    return (CURRENCIES[activeCurrency] || CURRENCIES['USD']).symbol;
}

// ── Init ───────────────────────────────────────────────────
function init() {
    // Restore saved currency
    currencySelect.value = activeCurrency;
    updateAmountLabel();

    // Set today's date as default
    dateInput.value = new Date().toISOString().split('T')[0];

    // Header date
    headerDate.textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    renderAll();
}

// ── Currency Change ────────────────────────────────────────
currencySelect.addEventListener('change', () => {
    activeCurrency = currencySelect.value;
    localStorage.setItem('currency', activeCurrency);
    updateAmountLabel();
    renderAll();
});

function updateAmountLabel() {
    amountCurrLabel.textContent = getCurrencySymbol();
}

// ── Type Toggle ────────────────────────────────────────────
btnIncome.addEventListener('click', () => setType('income'));
btnExpense.addEventListener('click', () => setType('expense'));

function setType(type) {
    currentType = type;
    btnIncome.classList.toggle('active', type === 'income');
    btnExpense.classList.toggle('active', type === 'expense');
}

// ── Add Transaction ────────────────────────────────────────
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const desc = textInput.value.trim();
    const amt = parseFloat(amountInput.value);
    const date = dateInput.value;
    const cat = categoryEl.value;

    if (!desc || isNaN(amt) || amt <= 0 || !date) {
        shakeForm();
        return;
    }

    const transaction = {
        id: Date.now(),
        text: desc,
        amount: currentType === 'expense' ? -Math.abs(amt) : Math.abs(amt),
        date,
        category: cat,
    };

    transactions.push(transaction);
    saveToStorage();
    renderAll();

    // Reset form
    textInput.value = '';
    amountInput.value = '';
    dateInput.value = new Date().toISOString().split('T')[0];
    categoryEl.value = 'General';
    setType('income');
});

function shakeForm() {
    form.style.animation = 'none';
    form.offsetHeight;
    form.style.animation = 'shake 0.3s ease';
}

// ── Remove Transaction ─────────────────────────────────────
function removeTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveToStorage();
    renderAll();
}

// ── Render All ─────────────────────────────────────────────
function renderAll() {
    renderList(transactions);
    updateSummary();
    renderCharts();
}

// ── Render List ────────────────────────────────────────────
function renderList(data) {
    list.innerHTML = '';

    const query = searchInput.value.toLowerCase();
    const filtered = data.filter(t =>
        t.text.toLowerCase().includes(query) ||
        (t.category || '').toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';

    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(t => {
        const isIncome = t.amount >= 0;
        const cls = isIncome ? 'plus' : 'minus';
        const icon = categoryIcons[t.category] || '📋';
        const dateStr = t.date
            ? new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '';
        const amtFormatted = (isIncome ? '+' : '-') + formatCurrency(Math.abs(t.amount));

        const li = document.createElement('li');
        li.classList.add(cls);
        li.innerHTML = `
      <div class="tx-icon">${icon}</div>
      <div class="tx-info">
        <div class="tx-desc">${escapeHtml(t.text)}</div>
        <div class="tx-meta">${t.category || 'General'} · ${dateStr}</div>
      </div>
      <span class="tx-amount ${cls}">${amtFormatted}</span>
      <button class="delete-btn" onclick="removeTransaction(${t.id})" title="Delete">✕</button>
    `;
        list.appendChild(li);
    });
}

// ── Update Summary ─────────────────────────────────────────
function updateSummary() {
    const amounts = transactions.map(t => t.amount);
    const total = amounts.reduce((a, b) => a + b, 0);
    const income = amounts.filter(a => a > 0).reduce((a, b) => a + b, 0);
    const expense = amounts.filter(a => a < 0).reduce((a, b) => a + b, 0);

    balanceEl.textContent = formatCurrency(total);
    moneyPlus.textContent = '+' + formatCurrency(income);
    moneyMinus.textContent = '-' + formatCurrency(Math.abs(expense));
}

// ── Charts ─────────────────────────────────────────────────
function renderCharts() {
    renderBarChart();
    renderPieChart();
}

function renderBarChart() {
    const income = transactions.filter(t => t.amount > 0).reduce((a, t) => a + t.amount, 0);
    const expense = transactions.filter(t => t.amount < 0).reduce((a, t) => a + Math.abs(t.amount), 0);
    const sym = getCurrencySymbol();

    const ctx = document.getElementById('barChart').getContext('2d');
    if (barChart) barChart.destroy();

    barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Income', 'Expenses'],
            datasets: [{
                data: [income, expense],
                backgroundColor: ['rgba(34,197,94,0.25)', 'rgba(239,68,68,0.25)'],
                borderColor: ['#22c55e', '#ef4444'],
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ' ' + formatCurrency(ctx.parsed.y),
                    },
                },
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#8892a4', font: { family: 'Inter', size: 12 } },
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: '#8892a4',
                        font: { family: 'Inter', size: 12 },
                        callback: v => sym + v.toLocaleString(),
                    },
                    beginAtZero: true,
                },
            },
        },
    });
}

function renderPieChart() {
    const expenseMap = {};
    transactions
        .filter(t => t.amount < 0)
        .forEach(t => {
            const cat = t.category || 'Other';
            expenseMap[cat] = (expenseMap[cat] || 0) + Math.abs(t.amount);
        });

    const labels = Object.keys(expenseMap);
    const data = Object.values(expenseMap);
    const palette = [
        '#6c63ff', '#22c55e', '#ef4444', '#f59e0b',
        '#3b82f6', '#ec4899', '#14b8a6', '#a78bfa',
        '#fb923c', '#84cc16',
    ];

    const ctx = document.getElementById('pieChart').getContext('2d');
    if (pieChart) pieChart.destroy();

    if (data.length === 0) {
        pieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['No expenses yet'],
                datasets: [{ data: [1], backgroundColor: ['#2e3250'], borderWidth: 0 }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#8892a4', font: { family: 'Inter', size: 12 } } },
                    tooltip: { enabled: false },
                },
                cutout: '65%',
            },
        });
        return;
    }

    pieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: palette.slice(0, labels.length),
                borderColor: '#1a1d27',
                borderWidth: 3,
                hoverOffset: 6,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#8892a4',
                        font: { family: 'Inter', size: 11 },
                        boxWidth: 12,
                        padding: 10,
                    },
                },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}`,
                    },
                },
            },
            cutout: '60%',
        },
    });
}

// ── Search ─────────────────────────────────────────────────
searchInput.addEventListener('input', () => renderList(transactions));

// ── Helpers ────────────────────────────────────────────────
function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function saveToStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Shake animation
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%,60%  { transform: translateX(-6px); }
    40%,80%  { transform: translateX(6px); }
  }
`;
document.head.appendChild(style);

// ── Start ──────────────────────────────────────────────────
init();
