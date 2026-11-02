const state = {
  total: 0,
  q: '',
  fuente: '',
  categoria: '',
  dateStart: '',
  dateEnd: '',
  amountMin: '',
  amountMax: '',
  sortBy: 'f_valor',
  sortDir: 'desc',
};
const movimientosPageSize = 100;
let movimientosPage = 0;
let movimientosLoading = false;
let movimientosRequestId = 0;
const movimientoRecords = new Map();
const dashboardMovementsPageSize = 100;
let dashboardMovementsPage = 0;
let dashboardMovementsTotal = 0;
let dashboardMovementsLoading = false;
let dashboardMovementsRequestId = 0;
let dashboardMovementsParams = new URLSearchParams();
let dashboardRequestId = 0;

const summaryEl = document.getElementById('summary');
const themeToggle = document.getElementById('themeToggle');
const refreshDataBtn = document.getElementById('refreshDataBtn');
const tableBody = document.getElementById('movimientosBody');
const searchInput = document.getElementById('searchInput');
const fuenteFilter = document.getElementById('fuenteFilter');
const categoriaFilter = document.getElementById('categoriaFilter');
const movimientosCountEl = document.getElementById('movimientosCount');
const newMovementBtn = document.getElementById('newMovement');
const dateStartFilter = document.getElementById('dateStartFilter');
const dateEndFilter = document.getElementById('dateEndFilter');
const amountMinFilter = document.getElementById('amountMinFilter');
const amountMaxFilter = document.getElementById('amountMaxFilter');
const exportExcelBtn = document.getElementById('exportExcel');
const modal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const modalTitle = document.getElementById('modalTitle');
const categoryModal = document.getElementById('categoryModal');
const categoryForm = document.getElementById('categoryForm');
const categoryModalTitle = document.getElementById('categoryModalTitle');
const categoryMovementSummary = document.getElementById('categoryMovementSummary');
const quickCategorySelect = document.getElementById('quickCategorySelect');
const categoryModalError = document.getElementById('categoryModalError');
const saveQuickCategoryBtn = document.getElementById('saveQuickCategoryBtn');
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const deleteConfirmTitle = document.getElementById('deleteConfirmTitle');
const deleteConfirmText = document.getElementById('deleteConfirmText');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const importPreviewModal = document.getElementById('importPreviewModal');
const importPreviewSummary = document.getElementById('importPreviewSummary');
const importPreviewRows = document.getElementById('importPreviewRows');
const importRowEditModal = document.getElementById('importRowEditModal');
const importRowEditForm = document.getElementById('importRowEditForm');
const importRowCategory = document.getElementById('importRowCategory');
const importRowComments = document.getElementById('importRowComments');
const importRowEditError = document.getElementById('importRowEditError');
const confirmImportBtn = document.getElementById('confirmImportBtn');
const tabMovimientos = document.getElementById('tabMovimientos');
const tabDashboard = document.getElementById('tabDashboard');
const tabBalances = document.getElementById('tabBalances');
const tabImport = document.getElementById('tabImport');
const tabConfig = document.getElementById('tabConfig');
const tabBudgets = document.getElementById('tabBudgets');
const tabSavings = document.getElementById('tabSavings');
const movimientosView = document.getElementById('movimientosView');
const dashboardView = document.getElementById('dashboardView');
const balancesView = document.getElementById('balancesView');
const importView = document.getElementById('importView');
const configView = document.getElementById('configView');
const budgetsView = document.getElementById('budgetsView');
const savingsView = document.getElementById('savingsView');
const accountConfigBody = document.getElementById('accountConfigBody');
const accountConfigStatus = document.getElementById('accountConfigStatus');
const categoryConfigForm = document.getElementById('categoryConfigForm');
const categoryConfigRows = document.getElementById('categoryConfigRows');
const categoryConfigStatus = document.getElementById('categoryConfigStatus');
const budgetConfigBody = document.getElementById('budgetConfigBody');
const budgetConfigStatus = document.getElementById('budgetConfigStatus');
const balanceHistoryMonthsInput = document.getElementById('balanceHistoryMonths');
const balanceHistoryConfigStatus = document.getElementById('balanceHistoryConfigStatus');
const budgetMonth = document.getElementById('budgetMonth');
const budgetRows = document.getElementById('budgetRows');
const budgetTotals = document.getElementById('budgetTotals');
const annualBudgetSummary = document.getElementById('annualBudgetSummary');
const annualBudgetRows = document.getElementById('annualBudgetRows');
const annualBudgetTotals = document.getElementById('annualBudgetTotals');
const annualBudgetYearInput = document.getElementById('annualBudgetYear');
const budgetBudgetHeader = document.getElementById('budgetBudgetHeader');
const budgetActualHeader = document.getElementById('budgetActualHeader');
const budgetConfigYearInput = document.getElementById('budgetConfigYear');
const budgetMovementCache = new Map();
const savingsRows = document.getElementById('savingsRows');
const savingsTableHeader = document.getElementById('savingsTableHeader');
const savingsChartCanvas = document.getElementById('savingsChart');
const savingsColumnsChartCanvas = document.getElementById('savingsColumnsChart');
const savingsColumnToggles = document.getElementById('savingsColumnToggles');
const savingsStatus = document.getElementById('savingsStatus');
const savingsModal = document.getElementById('savingsModal');
const savingsForm = document.getElementById('savingsForm');
const savingsModalTitle = document.getElementById('savingsModalTitle');
const savingsProjectionYearsInput = document.getElementById('savingsProjectionYears');
const savingsStartDateInput = document.getElementById('savingsStartDate');
const savingsEndDateInput = document.getElementById('savingsEndDate');
const savingsDateRangeStatus = document.getElementById('savingsDateRangeStatus');
const savingsProjectionConfigStatus = document.getElementById('savingsProjectionConfigStatus');
const savingsChartColumnsConfig = document.getElementById('savingsChartColumnsConfig');
const savingsSnapshotSelect = document.getElementById('savingsSnapshotSelect');
const savingsShowRecalculatedInput = document.getElementById('savingsShowRecalculated');
const savingsFreezeReminder = document.getElementById('savingsFreezeReminder');
const savingsDeviationCard = document.getElementById('savingsDeviationCard');
const savingsDeviationRows = document.getElementById('savingsDeviationRows');
const freezeSavingsForecastBtn = document.getElementById('freezeSavingsForecast');
const forecastBaseMonthlyInput = document.getElementById('forecastBaseMonthly');
const forecastInvestedMonthlyInput = document.getElementById('forecastInvestedMonthly');
const forecastExtraPaysInput = document.getElementById('forecastExtraPays');
const forecastInvestedAccounts = document.getElementById('forecastInvestedAccounts');
const forecastScenarioRows = document.getElementById('forecastScenarioRows');
const forecastScenarioHead = document.getElementById('forecastScenarioHead');
const forecastInterestInputs = {
  active: document.getElementById('forecastInterestActive'),
  bankinterBalance: document.getElementById('forecastBankinterBalance'),
  bankinterInitialRate: document.getElementById('forecastBankinterInitialRate'),
  bankinterInitialEnd: document.getElementById('forecastBankinterInitialEnd'),
  bankinterLaterRate: document.getElementById('forecastBankinterLaterRate'),
  bankinterMonths: document.getElementById('forecastBankinterMonths'),
  pibankCapital: document.getElementById('forecastPibankCapital'),
  pibankRate: document.getElementById('forecastPibankRate'),
  pibankMaturity: document.getElementById('forecastPibankMaturity'),
};
const savingsModalColumnsConfig = document.getElementById('savingsModalColumnsConfig');
const savingsColumnsConfigStatus = document.getElementById('savingsColumnsConfigStatus');
const exportSavingsExcelBtn = document.getElementById('exportSavingsExcel');
const importSummaryBadge = document.getElementById('importSummaryBadge');
const importStatusText = document.getElementById('importStatusText');
const importTabRows = document.getElementById('importTabRows');
const importBankFilter = document.getElementById('importBankFilter');
const importSearchInput = document.getElementById('importSearchInput');
const importSelectAll = document.getElementById('importSelectAll');
const confirmImportTabBtn = document.getElementById('confirmImportTabBtn');
const dashboardBankButtons = document.getElementById('dashboardBankButtons');
const dashboardTotal = document.getElementById('dashboardTotal');
const dashboardTotalIncludingExcluded = document.getElementById('dashboardTotalIncludingExcluded');
const dashboardBankTotals = document.getElementById('dashboardBankTotals');
const balanceHistoryChart = document.getElementById('balanceHistoryChart');
const balanceChartWrap = document.getElementById('balanceChartWrap');
const balanceChartTooltip = document.getElementById('balanceChartTooltip');
const balanceChartSummary = document.getElementById('balanceChartSummary');
const balanceBanksSummary = document.getElementById('balanceBanksSummary');
const balanceChartLegend = document.getElementById('balanceChartLegend');
const balanceHistoryRows = document.getElementById('balanceHistoryRows');
const balanceMonthSelect = document.getElementById('balanceMonthSelect');
const dashboardCategoryVisuals = document.getElementById('dashboardVisuals');
const dashboardCategoryLevels = ['categoria0', 'categoria1', 'categoria2'];
const dashboardCategoryViews = {
  categoria0: {
    chart: document.getElementById('dashboardChart0'),
    legend: document.getElementById('dashboardChartLegend0'),
    body: document.getElementById('dashboardBody0'),
  },
  categoria1: {
    chart: document.getElementById('dashboardChart1'),
    legend: document.getElementById('dashboardChartLegend1'),
    body: document.getElementById('dashboardBody1'),
  },
  categoria2: {
    chart: document.getElementById('dashboardChart2'),
    legend: document.getElementById('dashboardChartLegend2'),
    body: document.getElementById('dashboardBody2'),
  },
};
const dashboardDateLabel = document.getElementById('dashboardDateLabel');
const dateStartSlider = document.getElementById('dateStartSlider');
const dateEndSlider = document.getElementById('dateEndSlider');
const clearDashboardDateFilter = document.getElementById('clearDashboardDateFilter');
const dateRangeStartText = document.getElementById('dateRangeStartText');
const dateRangeEndText = document.getElementById('dateRangeEndText');
const dashboardMovementsSummary = document.getElementById('dashboardMovementsSummary');
const dashboardMovementsRows = document.getElementById('dashboardMovementsRows');
const dashboardMovementsWrap = dashboardMovementsRows.closest('.table-wrap');
const movimientosTableWrap = tableBody.closest('.table-wrap');

let selectedBanks = null;
let selectedDashboardCategories = {
  categoria0: null,
  categoria1: null,
  categoria2: null,
};
let pendingDeleteId = null;
let pendingDeleteAction = null;
let categoryMovementId = null;
let activeRangePreset = null;
let activeViewName = 'dashboard';
let currentImportRows = [];
let currentImportFilesCount = 0;
let selectedImportKeys = new Set();
let pendingImportOverrides = new Map();
let editingImportKey = null;
let savingsChartInstance = null;
let savingsColumnsChartInstance = null;
let savingsRecords = [];
let savingsForecast = null;
let savingsSelectedSnapshotId = null;
let savedSavingsProjectionYears = '5';
let savedSavingsStartDate = '';
let savedSavingsEndDate = '';
const savingsBalanceFields = [
  'Ahorro BBVA',
  'Ahorro Bankinter',
  'Ahorro N26',
  'Ahorro Trade Republic',
  'Ahorro Revolut',
  'Ahorro PIBANK',
  'Trade Wallet',
  'Kraken Wallet',
  'Ahorro Acciones',
  'UBS Acciones',
  'PPI BBVA',
];
let savedSavingsChartColumns = [...savingsBalanceFields];
let savedSavingsModalColumns = [...savingsBalanceFields];
const tableSortStates = new WeakMap();
let dashboardRange = {
  min: null,
  max: null,
  start: null,
  end: null,
};

function getTableRows(tbody) {
  return [...tbody.rows].filter((row) => !row.querySelector('.empty'));
}

function getSortableValue(cell) {
  const value = cell?.textContent.trim() || '';
  const dateMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dateMatch) {
    return { type: 'number', value: Date.UTC(Number(dateMatch[3]), Number(dateMatch[2]) - 1, Number(dateMatch[1])) };
  }
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(value)) {
    return { type: 'number', value: Date.parse(value.length === 7 ? `${value}-01` : value) };
  }

  const numeric = value.replace(/[€\s]/g, '').replace(/[^\d,.-]/g, '');
  if (numeric && /^-?[\d.]+(?:,\d+)?$/.test(numeric)) {
    const sign = /^\(.*\)$/.test(value) ? -1 : 1;
    return { type: 'number', value: sign * Number(numeric.replace(/\./g, '').replace(',', '.')) };
  }
  return { type: 'text', value: value.toLocaleLowerCase('es') };
}

function compareTableCells(left, right) {
  const a = getSortableValue(left);
  const b = getSortableValue(right);
  if (a.type === 'number' && b.type === 'number') return a.value - b.value;
  return String(a.value).localeCompare(String(b.value), 'es', { numeric: true, sensitivity: 'base' });
}

function sortTableBody(table, tbody, columnIndex, direction) {
  const rows = getTableRows(tbody);
  if (rows.length < 2) return;

  const chunks = [];
  if (table.classList.contains('budget-table') && tbody.id === 'budgetRows') {
    rows.forEach((row) => {
      if (row.classList.contains('budget-group-row')) chunks.push({ rows: [row], keyRow: row });
      else if (chunks.length) {
        chunks[chunks.length - 1].rows.push(row);
        if (!chunks[chunks.length - 1].keyRow.cells[columnIndex]?.textContent.trim()) {
          chunks[chunks.length - 1].keyRow = row;
        }
      } else chunks.push({ rows: [row], keyRow: row });
    });
  } else {
    rows.forEach((row) => chunks.push({ rows: [row], keyRow: row }));
  }

  chunks.sort((a, b) => compareTableCells(a.keyRow.cells[columnIndex], b.keyRow.cells[columnIndex]) * direction);
  chunks.forEach((chunk) => tbody.append(...chunk.rows));
}

function setTableSort(table, columnIndex, direction, bodies = [...table.tBodies]) {
  tableSortStates.set(table, { columnIndex, direction });
  [...(table.tHead?.rows[0]?.cells || [])].forEach((header, index) => {
    header.setAttribute('aria-sort', index === columnIndex
      ? direction === -1 ? 'descending' : 'ascending'
      : 'none');
  });
  bodies.forEach((tbody) => sortTableBody(table, tbody, columnIndex, direction));
}

function initializeTableSort(table, bodies = [...table.tBodies]) {
  const headers = [...(table.tHead?.rows[0]?.cells || [])];
  headers.forEach((header) => {
    if (table.classList.contains('movimientos-table') && !header.dataset.sortKey) return;
    header.tabIndex = 0;
    header.classList.add('sortable-header');
    header.setAttribute('aria-sort', 'none');
  });
  if (table.classList.contains('movimientos-table')) {
    const defaultHeader = headers.find((header) => header.dataset.sortKey === state.sortBy);
    if (defaultHeader) defaultHeader.setAttribute('aria-sort', 'descending');
    return;
  }
  const defaultColumn = headers.findIndex((header) => /^\s*(fecha|mes|día|dia)(?:\s|$)/i.test(header.textContent));
  if (defaultColumn >= 0) setTableSort(table, defaultColumn, -1, bodies);
  else tableSortStates.delete(table);
}

function applyDefaultTableSort(tbody) {
  const table = tbody.closest('table');
  const headers = [...(table?.tHead?.rows[0]?.cells || [])];
  const dateColumn = headers.findIndex((header) => /^\s*(fecha|mes|día|dia)(?:\s|$)/i.test(header.textContent));
  if (table && dateColumn >= 0) setTableSort(table, dateColumn, -1, [tbody]);
}

function initializeSortableTables() {
  document.querySelectorAll('table').forEach((table) => initializeTableSort(table));

  document.addEventListener('click', (event) => {
    const header = event.target.closest('th.sortable-header');
    if (!header || event.target.closest('input, button, a')) return;
    const table = header.closest('table');
    if (table?.classList.contains('movimientos-table')) {
      const sortBy = header.dataset.sortKey;
      if (!sortBy) return;
      state.sortDir = state.sortBy === sortBy && state.sortDir === 'asc' ? 'desc' : 'asc';
      state.sortBy = sortBy;
      updateMovimientosSortIndicators(table);
      loadMovimientos();
      return;
    }
    const columnIndex = header.cellIndex;
    const currentSort = tableSortStates.get(table);
    const direction = currentSort?.columnIndex === columnIndex
      ? currentSort.direction * -1
      : 1;
    setTableSort(table, columnIndex, direction);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const header = event.target.closest('th.sortable-header');
    if (!header || event.target.closest('input, button, a')) return;
    event.preventDefault();
    header.click();
  });
}

function updateMovimientosSortIndicators(table = tableBody.closest('table')) {
  [...table.tHead.rows[0].cells].forEach((header) => {
    header.setAttribute('aria-sort', header.dataset.sortKey === state.sortBy
      ? state.sortDir === 'asc' ? 'ascending' : 'descending'
      : 'none');
  });
}

function money(value) {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = Number(value || 0) / 100;
  return `${numeric.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

async function fetchJson(url, options = {}) {
  const requestUrl = new URL(url, window.location.origin);
  if (!options.method || options.method.toUpperCase() === 'GET') {
    requestUrl.searchParams.set('_t', String(Date.now()));
  }

  const response = await fetch(requestUrl.toString(), {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    ...options,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Error en la petición');
  }
  return payload;
}

function renderSummary(data) {
  if (!summaryEl) return;
  summaryEl.innerHTML = '';
}

function populateSelect(selectEl, options, placeholder) {
  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.textContent = placeholder;
  selectEl.innerHTML = '';
  selectEl.appendChild(placeholderOption);

  options.forEach((option) => {
    const optionEl = document.createElement('option');
    optionEl.value = option;
    optionEl.textContent = option;
    selectEl.appendChild(optionEl);
  });
}

function formatMoneyFromCents(value) {
  const numeric = Number(value || 0) / 100;
  return `${numeric.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function formatEuroInputFromCents(value) {
  return (Number(value) / 100).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseEuroInputToCents(value) {
  let normalized = String(value).trim().replace(/[\s€]/g, '');
  if (normalized.includes(',')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  }
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function formatDateValue(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatMonthValue(value) {
  if (!value) return '—';
  const month = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(month.getTime())) return value;
  return month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

function formatShortDate(value) {
  if (!value && value !== 0) return '—';

  const raw = String(value).trim();
  if (!raw) return '—';

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }

  const parts = raw.split(/[\/\-]/);
  if (parts.length === 3) {
    const [first, second, third] = parts;
    if (/^\d{4}$/.test(third)) {
      return `${first}/${second}/${third}`;
    }
    if (/^\d{4}$/.test(first)) {
      return `${third}/${second}/${first}`;
    }
    if (/^\d{2}$/.test(first) && /^\d{2}$/.test(second)) {
      return `${first}/${second}/${third}`;
    }
  }

  return raw;
}

function toDateValue(date) {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function daysBetween(start, end) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((new Date(end) - new Date(start)) / oneDay);
}

function setRangeShortcutState() {
  document.querySelectorAll('.range-shortcut').forEach((button) => {
    const isActive = button.dataset.range === activeRangePreset;
    button.classList.toggle('active', isActive);
  });
}

function resetDashboardDateRange() {
  activeRangePreset = 'all';
  setRangeShortcutState();
  if (!dashboardRange.min || !dashboardRange.max) return;
  dateStartSlider.value = '0';
  dateEndSlider.value = String(Math.max(1, daysBetween(dashboardRange.min, dashboardRange.max)));
  syncDashboardDateInputs();
}

function applyRangePreset(preset) {
  if (!dashboardRange.min || !dashboardRange.max) return;

  const today = new Date();
  let startDate;
  let endDate;

  if (preset === 'year') {
    startDate = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  } else if (preset === 'prev-month') {
    startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    endDate = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
  } else {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
  }

  if (startDate < dashboardRange.min) startDate = new Date(dashboardRange.min);
  if (endDate > dashboardRange.max) endDate = new Date(dashboardRange.max);
  if (startDate > endDate) startDate = new Date(endDate);

  activeRangePreset = preset;
  setRangeShortcutState();

  const totalDays = Math.max(1, daysBetween(dashboardRange.min, dashboardRange.max));
  const startIndex = Math.min(totalDays, Math.max(0, daysBetween(dashboardRange.min, startDate)));
  const endIndex = Math.min(totalDays, Math.max(0, daysBetween(dashboardRange.min, endDate)));

  dateStartSlider.value = String(startIndex);
  dateEndSlider.value = String(endIndex);
  dashboardRange.start = startDate;
  dashboardRange.end = endDate;

  dateRangeStartText.textContent = formatDateValue(toDateValue(dashboardRange.start));
  dateRangeEndText.textContent = formatDateValue(toDateValue(dashboardRange.end));
  dashboardDateLabel.textContent = `${dateRangeStartText.textContent} - ${dateRangeEndText.textContent}`;
  updateRangeSliderVisual();
  loadDashboard();
}

function updateRangeSliderVisual() {
  const wrap = document.querySelector('.range-slider-wrap');
  if (!wrap) return;

  const min = Number(dateStartSlider.min || 0);
  const max = Math.max(Number(dateEndSlider.max || 1), 1);
  const start = Number(dateStartSlider.value || min);
  const end = Number(dateEndSlider.value || max);
  const startPct = ((start - min) / (max - min || 1)) * 100;
  const endPct = ((end - min) / (max - min || 1)) * 100;

  wrap.style.setProperty('--range-start', `${Math.min(startPct, endPct)}%`);
  wrap.style.setProperty('--range-end', `${Math.max(startPct, endPct)}%`);
}

function updateDashboardDateRange(data) {
  const min = data.date_min || data.date_start || '2020-01-01';
  const max = data.date_max || data.date_end || '2030-12-31';
  dashboardRange.min = new Date(`${min}T00:00:00`);
  dashboardRange.max = new Date(`${max}T00:00:00`);

  const selectedStart = data.date_start || min;
  const selectedEnd = data.date_end || max;
  dashboardRange.start = new Date(`${selectedStart}T00:00:00`);
  dashboardRange.end = new Date(`${selectedEnd}T00:00:00`);

  if (dashboardRange.start < dashboardRange.min) dashboardRange.start = new Date(dashboardRange.min);
  if (dashboardRange.end > dashboardRange.max) dashboardRange.end = new Date(dashboardRange.max);

  const totalDays = Math.max(1, daysBetween(dashboardRange.min, dashboardRange.max));
  const startIndex = Math.min(totalDays, Math.max(0, daysBetween(dashboardRange.min, dashboardRange.start)));
  const endIndex = Math.min(totalDays, Math.max(0, daysBetween(dashboardRange.min, dashboardRange.end)));

  dateStartSlider.min = '0';
  dateStartSlider.max = String(totalDays);
  dateEndSlider.min = '0';
  dateEndSlider.max = String(totalDays);
  dateStartSlider.value = String(startIndex);
  dateEndSlider.value = String(endIndex);

  dateRangeStartText.textContent = formatDateValue(toDateValue(dashboardRange.start));
  dateRangeEndText.textContent = formatDateValue(toDateValue(dashboardRange.end));
  dashboardDateLabel.textContent = `${dateRangeStartText.textContent} - ${dateRangeEndText.textContent}`;
  updateRangeSliderVisual();
}

function createDashboardCategoryButton(level, value, label, className = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `dashboard-category-select ${className}`.trim();
  button.dataset.categoryLevel = level;
  button.dataset.categoryValue = value;
  button.textContent = label;
  button.setAttribute(
    'aria-pressed',
    String(selectedDashboardCategories[level] === value),
  );
  return button;
}

function renderDashboardCategory(level, rows) {
  const { chart, legend, body } = dashboardCategoryViews[level];
  const chartValues = rows
    .map((row) => ({
      label: row[level] || '(blank)',
      value: Math.abs(Number(row.total_cent || 0)),
    }))
    .filter((entry) => entry.value > 0);

  if (!chartValues.length) {
    chart.style.background = '#edf3ff';
    legend.innerHTML = '<span class="muted">Sin datos</span>';
    body.innerHTML = '<tr><td colspan="2" class="empty">Sin datos para este filtro.</td></tr>';
    return;
  }

  const colors = ['#2962ff', '#5b8def', '#8eb1ff', '#b9cdfb', '#dce7ff', '#ffb74d', '#ff8a65', '#66bb6a', '#9ccc65', '#ba68c8'];
  const total = chartValues.reduce((acc, row) => acc + row.value, 0);
  let current = 0;
  const slices = chartValues.map((entry, index) => {
    const start = current;
    const end = current + (entry.value / total) * 100;
    current = end;
    return `${colors[index % colors.length]} ${start}% ${end}%`;
  });

  chart.style.background = `conic-gradient(${slices.join(', ')})`;
  legend.replaceChildren();
  chartValues.forEach((entry, index) => {
    const button = createDashboardCategoryButton(level, entry.label, '', 'legend-item');
    const label = document.createElement('span');
    label.className = 'legend-label';
    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.background = colors[index % colors.length];
    const text = document.createElement('span');
    text.textContent = entry.label;
    label.append(swatch, text);
    const percentage = document.createElement('strong');
    percentage.textContent = `${((entry.value / total) * 100).toFixed(1)}%`;
    button.append(label, percentage);
    legend.appendChild(button);
  });

  body.replaceChildren();
  rows.forEach((row) => {
    const value = row[level] || '(blank)';
    const tr = document.createElement('tr');
    const categoryCell = document.createElement('td');
    categoryCell.appendChild(createDashboardCategoryButton(level, value, value, 'table-category-select'));
    const totalCell = document.createElement('td');
    totalCell.className = 'money-cell';
    totalCell.textContent = formatMoneyFromCents(row.total_cent);
    tr.append(categoryCell, totalCell);
    body.appendChild(tr);
  });
}

function renderDashboard(data) {
  dashboardTotal.textContent = formatMoneyFromCents(data.total_general || 0);
  dashboardTotalIncludingExcluded.textContent = formatMoneyFromCents(
    data.total_general_con_excluido || 0,
  );
  dashboardBankTotals.replaceChildren();
  const bankTotals = data.totales_por_fuente || [];
  if (bankTotals.length) {
    const header = document.createElement('div');
    header.className = 'dashboard-bank-total dashboard-bank-total-header';
    const bankHeading = document.createElement('span');
    bankHeading.textContent = 'Banco';
    const availableHeading = document.createElement('span');
    availableHeading.textContent = 'Disponible';
    const includingExcludedHeading = document.createElement('span');
    includingExcludedHeading.textContent = 'Con excluido';
    header.append(bankHeading, availableHeading, includingExcludedHeading);
    dashboardBankTotals.appendChild(header);
  }
  bankTotals.forEach((bankTotal) => {
    const row = document.createElement('div');
    row.className = 'dashboard-bank-total';
    const bank = document.createElement('span');
    bank.textContent = bankTotal.fuente;
    const availableAmount = document.createElement('strong');
    availableAmount.textContent = formatMoneyFromCents(bankTotal.total_cent);
    const amountIncludingExcluded = document.createElement('strong');
    amountIncludingExcluded.textContent = formatMoneyFromCents(
      bankTotal.total_con_excluido_cent,
    );
    row.append(bank, availableAmount, amountIncludingExcluded);
    dashboardBankTotals.appendChild(row);
  });
  if (!bankTotals.length) {
    const empty = document.createElement('span');
    empty.className = 'muted';
    empty.textContent = 'Sin bancos seleccionados';
    dashboardBankTotals.appendChild(empty);
  }
  updateDashboardDateRange(data);
  dashboardCategoryLevels.forEach((level) => {
    dashboardCategoryVisuals.querySelector(`[data-clear-category-level="${level}"]`).disabled = !selectedDashboardCategories[level];
    renderDashboardCategory(level, data[`totales_por_${level}`] || []);
  });
}

function renderDashboardMovements(data, append = false) {
  const items = data.items || [];
  if (!append) dashboardMovementsRows.replaceChildren();
  if (!items.length && !append) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'empty';
    cell.textContent = 'No hay movimientos para los filtros seleccionados.';
    row.appendChild(cell);
    dashboardMovementsRows.appendChild(row);
    dashboardMovementsSummary.textContent = `${data.total} movimientos`;
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    const row = document.createElement('tr');
    [
      formatShortDate(item.f_valor || item.fecha),
      item.fuente || '—',
      item.concepto || '—',
      item.movimiento || '—',
      item.categoria2 || '(blank)',
    ].forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });
    const amount = document.createElement('td');
    amount.className = 'money-cell';
    amount.textContent = formatMoneyFromCents(item.importe_cent);
    row.appendChild(amount);
    fragment.appendChild(row);
  });
  dashboardMovementsRows.appendChild(fragment);
  const table = dashboardMovementsRows.closest('table');
  const sort = tableSortStates.get(table);
  if (!append) {
    applyDefaultTableSort(dashboardMovementsRows);
  } else if (sort) {
    setTableSort(table, sort.columnIndex, sort.direction, [dashboardMovementsRows]);
  }
  dashboardMovementsSummary.textContent = `${data.total} movimientos`;
}

function createBalanceSvgElement(name, attributes = {}, text = null) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  if (text !== null) element.textContent = text;
  return element;
}

function formatBalanceChartValue(value) {
  return value === null || value === undefined ? '—' : formatMoneyFromCents(value);
}

function renderBalanceChart(data) {
  const svg = balanceHistoryChart;
  const balanceSources = data.fuentes_consideradas || [];
  balanceBanksSummary.textContent = balanceSources.length
    ? `Bancos considerados: ${balanceSources.join(', ')}`
    : 'Bancos considerados: ninguno';
  const width = 1100;
  const height = 340;
  const margin = { top: 20, right: 18, bottom: 42, left: 78 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const days = data.days || Array.from({ length: 31 }, (_, index) => index + 1);
  const availableMonths = data.available_months || [data.month].filter(Boolean);
  balanceMonthSelect.replaceChildren();
  availableMonths.forEach((month) => {
    const option = document.createElement('option');
    option.value = month;
    option.textContent = formatMonthValue(month);
    option.selected = month === data.month;
    balanceMonthSelect.appendChild(option);
  });
  const series = [
    { key: 'actual', label: 'Mes seleccionado', color: '#f26b38' },
    { key: 'average', label: 'Saldo medio', color: '#176789' },
    { key: 'minimum', dateKey: 'minimum_date', label: 'Saldo mínimo', color: '#247a35' },
    { key: 'maximum', dateKey: 'maximum_date', label: 'Saldo máximo', color: '#079bd3' },
  ];
  const values = series.flatMap((item) => data[item.key] || []).filter((value) => value !== null && value !== undefined);
  svg.replaceChildren();

  if (!values.length) {
    svg.appendChild(createBalanceSvgElement('text', {
      x: width / 2,
      y: height / 2,
      'text-anchor': 'middle',
      class: 'balance-empty-label',
    }, 'Sin saldos disponibles para las cuentas seleccionadas'));
    balanceChartSummary.textContent = `${formatMonthValue(data.month)} · histórico de ${data.months_history} meses anteriores`;
    balanceChartLegend.replaceChildren();
    balanceHistoryRows.innerHTML = '<tr><td colspan="7" class="empty">No hay datos de saldo para mostrar.</td></tr>';
    return;
  }

  const yMax = 350000;
  const xStep = plotWidth / days.length;
  const xFor = (index) => margin.left + (index + 0.5) * xStep;
  const yFor = (value) => margin.top + plotHeight - (value / yMax) * plotHeight;

  for (let tick = 0; tick <= 5; tick += 1) {
    const value = (yMax / 5) * tick;
    const y = yFor(value);
    svg.appendChild(createBalanceSvgElement('line', {
      x1: margin.left,
      x2: width - margin.right,
      y1: y,
      y2: y,
      class: 'balance-grid-line',
    }));
    svg.appendChild(createBalanceSvgElement('text', {
      x: margin.left - 10,
      y: y + 4,
      'text-anchor': 'end',
      class: 'balance-axis-label',
    }, `${(value / 100).toLocaleString('es-ES', { maximumFractionDigits: 0 })} €`));
  }

  [1, 5, 10, 15, 20, 25, 30, 31].forEach((day) => {
    const index = days.indexOf(day);
    if (index < 0) return;
    svg.appendChild(createBalanceSvgElement('text', {
      x: xFor(index),
      y: height - 12,
      'text-anchor': 'middle',
      class: 'balance-axis-label',
    }, String(day)));
  });

  series.forEach((item) => {
    const points = data[item.key] || [];
    let path = '';
    let penDown = false;
    points.forEach((value, index) => {
      if (value === null || value === undefined || value < 0 || value > yMax) {
        penDown = false;
        return;
      }
      path += `${penDown ? ' L' : ' M'} ${xFor(index)} ${yFor(value)}`;
      penDown = true;
    });
    if (path) {
      svg.appendChild(createBalanceSvgElement('path', {
        d: path,
        fill: 'none',
        stroke: item.color,
        'stroke-width': 3,
        'stroke-linejoin': 'round',
        'stroke-linecap': 'round',
      }));
    }
  });

  const showTooltip = (index, clientX, clientY) => {
    const day = days[index];
    balanceChartTooltip.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = `Día ${day}`;
    balanceChartTooltip.appendChild(title);
    series.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'balance-tooltip-row';
      const label = document.createElement('span');
      label.textContent = item.label;
      const value = document.createElement('strong');
      value.textContent = formatBalanceChartValue(data[item.key]?.[index]);
      row.append(label, value);
      balanceChartTooltip.appendChild(row);
    });
    balanceChartTooltip.hidden = false;

    const wrapRect = balanceChartWrap.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    const anchorX = clientX || svgRect.left + (xFor(index) / width) * svgRect.width;
    const anchorY = clientY || svgRect.top + margin.top + 24;
    const left = Math.max(8, Math.min(
      balanceChartWrap.clientWidth - balanceChartTooltip.offsetWidth - 8,
      anchorX - wrapRect.left + 10,
    ));
    const top = Math.max(8, Math.min(
      balanceChartWrap.clientHeight - balanceChartTooltip.offsetHeight - 8,
      anchorY - wrapRect.top - balanceChartTooltip.offsetHeight - 8,
    ));
    balanceChartTooltip.style.left = `${left}px`;
    balanceChartTooltip.style.top = `${top}px`;
  };

  days.forEach((day, index) => {
    const hitArea = createBalanceSvgElement('rect', {
      x: margin.left + index * xStep,
      y: margin.top,
      width: xStep,
      height: plotHeight,
      fill: 'transparent',
      tabindex: '0',
      role: 'button',
      'aria-label': `Ver saldos del día ${day}`,
    });
    hitArea.addEventListener('pointerenter', (event) => showTooltip(index, event.clientX, event.clientY));
    hitArea.addEventListener('focus', () => showTooltip(index));
    hitArea.addEventListener('pointerleave', () => { balanceChartTooltip.hidden = true; });
    hitArea.addEventListener('blur', () => { balanceChartTooltip.hidden = true; });
    svg.appendChild(hitArea);
  });

  balanceHistoryRows.replaceChildren();
  days.forEach((day, index) => {
    const row = document.createElement('tr');
    const dayCell = document.createElement('td');
    dayCell.textContent = String(day);
    row.appendChild(dayCell);
    series.forEach((item) => {
      const valueCell = document.createElement('td');
      valueCell.className = 'money-cell';
      valueCell.textContent = formatBalanceChartValue(data[item.key]?.[index]);
      if (data[item.key]?.[index] > yMax) valueCell.classList.add('balance-out-of-range');
      row.appendChild(valueCell);
      if (item.dateKey) {
        const dateCell = document.createElement('td');
        dateCell.textContent = formatShortDate(data[item.dateKey]?.[index]);
        row.appendChild(dateCell);
      }
    });
    balanceHistoryRows.appendChild(row);
  });
  applyDefaultTableSort(balanceHistoryRows);

  const monthLabel = formatMonthValue(data.month);
  balanceChartSummary.textContent = `${monthLabel} · media, mínimo y máximo de los ${data.months_history} meses anteriores, desde el ${formatShortDate(data.first_date || data.history_start)}`;
  balanceChartLegend.replaceChildren();
  series.forEach((item) => {
    const entry = document.createElement('span');
    entry.className = 'balance-legend-item';
    const swatch = document.createElement('span');
    swatch.className = 'balance-legend-swatch';
    swatch.style.backgroundColor = item.color;
    const label = document.createElement('span');
    label.textContent = item.label;
    entry.append(swatch, label);
    balanceChartLegend.appendChild(entry);
  });
}

dashboardCategoryVisuals.addEventListener('click', (event) => {
  const clearButton = event.target.closest('.dashboard-category-clear');
  if (clearButton) {
    selectedDashboardCategories[clearButton.dataset.clearCategoryLevel] = null;
    loadDashboard();
    return;
  }

  const button = event.target.closest('.dashboard-category-select');
  if (!button) return;
  const { categoryLevel, categoryValue } = button.dataset;
  selectedDashboardCategories[categoryLevel] = selectedDashboardCategories[categoryLevel] === categoryValue
    ? null
    : categoryValue;
  loadDashboard();
});

function renderImportPreviewRows(rows, filesCount = 0, targetBody = importPreviewRows, summaryEl = importPreviewSummary, countEl = importSummaryBadge) {
  if (!targetBody) return;
  const isImportTab = targetBody === importTabRows;
  const filteredRows = isImportTab ? filterImportPreviewRows(rows) : rows;
  const columnsCount = isImportTab ? 10 : 9;

  if (!filteredRows.length) {
    const hasNoFilterMatches = rows.length > 0;
    targetBody.innerHTML = `
      <tr>
        <td colspan="${columnsCount}" class="empty">
          ${hasNoFilterMatches
            ? 'No hay registros que coincidan con los filtros.'
            : filesCount > 0
            ? `He revisado ${filesCount} archivo(s) de input y no hay registros nuevos pendientes.`
            : 'No hay registros nuevos para importar.'}
        </td>
      </tr>
    `;
    if (summaryEl) {
      summaryEl.textContent = hasNoFilterMatches
        ? `0 de ${rows.length} registros pendientes coinciden con los filtros.`
        : filesCount > 0
          ? `He revisado ${filesCount} archivo(s) de input y no quedan registros nuevos para importar.`
          : 'No hay registros nuevos pendientes de importación.';
    }
    if (countEl) {
      countEl.textContent = hasNoFilterMatches ? `0 de ${rows.length} registros` : '0 registros';
    }
    if (confirmImportBtn) confirmImportBtn.disabled = selectedImportKeys.size === 0;
    if (isImportTab) updateImportSelectionControls();
    return;
  }

  if (summaryEl) {
    summaryEl.textContent = `${selectedImportKeys.size} seleccionados de ${rows.length} pendientes.`
      + (filteredRows.length === rows.length ? '' : ` Mostrando ${filteredRows.length} con los filtros actuales.`);
  }
  if (countEl) {
    countEl.textContent = `${selectedImportKeys.size} seleccionados`;
  }

  const fragment = document.createDocumentFragment();
  filteredRows.forEach((row) => {
    const tableRow = document.createElement('tr');
    if (isImportTab) {
      const selectionCell = document.createElement('td');
      selectionCell.className = 'selection-cell';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'import-row-checkbox';
      checkbox.dataset.importKey = row.clave;
      checkbox.checked = selectedImportKeys.has(row.clave);
      checkbox.setAttribute(
        'aria-label',
        `Seleccionar ${row.concepto || row.fuente || 'registro'}`,
      );
      selectionCell.appendChild(checkbox);
      tableRow.appendChild(selectionCell);
    }

    const values = [
      row.fuente || '—',
      `${row.update_snapshot ? 'Actualizar saldo · ' : ''}${row.source_file || row.fuente || 'input'}`,
      formatShortDate(row.f_valor || row.fecha),
      row.concepto || '—',
      row.movimiento || '—',
    ];
    values.forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      tableRow.appendChild(cell);
    });
    const amountCell = document.createElement('td');
    amountCell.className = 'money-cell';
    amountCell.textContent = formatMoneyFromCents(row.importe_cent || 0);
    tableRow.appendChild(amountCell);

    const categoryCell = document.createElement('td');
    const categoryButton = document.createElement('button');
    categoryButton.className = 'badge import-category-edit';
    categoryButton.type = 'button';
    categoryButton.dataset.importKey = row.clave;
    categoryButton.title = 'Cambiar categoría';
    categoryButton.setAttribute('aria-label', `Cambiar categoría de ${row.concepto || row.fuente || 'movimiento'}`);
    categoryButton.textContent = row.categoria2 || 'PENDIENTE';
    categoryCell.appendChild(categoryButton);
    tableRow.appendChild(categoryCell);

    const commentsCell = document.createElement('td');
    commentsCell.textContent = row.comentarios || '—';
    tableRow.appendChild(commentsCell);
    const actionsCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'row-actions';
    const editButton = document.createElement('button');
    editButton.className = 'action-btn edit-btn';
    editButton.type = 'button';
    editButton.dataset.importKey = row.clave;
    editButton.title = 'Editar categoría y comentarios';
    editButton.setAttribute('aria-label', 'Editar categoría y comentarios');
    editButton.textContent = '✎';
    actions.appendChild(editButton);
    actionsCell.appendChild(actions);
    tableRow.appendChild(actionsCell);
    fragment.appendChild(tableRow);
  });
  targetBody.replaceChildren(fragment);
  applyDefaultTableSort(targetBody);

  targetBody.querySelectorAll('.import-row-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selectedImportKeys.add(checkbox.dataset.importKey);
      } else {
        selectedImportKeys.delete(checkbox.dataset.importKey);
      }
      refreshImportTabRows();
    });
  });

  targetBody.querySelectorAll('.edit-btn, .import-category-edit').forEach((button) => {
    button.addEventListener('click', () => {
      const row = currentImportRows.find((item) => item.clave === button.dataset.importKey);
      if (row) {
        openImportRowEdit(row);
      }
    });
  });
  if (isImportTab) updateImportSelectionControls();
}

async function openImportRowEdit(row) {
  editingImportKey = row.clave;
  importRowEditError.textContent = '';
  importRowCategory.value = '';
  importRowComments.value = row.comentarios || '';
  try {
    const options = await fetchJson('/api/options');
    populateSelect(importRowCategory, options.categorias, 'Selecciona una categoría');
    importRowCategory.value = row.categoria2 || 'PENDIENTE';
    importRowEditModal.classList.remove('hidden');
    importRowEditModal.setAttribute('aria-hidden', 'false');
    importRowCategory.focus();
  } catch (error) {
    importRowEditError.textContent = error.message;
    importRowEditModal.classList.remove('hidden');
    importRowEditModal.setAttribute('aria-hidden', 'false');
  }
}

function closeImportRowEdit() {
  importRowEditModal.classList.add('hidden');
  importRowEditModal.setAttribute('aria-hidden', 'true');
  importRowEditForm.reset();
  importRowEditError.textContent = '';
  editingImportKey = null;
}

function saveImportRowEdit(event) {
  event.preventDefault();
  if (!editingImportKey || !importRowCategory.value) return;
  const row = currentImportRows.find((item) => item.clave === editingImportKey);
  if (!row) {
    importRowEditError.textContent = 'La fila de importación ya no está disponible. Actualiza la vista previa.';
    return;
  }
  const changes = {
    categoria2: importRowCategory.value,
    comentarios: importRowComments.value.trim(),
  };
  Object.assign(row, changes);
  pendingImportOverrides.set(editingImportKey, changes);
  closeImportRowEdit();
  refreshImportTabRows();
  if (importPreviewRows) {
    renderImportPreviewRows(currentImportRows, currentImportFilesCount);
  }
}

function filterImportPreviewRows(rows) {
  const selectedBank = importBankFilter.value;
  const query = importSearchInput.value.trim().toLocaleLowerCase('es');
  return rows.filter((row) => {
    if (selectedBank && row.fuente !== selectedBank) return false;
    if (!query) return true;
    return [row.source_file, row.fuente, row.f_valor, row.fecha, row.concepto, row.movimiento]
      .some((value) => String(value || '').toLocaleLowerCase('es').includes(query));
  });
}

function refreshImportTabRows() {
  renderImportPreviewRows(currentImportRows, currentImportFilesCount, importTabRows, importStatusText, importSummaryBadge);
}

function updateImportSelectionControls() {
  const visibleKeys = filterImportPreviewRows(currentImportRows).map((row) => row.clave);
  const selectedVisibleCount = visibleKeys.filter((key) => selectedImportKeys.has(key)).length;
  importSelectAll.checked = visibleKeys.length > 0 && selectedVisibleCount === visibleKeys.length;
  importSelectAll.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleKeys.length;
  confirmImportTabBtn.disabled = selectedImportKeys.size === 0;
  confirmImportTabBtn.textContent = selectedImportKeys.size
    ? `Importar seleccionados (${selectedImportKeys.size})`
    : 'Importar seleccionados';
  confirmImportBtn.disabled = selectedImportKeys.size === 0;
}

async function loadImportPreview() {
  try {
    const data = await fetchJson('/api/importar_input/preview');
    const rows = Array.isArray(data.rows) ? data.rows : [];
    const filesCount = Number(data.files || 0);
    console.log('Import preview payload rows:', rows.length, rows.slice(0, 2));

    if (!importTabRows) {
      console.warn('No existe importTabRows en el DOM');
      return;
    }

    const selectedBank = importBankFilter.value;
    const banks = [...new Set(rows.map((row) => row.fuente).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
    populateSelect(importBankFilter, banks, 'Todos los bancos');
    if (banks.includes(selectedBank)) importBankFilter.value = selectedBank;
    const availableKeys = new Set(rows.map((row) => row.clave));
    selectedImportKeys = new Set([...selectedImportKeys].filter((key) => availableKeys.has(key)));
    pendingImportOverrides = new Map(
      [...pendingImportOverrides].filter(([key]) => availableKeys.has(key)),
    );
    currentImportRows = rows.map((row) => ({
      ...row,
      ...(pendingImportOverrides.get(row.clave) || {}),
    }));
    currentImportFilesCount = filesCount;
    renderImportPreviewRows(rows, filesCount, importTabRows, importStatusText, importSummaryBadge);
    const deletedFiles = Array.isArray(data.deleted_files) ? data.deleted_files : [];
    const cleanupMessage = deletedFiles.length
      ? `Se eliminaron archivos anteriores del mismo banco: ${deletedFiles.join(', ')}. `
      : '';
    if (cleanupMessage && importStatusText) {
      importStatusText.textContent = `${cleanupMessage}${importStatusText.textContent}`;
    }
    if (importPreviewSummary) {
      importPreviewSummary.textContent = cleanupMessage + (rows.length
        ? `Se van a importar ${rows.length} registros pendientes desde la carpeta input.`
        : filesCount > 0
          ? `He revisado ${filesCount} archivo(s) de input y no quedan registros nuevos para importar.`
          : 'No hay registros nuevos pendientes de importación.');
    }
  } catch (error) {
    console.error('loadImportPreview error:', error);
    if (importStatusText) {
      importStatusText.textContent = error.message;
    }
  }
}

async function openImportPreviewModal() {
  setActiveView('import');
  await loadImportPreview();
}

async function confirmImportAndRefresh() {
  if (selectedImportKeys.size === 0) return;
  const selectedCount = selectedImportKeys.size;
  confirmImportTabBtn.disabled = true;
  confirmImportTabBtn.textContent = 'Importando...';

  try {
    const result = await fetchJson('/api/importar_input', {
      method: 'POST',
      body: JSON.stringify({
        claves: [...selectedImportKeys],
        ediciones: Object.fromEntries(
          [...pendingImportOverrides.entries()]
            .filter(([clave]) => selectedImportKeys.has(clave)),
        ),
      }),
    });
    selectedImportKeys.forEach((clave) => pendingImportOverrides.delete(clave));
    if (importPreviewModal) {
      importPreviewModal.classList.add('hidden');
      importPreviewModal.setAttribute('aria-hidden', 'true');
    }
    resetDashboardDateRange();
    // El rango previo no incluye las fechas nuevas: pedir el rango completo al servidor.
    dashboardRange.start = null;
    dashboardRange.end = null;
    await loadMovimientos();
    await loadSummary();
    await loadDashboard();
    await loadImportPreview();
    if (importStatusText) {
      const inserted = Number(result?.inserted || 0);
      const updated = Number(result?.updated || 0);
      importStatusText.textContent = inserted > 0 || updated > 0
        ? `Importación completada: ${inserted} añadidos y ${updated} saldos actualizados de ${selectedCount} seleccionados.`
        : `No se ha importado ningún registro de los ${selectedCount} seleccionados.`;
    }
  } catch (error) {
    if (importStatusText) {
      importStatusText.textContent = error.message;
    }
  } finally {
    updateImportSelectionControls();
  }
}

function renderMovimientos(items, append = false) {
  if (!append) {
    tableBody.replaceChildren();
    movimientoRecords.clear();
  }
  if (!items.length && !append) {
    tableBody.innerHTML = '<tr><td colspan="10" class="empty">No hay movimientos para esta búsqueda.</td></tr>';
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item) => {
    movimientoRecords.set(String(item.id), item);
    const row = document.createElement('tr');
    [
      item.id,
      item.fuente || '—',
      formatShortDate(item.f_valor || item.fecha),
      item.concepto || '—',
      item.movimiento || '—',
    ].forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });

    [item.importe_cent, item.disponible_calculado_cent].forEach((value) => {
      const cell = document.createElement('td');
      cell.className = 'money-cell';
      cell.textContent = money(value);
      row.appendChild(cell);
    });

    const categoryCell = document.createElement('td');
    const categoryButton = document.createElement('button');
    categoryButton.className = 'badge category-edit-btn';
    categoryButton.type = 'button';
    categoryButton.dataset.id = String(item.id);
    categoryButton.title = 'Cambiar categoría';
    categoryButton.setAttribute('aria-label', `Cambiar categoría del movimiento ${item.id}`);
    categoryButton.textContent = item.categoria2 || '—';
    categoryCell.appendChild(categoryButton);
    row.appendChild(categoryCell);

    const commentsCell = document.createElement('td');
    commentsCell.textContent = item.comentarios || '—';
    row.appendChild(commentsCell);

    const actionsCell = document.createElement('td');
    const actions = document.createElement('div');
    actions.className = 'row-actions';
    [
      ['edit-btn', 'Editar', 'Editar movimiento', '✎'],
      ['clone-btn', 'Clonar', 'Clonar movimiento', '⧉'],
      ['delete-btn', 'Borrar', 'Borrar movimiento', '🗑'],
    ].forEach(([className, title, label, text]) => {
      const button = document.createElement('button');
      button.className = `action-btn ${className}`;
      button.type = 'button';
      button.dataset.id = String(item.id);
      button.title = title;
      button.setAttribute('aria-label', `${label} ${item.id}`);
      button.textContent = text;
      actions.appendChild(button);
    });
    actionsCell.appendChild(actions);
    row.appendChild(actionsCell);
    fragment.appendChild(row);
  });
  tableBody.appendChild(fragment);
}

tableBody.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-id]');
  if (!button || !tableBody.contains(button)) return;

  const id = button.dataset.id;
  if (button.classList.contains('category-edit-btn')) {
    const item = movimientoRecords.get(id);
    if (item) openCategoryModal(item);
  } else if (button.classList.contains('edit-btn')) {
    try {
      const row = await fetchJson(`/api/movimientos/${id}`);
      openEditModal(row);
    } catch (error) {
      alert(error.message);
    }
  } else if (button.classList.contains('clone-btn')) {
    try {
      await fetchJson(`/api/movimientos/${id}/clone`, { method: 'POST' });
      await loadMovimientos();
      await loadSummary();
    } catch (error) {
      alert(error.message);
    }
  } else if (button.classList.contains('delete-btn')) {
    pendingDeleteId = id;
    deleteConfirmText.textContent = `¿Seguro que quieres borrar el movimiento ${pendingDeleteId}?`;
    deleteConfirmModal.classList.remove('hidden');
    deleteConfirmModal.setAttribute('aria-hidden', 'false');
  }
});

async function loadOptions() {
  const data = await fetchJson('/api/options');
  populateSelect(fuenteFilter, data.fuentes, 'Todas las fuentes');
  populateSelect(categoriaFilter, data.categorias, 'Todas las categorías');
  populateSelect(editForm.elements['categoria2'], data.categorias, 'Selecciona una categoría');

  if (state.fuente) {
    fuenteFilter.value = state.fuente;
  }
  if (state.categoria) {
    categoriaFilter.value = state.categoria;
  }

  renderBankButtons(data.fuentes);
}

function renderBankButtons(fuentes) {
  if (!Array.isArray(fuentes) || !fuentes.length) {
    dashboardBankButtons.innerHTML = '<span class="muted">Sin bancos</span>';
    return;
  }

  const allBanksSelected = selectedBanks === null
    || fuentes.every((bank) => selectedBanks.includes(bank));
  dashboardBankButtons.innerHTML = `
    <button type="button" class="bank-toggle all-banks-toggle ${allBanksSelected ? 'active' : ''}" aria-pressed="${allBanksSelected}">
      Todos los bancos
    </button>
  ` + fuentes
    .map(
      (bank) => `
        <button
          type="button"
          class="bank-toggle ${selectedBanks === null || selectedBanks.includes(bank) ? 'active' : ''}"
          data-bank="${bank}"
          aria-pressed="${selectedBanks === null || selectedBanks.includes(bank)}"
        >
          ${bank}
        </button>
      `
    )
    .join('');

  dashboardBankButtons.querySelector('.all-banks-toggle').addEventListener('click', () => {
    selectedBanks = allBanksSelected ? [] : null;
    renderBankButtons(fuentes);
    loadDashboard();
    if (activeViewName === 'balances') loadBalanceHistoryChart();
  });

  dashboardBankButtons.querySelectorAll('.bank-toggle[data-bank]').forEach((button) => {
    button.addEventListener('click', () => {
      const bank = button.dataset.bank;
      if (selectedBanks === null) selectedBanks = [...fuentes];
      if (!selectedBanks.includes(bank)) {
        selectedBanks.push(bank);
      } else {
        selectedBanks = selectedBanks.filter((item) => item !== bank);
      }
      renderBankButtons(fuentes);
      loadDashboard();
      if (activeViewName === 'balances') loadBalanceHistoryChart();
    });
  });
}

function syncDashboardDateInputs() {
  if (!dashboardRange.min || !dashboardRange.max) return;

  const startValue = Number(dateStartSlider.value);
  const endValue = Number(dateEndSlider.value);
  const startDate = new Date(dashboardRange.min);
  startDate.setDate(startDate.getDate() + startValue);
  const endDate = new Date(dashboardRange.min);
  endDate.setDate(endDate.getDate() + endValue);

  if (startDate > endDate) {
    if (document.activeElement === dateStartSlider) {
      dateEndSlider.value = dateStartSlider.value;
    } else {
      dateStartSlider.value = dateEndSlider.value;
    }
  }

  const effectiveStart = new Date(dashboardRange.min);
  effectiveStart.setDate(effectiveStart.getDate() + Number(dateStartSlider.value));
  const effectiveEnd = new Date(dashboardRange.min);
  effectiveEnd.setDate(effectiveEnd.getDate() + Number(dateEndSlider.value));

  dashboardRange.start = effectiveStart;
  dashboardRange.end = effectiveEnd;

  dateRangeStartText.textContent = formatDateValue(toDateValue(effectiveStart));
  dateRangeEndText.textContent = formatDateValue(toDateValue(effectiveEnd));
  dashboardDateLabel.textContent = `${dateRangeStartText.textContent} - ${dateRangeEndText.textContent}`;
  updateRangeSliderVisual();
}

let dashboardRangeLoadTimeout;
function scheduleDashboardLoad() {
  window.clearTimeout(dashboardRangeLoadTimeout);
  dashboardRangeLoadTimeout = window.setTimeout(() => loadDashboard(), 150);
}

dateStartSlider.addEventListener('input', () => {
  activeRangePreset = null;
  setRangeShortcutState();
  if (Number(dateStartSlider.value) > Number(dateEndSlider.value)) {
    dateEndSlider.value = dateStartSlider.value;
  }
  syncDashboardDateInputs();
  scheduleDashboardLoad();
});

dateEndSlider.addEventListener('input', () => {
  activeRangePreset = null;
  setRangeShortcutState();
  if (Number(dateEndSlider.value) < Number(dateStartSlider.value)) {
    dateStartSlider.value = dateEndSlider.value;
  }
  syncDashboardDateInputs();
  scheduleDashboardLoad();
});

document.querySelectorAll('.range-shortcut:not(#clearDashboardDateFilter)').forEach((button) => {
  button.addEventListener('click', () => {
    applyRangePreset(button.dataset.range);
  });
});

if (clearDashboardDateFilter) {
  clearDashboardDateFilter.addEventListener('click', () => {
    resetDashboardDateRange();
    loadDashboard();
  });
}

function buildDashboardFilterParams() {
  const params = new URLSearchParams();
  if (selectedBanks !== null) {
    if (selectedBanks.length) {
      params.set('fuentes', selectedBanks.join(','));
    } else {
      params.set('sin_fuentes', '1');
    }
  }
  if (dashboardRange.start) {
    params.set('date_start', toDateValue(dashboardRange.start));
  }
  if (dashboardRange.end) {
    params.set('date_end', toDateValue(dashboardRange.end));
  }
  dashboardCategoryLevels.forEach((level) => {
    if (selectedDashboardCategories[level]) {
      params.set(level, selectedDashboardCategories[level]);
    }
  });
  return params;
}

async function loadDashboard() {
  const requestId = ++dashboardRequestId;
  const params = buildDashboardFilterParams();
  const dashboardData = await fetchJson(`/api/dashboard?${params.toString()}`);
  if (requestId !== dashboardRequestId) return;
  renderDashboard(dashboardData);
  await loadDashboardMovements(true, params);
}

async function loadDashboardMovements(reset = false, filters = null) {
  if (reset) {
    dashboardMovementsRequestId += 1;
    dashboardMovementsPage = 0;
    dashboardMovementsTotal = 0;
    dashboardMovementsLoading = false;
    dashboardMovementsRows.replaceChildren();
    dashboardMovementsParams = new URLSearchParams(filters || buildDashboardFilterParams());
  }
  if (
    dashboardMovementsLoading
    || (dashboardMovementsPage > 0
      && dashboardMovementsPage * dashboardMovementsPageSize >= dashboardMovementsTotal)
  ) return;

  const requestId = dashboardMovementsRequestId;
  const nextPage = dashboardMovementsPage + 1;
  const params = new URLSearchParams(dashboardMovementsParams);
  params.set('page', String(nextPage));
  params.set('limit', String(dashboardMovementsPageSize));
  dashboardMovementsLoading = true;
  try {
    const data = await fetchJson(`/api/dashboard/movimientos?${params.toString()}`);
    if (requestId !== dashboardMovementsRequestId) return;
    dashboardMovementsPage = data.page;
    dashboardMovementsTotal = data.total;
    renderDashboardMovements(data, nextPage > 1);
  } catch (error) {
    if (requestId === dashboardMovementsRequestId) {
      dashboardMovementsSummary.textContent = error.message;
      if (!dashboardMovementsPage) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 6;
        cell.className = 'empty';
        cell.textContent = 'No se pudieron cargar los movimientos.';
        row.appendChild(cell);
        dashboardMovementsRows.replaceChildren(row);
      }
    }
  } finally {
    if (requestId === dashboardMovementsRequestId) dashboardMovementsLoading = false;
  }
}

async function loadBalanceHistoryChart() {
  const balanceParams = new URLSearchParams();
  if (balanceMonthSelect.value) {
    balanceParams.set('month', balanceMonthSelect.value);
  }
  if (selectedBanks !== null) {
    if (selectedBanks.length) {
      balanceParams.set('fuentes', selectedBanks.join(','));
    } else {
      balanceParams.set('sin_fuentes', '1');
    }
  }
  const balanceData = await fetchJson(`/api/dashboard/saldos?${balanceParams.toString()}`);
  renderBalanceChart(balanceData);
}

balanceMonthSelect.addEventListener('change', loadBalanceHistoryChart);

async function loadMovimientos(reset = true) {
  if (reset) {
    movimientosRequestId += 1;
    movimientosPage = 0;
    movimientosLoading = false;
    tableBody.replaceChildren();
    movimientoRecords.clear();
  }
  if (
    movimientosLoading
    || (movimientosPage > 0 && movimientosPage * movimientosPageSize >= state.total)
  ) return;

  const requestId = movimientosRequestId;
  const nextPage = movimientosPage + 1;
  const params = new URLSearchParams({
    q: state.q,
    fuente: state.fuente,
    categoria: state.categoria,
    sort_by: state.sortBy,
    sort_dir: state.sortDir,
    page: String(nextPage),
    limit: String(movimientosPageSize),
  });
  if (state.dateStart) params.set('date_start', state.dateStart);
  if (state.dateEnd) params.set('date_end', state.dateEnd);
  if (state.amountMin !== '') {
    params.set('importe_min_cent', String(Math.round(Number(state.amountMin) * 100)));
  }
  if (state.amountMax !== '') {
    params.set('importe_max_cent', String(Math.round(Number(state.amountMax) * 100)));
  }

  movimientosLoading = true;
  try {
    const data = await fetchJson(`/api/movimientos?${params.toString()}`);
    if (requestId !== movimientosRequestId) return;
    state.total = data.total;
    movimientosPage = data.page;
    renderMovimientos(data.items, nextPage > 1);
    movimientosCountEl.textContent = state.total === 1
      ? '1 registro'
      : `${state.total} registros`;
  } catch (error) {
    if (requestId === movimientosRequestId) {
      movimientosCountEl.textContent = error.message;
      if (!movimientosPage) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 10;
        cell.className = 'empty';
        cell.textContent = error.message;
        row.appendChild(cell);
        tableBody.replaceChildren(row);
      }
    }
  } finally {
    if (requestId === movimientosRequestId) movimientosLoading = false;
  }
}

movimientosTableWrap.addEventListener('scroll', () => {
  if (movimientosTableWrap.scrollHeight - movimientosTableWrap.scrollTop
    <= movimientosTableWrap.clientHeight + 150) {
    loadMovimientos(false);
  }
});

dashboardMovementsWrap.addEventListener('scroll', () => {
  if (dashboardMovementsWrap.scrollHeight - dashboardMovementsWrap.scrollTop
    <= dashboardMovementsWrap.clientHeight + 150) {
    loadDashboardMovements();
  }
});

async function loadSummary() {
  const data = await fetchJson('/api/summary');
  renderSummary(data);
}

function createAccountVisibilityCell(account, field, label) {
  const cell = document.createElement('td');
  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.checked = Boolean(account[field]);
  toggle.setAttribute('aria-label', `${label}: ${account.fuente}`);
  toggle.addEventListener('change', async () => {
    const previousValue = !toggle.checked;
    toggle.disabled = true;
    try {
      const saved = await fetchJson(`/api/config/cuentas/${encodeURIComponent(account.fuente)}`, {
        method: 'PUT',
        body: JSON.stringify({ [field]: toggle.checked }),
      });
      toggle.checked = Boolean(saved[field]);
      accountConfigStatus.textContent = field === 'saldo_por_movimientos'
        ? `${account.fuente} ${saved[field] ? 'calculará el saldo desde movimientos' : 'usará snapshots para calcular el saldo'}.`
        : `${account.fuente} ${saved[field] ? 'se mostrará en' : 'no se mostrará en'} ${label}.`;
    } catch (error) {
      toggle.checked = previousValue;
      accountConfigStatus.textContent = error.message;
    } finally {
      toggle.disabled = false;
    }
  });
  cell.appendChild(toggle);
  return cell;
}

async function loadAccountConfig() {
  accountConfigStatus.textContent = '';
  const budgetYear = Number(budgetConfigYearInput.value) || new Date().getFullYear();
  budgetConfigYearInput.value = String(budgetYear);
  const [data, , budgetData, categoryData] = await Promise.all([
    fetchJson('/api/config/cuentas'),
    loadSavingsProjectionConfig(),
    fetchJson(`/api/config/presupuestos?year=${budgetYear}`),
    fetchJson('/api/config/categorias'),
  ]);
  balanceHistoryMonthsInput.value = String(data.meses_saldo_historico || 18);
  savedBalanceHistoryMonths = balanceHistoryMonthsInput.value;
  balanceHistoryConfigStatus.textContent = '';
  renderBudgetConfig(budgetData);
  renderCategoryConfig(categoryData.categorias);
  accountConfigBody.replaceChildren();

  if (!data.cuentas.length) {
    accountConfigBody.innerHTML = '<tr><td colspan="5" class="empty">No hay cuentas configuradas.</td></tr>';
    return;
  }

  data.cuentas.forEach((account) => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    nameCell.textContent = account.fuente;

    const amountCell = document.createElement('td');
    const currencyInput = document.createElement('span');
    currencyInput.className = 'currency-input';
    const amountInput = document.createElement('input');
    amountInput.type = 'text';
    amountInput.inputMode = 'decimal';
    amountInput.className = 'account-config-amount';
    amountInput.value = formatEuroInputFromCents(account.ahorro_no_disponible_cent || 0);
    amountInput.setAttribute('aria-label', `Saldo excluido del disponible para ${account.fuente}`);
    const currencySymbol = document.createElement('span');
    currencySymbol.className = 'currency-symbol';
    currencySymbol.textContent = '€';
    currencySymbol.setAttribute('aria-hidden', 'true');
    currencyInput.append(amountInput, currencySymbol);
    amountCell.appendChild(currencyInput);

    const balanceToggleCell = createAccountVisibilityCell(
      account,
      'saldo_por_movimientos',
      'Saldo desde movimientos',
    );
    const showInBalancesCell = createAccountVisibilityCell(
      account,
      'incluir_en_saldos',
      'Saldos',
    );
    const summaryToggleCell = createAccountVisibilityCell(
      account,
      'incluir_en_resumen',
      'Resumen',
    );

    let savedAmountCent = account.ahorro_no_disponible_cent || 0;
    amountInput.addEventListener('change', async () => {
      const amountCent = parseEuroInputToCents(amountInput.value);
      if (amountCent === null || amountCent < 0) {
        accountConfigStatus.textContent = 'Introduce un importe válido igual o superior a 0,00.';
        amountInput.value = formatEuroInputFromCents(savedAmountCent);
        return;
      }

      try {
        const saved = await fetchJson(`/api/config/cuentas/${encodeURIComponent(account.fuente)}`, {
          method: 'PUT',
          body: JSON.stringify({ ahorro_no_disponible_cent: amountCent }),
        });
        savedAmountCent = saved.ahorro_no_disponible_cent;
        amountInput.value = formatEuroInputFromCents(savedAmountCent);
        accountConfigStatus.textContent = `Configuración de ${account.fuente} guardada.`;
      } catch (error) {
        amountInput.value = formatEuroInputFromCents(savedAmountCent);
        accountConfigStatus.textContent = error.message;
      }
    });
    row.append(nameCell, amountCell, balanceToggleCell, showInBalancesCell, summaryToggleCell);
    accountConfigBody.appendChild(row);
  });
}

function getCategoryTypeOptions(selectedValue) {
  const values = ['Gasto', 'Ingreso', 'Interno', 'Ahorro', 'No computa', 'PENDIENTE'];
  return values.map((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    option.selected = value === selectedValue;
    return option;
  });
}

function createCategoryActionIcon(paths) {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('focusable', 'false');
  paths.forEach((pathData) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    icon.appendChild(path);
  });
  return icon;
}

function renderCategoryConfig(categories) {
  categoryConfigRows.replaceChildren();
  categories.forEach((category) => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    const parentCell = document.createElement('td');
    const typeCell = document.createElement('td');
    const actionsCell = document.createElement('td');
    const nameInput = document.createElement('input');
    const parentInput = document.createElement('input');
    const typeSelect = document.createElement('select');
    nameInput.value = category.categoria2;
    parentInput.value = category.categoria1;
    nameInput.setAttribute('aria-label', `Nombre de la categoría ${category.categoria2}`);
    parentInput.setAttribute('aria-label', `Categoría superior de ${category.categoria2}`);
    typeSelect.setAttribute('aria-label', `Tipo de ${category.categoria2}`);
    typeSelect.append(...getCategoryTypeOptions(category.categoria0));
    nameCell.appendChild(nameInput);
    parentCell.appendChild(parentInput);
    typeCell.appendChild(typeSelect);

    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'action-btn';
    saveButton.appendChild(createCategoryActionIcon([
      'M5 3h12l4 4v14H3V3h2Z',
      'M7 3v6h10V3',
      'M7 21v-7h10v7Z',
    ]));
    saveButton.title = 'Guardar categoría';
    saveButton.setAttribute('aria-label', `Guardar categoría ${category.categoria2}`);
    saveButton.addEventListener('click', async () => {
      saveButton.disabled = true;
      try {
        await fetchJson(`/api/config/categorias/${encodeURIComponent(category.categoria2)}`, {
          method: 'PUT',
          body: JSON.stringify({
            categoria2: nameInput.value,
            categoria1: parentInput.value,
            categoria0: typeSelect.value,
          }),
        });
        categoryConfigStatus.textContent = `Categoría ${nameInput.value.trim()} guardada.`;
        await loadAccountConfig();
        await loadOptions();
      } catch (error) {
        categoryConfigStatus.textContent = error.message;
      } finally {
        saveButton.disabled = false;
      }
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'action-btn';
    deleteButton.appendChild(createCategoryActionIcon([
      'M4 7h16',
      'M10 11v6m4-6v6',
      'M5 7l1 14h12l1-14Z',
      'M9 7V4h6v3',
    ]));
    deleteButton.title = 'Eliminar categoría';
    deleteButton.setAttribute('aria-label', `Eliminar categoría ${category.categoria2}`);
    deleteButton.addEventListener('click', async () => {
      pendingDeleteId = null;
      pendingDeleteAction = async () => {
        deleteButton.disabled = true;
        try {
          await fetchJson(`/api/config/categorias/${encodeURIComponent(category.categoria2)}`, {
            method: 'DELETE',
          });
          categoryConfigStatus.textContent = `Categoría ${category.categoria2} eliminada.`;
          await loadAccountConfig();
          await loadOptions();
        } catch (error) {
          categoryConfigStatus.textContent = error.message;
        } finally {
          deleteButton.disabled = false;
        }
      };
      deleteConfirmTitle.textContent = 'Eliminar categoría';
      deleteConfirmText.textContent = `¿Eliminar la categoría ${category.categoria2}? Solo se puede eliminar si no tiene movimientos ni presupuestos asociados.`;
      confirmDeleteBtn.textContent = 'Eliminar';
      deleteConfirmModal.classList.remove('hidden');
      deleteConfirmModal.setAttribute('aria-hidden', 'false');
      confirmDeleteBtn.focus();
    });
    actionsCell.append(saveButton, deleteButton);
    row.append(nameCell, parentCell, typeCell, actionsCell);
    categoryConfigRows.appendChild(row);
  });
}

categoryConfigForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(categoryConfigForm);
  const submitButton = categoryConfigForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    const created = await fetchJson('/api/config/categorias', {
      method: 'POST',
      body: JSON.stringify({
        categoria2: formData.get('categoria2'),
        categoria1: formData.get('categoria1'),
        categoria0: formData.get('categoria0'),
      }),
    });
    categoryConfigStatus.textContent = `Categoría ${created.categoria2} creada.`;
    categoryConfigForm.reset();
    await loadAccountConfig();
    await loadOptions();
  } catch (error) {
    categoryConfigStatus.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

const budgetMonthLabels = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

function renderBudgetConfig(data) {
  budgetConfigBody.replaceChildren();
  budgetConfigStatus.textContent = '';
  if (!data.categorias.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 14;
    cell.className = 'empty';
    cell.textContent = 'No hay categorías de gasto configuradas.';
    row.appendChild(cell);
    budgetConfigBody.appendChild(row);
    return;
  }

  data.categorias.forEach((category) => {
    const row = document.createElement('tr');
    const groupCell = document.createElement('td');
    groupCell.textContent = category.categoria1;
    const categoryCell = document.createElement('td');
    categoryCell.textContent = category.categoria2;
    row.append(groupCell, categoryCell);
    budgetConfigBody.appendChild(row);

    const savedBudgets = [...category.presupuestos_cent];
    category.presupuestos_cent.forEach((amount, index) => {
      const amountCell = document.createElement('td');
      const amountInput = document.createElement('input');
      amountInput.type = 'text';
      amountInput.inputMode = 'decimal';
      amountInput.className = 'budget-config-amount';
      amountInput.value = amount === null
        ? ''
        : formatEuroInputFromCents(amount);
      amountInput.setAttribute(
        'aria-label',
        `Presupuesto de ${category.categoria2} para ${budgetMonthLabels[index]} ${data.anio}`,
      );
      amountCell.appendChild(amountInput);
      row.appendChild(amountCell);

      amountInput.addEventListener('change', async () => {
        const rawValue = amountInput.value.trim();
        const amountCent = rawValue ? parseEuroInputToCents(rawValue) : null;
        if (rawValue && (amountCent === null || amountCent < 0)) {
          budgetConfigStatus.textContent = `Introduce un presupuesto válido para ${category.categoria2}.`;
          amountInput.value = savedBudgets[index] === null
            ? ''
            : formatEuroInputFromCents(savedBudgets[index]);
          return;
        }

        amountInput.disabled = true;
        try {
          const saved = await fetchJson(
            `/api/config/presupuestos/${encodeURIComponent(category.categoria2)}`,
            {
              method: 'PUT',
              body: JSON.stringify({
                anio: data.anio,
                mes: index + 1,
                presupuesto_cent: amountCent,
              }),
            },
          );
          savedBudgets[index] = saved.presupuesto_cent;
          amountInput.value = saved.presupuesto_cent === null
            ? ''
            : formatEuroInputFromCents(saved.presupuesto_cent);
          budgetConfigStatus.textContent = saved.presupuesto_cent === null
            ? `Presupuesto de ${category.categoria2} en ${budgetMonthLabels[index]} eliminado.`
            : `Presupuesto de ${category.categoria2} en ${budgetMonthLabels[index]} guardado.`;
        } catch (error) {
          amountInput.value = savedBudgets[index] === null
            ? ''
            : formatEuroInputFromCents(savedBudgets[index]);
          budgetConfigStatus.textContent = error.message;
        } finally {
          amountInput.disabled = false;
        }
      });
    });
  });
}

async function changeBudgetConfigYear(offset = 0) {
  const selectedYear = Number(budgetConfigYearInput.value);
  const year = selectedYear + offset;
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    budgetConfigStatus.textContent = 'El año debe estar entre 1900 y 2100.';
    return;
  }
  budgetConfigYearInput.value = String(year);
  try {
    const data = await fetchJson(`/api/config/presupuestos?year=${year}`);
    renderBudgetConfig(data);
  } catch (error) {
    budgetConfigStatus.textContent = error.message;
  }
}

async function copyBudgetConfigToNextYear() {
  const sourceYear = Number(budgetConfigYearInput.value);
  if (!Number.isInteger(sourceYear) || sourceYear < 1900 || sourceYear >= 2100) {
    budgetConfigStatus.textContent = 'El año debe estar entre 1900 y 2099 para copiarlo al siguiente.';
    return;
  }
  const targetYear = sourceYear + 1;
  if (!window.confirm(`¿Copiar todos los presupuestos de ${sourceYear} a ${targetYear}? Se reemplazarán los valores que ya existan en ${targetYear}.`)) {
    return;
  }

  const copyButton = document.getElementById('copyBudgetConfigNextYear');
  copyButton.disabled = true;
  try {
    const result = await fetchJson('/api/config/presupuestos/copiar', {
      method: 'POST',
      body: JSON.stringify({ anio_origen: sourceYear }),
    });
    budgetConfigYearInput.value = String(result.anio_destino);
    const data = await fetchJson(`/api/config/presupuestos?year=${result.anio_destino}`);
    renderBudgetConfig(data);
    budgetConfigStatus.textContent = `Presupuestos copiados de ${result.anio_origen} a ${result.anio_destino}.`;
  } catch (error) {
    budgetConfigStatus.textContent = error.message;
  } finally {
    copyButton.disabled = false;
  }
}

let savedBalanceHistoryMonths = '18';
balanceHistoryMonthsInput.addEventListener('change', async () => {
  const months = Number(balanceHistoryMonthsInput.value);
  if (!Number.isInteger(months) || months < 1 || months > 60) {
    balanceHistoryConfigStatus.textContent = 'Elige un rango entre 1 y 60 meses.';
    balanceHistoryMonthsInput.value = savedBalanceHistoryMonths;
    return;
  }

  try {
    const result = await fetchJson('/api/config/saldo-historico', {
      method: 'PUT',
      body: JSON.stringify({ meses_saldo_historico: months }),
    });
    savedBalanceHistoryMonths = String(result.meses_saldo_historico);
    balanceHistoryMonthsInput.value = savedBalanceHistoryMonths;
    balanceMonthSelect.value = '';
    balanceHistoryConfigStatus.textContent = `Histórico actualizado: ${result.meses_saldo_historico} meses.`;
  } catch (error) {
    balanceHistoryMonthsInput.value = savedBalanceHistoryMonths;
    balanceHistoryConfigStatus.textContent = error.message;
  }
});

function formatBudgetDifference(value) {
  if (value === null || value === undefined) return '—';
  const amount = Number(value);
  return amount < 0
    ? `(${formatMoneyFromCents(Math.abs(amount))})`
    : formatMoneyFromCents(amount);
}

function addBudgetMoneyCell(row, value, difference = false) {
  const cell = document.createElement('td');
  cell.className = 'money-cell';
  cell.textContent = difference ? formatBudgetDifference(value) : value === null ? '—' : formatMoneyFromCents(value);
  if (difference && value !== null && value !== undefined) {
    cell.classList.add(Number(value) < 0 ? 'budget-over' : 'budget-under');
  }
  row.appendChild(cell);
}

function renderBudgetReport(data) {
  const monthLabel = formatMonthValue(data.month);
  budgetBudgetHeader.textContent = `Presupuesto · ${monthLabel}`;
  budgetActualHeader.textContent = `Real · ${monthLabel}`;
  budgetRows.replaceChildren();

  data.groups.forEach((group, groupIndex) => {
    const groupRow = document.createElement('tr');
    groupRow.className = 'budget-group-row';
    const groupName = document.createElement('td');
    const toggle = document.createElement('button');
    toggle.className = 'budget-group-toggle';
    toggle.type = 'button';
    toggle.dataset.groupIndex = String(groupIndex);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = group.categoria1;
    groupName.appendChild(toggle);
    groupRow.appendChild(groupName);
    groupRow.appendChild(document.createElement('td'));
    addBudgetMoneyCell(groupRow, group.budget_cent);
    addBudgetMoneyCell(groupRow, group.actual_cent);
    addBudgetMoneyCell(groupRow, group.difference_cent, true);
    budgetRows.appendChild(groupRow);

    group.children.forEach((category, categoryIndex) => {
      const row = document.createElement('tr');
      row.className = 'budget-detail-row';
      row.dataset.groupIndex = String(groupIndex);
      row.dataset.categoryIndex = String(categoryIndex);
      row.hidden = true;
      row.appendChild(document.createElement('td'));
      const categoryName = document.createElement('td');
      const toggleCategory = document.createElement('button');
      toggleCategory.className = 'budget-category-toggle';
      toggleCategory.type = 'button';
      toggleCategory.dataset.groupIndex = String(groupIndex);
      toggleCategory.dataset.categoryIndex = String(categoryIndex);
      toggleCategory.dataset.category2 = category.categoria2;
      toggleCategory.setAttribute('aria-expanded', 'false');
      toggleCategory.textContent = category.categoria2;
      categoryName.appendChild(toggleCategory);
      row.appendChild(categoryName);
      addBudgetMoneyCell(row, category.budget_cent);
      addBudgetMoneyCell(row, category.actual_cent);
      addBudgetMoneyCell(row, category.difference_cent, true);
      budgetRows.appendChild(row);

      const movementsRow = document.createElement('tr');
      movementsRow.className = 'budget-transactions-row';
      movementsRow.dataset.groupIndex = String(groupIndex);
      movementsRow.dataset.categoryIndex = String(categoryIndex);
      movementsRow.hidden = true;
      const movementsCell = document.createElement('td');
      movementsCell.colSpan = 5;
      movementsRow.appendChild(movementsCell);
      budgetRows.appendChild(movementsRow);
    });
  });

  budgetTotals.replaceChildren();
  const totalRow = document.createElement('tr');
  totalRow.className = 'budget-grand-total';
  const totalLabel = document.createElement('td');
  totalLabel.textContent = 'Total general';
  totalRow.append(totalLabel, document.createElement('td'));
  addBudgetMoneyCell(totalRow, data.budget_total_cent);
  addBudgetMoneyCell(totalRow, data.actual_total_cent);
  addBudgetMoneyCell(totalRow, data.difference_total_cent, true);
  budgetTotals.appendChild(totalRow);
  renderAnnualBudgetReport(data.annual);
}

function renderAnnualBudgetReport(data) {
  annualBudgetSummary.textContent = data.through_month
    ? `Acumulado de enero a ${formatMonthValue(`${data.year}-${String(data.through_month).padStart(2, '0')}`)}. El mes en curso no se incluye.`
    : `Todavía no hay meses completos en ${data.year}.`;
  annualBudgetRows.replaceChildren();

  data.groups.forEach((group, groupIndex) => {
    const groupRow = document.createElement('tr');
    groupRow.className = 'budget-group-row';
    const groupName = document.createElement('td');
    const toggle = document.createElement('button');
    toggle.className = 'budget-group-toggle';
    toggle.type = 'button';
    toggle.dataset.groupIndex = String(groupIndex);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = group.categoria1;
    groupName.appendChild(toggle);
    groupRow.append(groupName, document.createElement('td'));
    addBudgetMoneyCell(groupRow, group.budget_cent);
    addBudgetMoneyCell(groupRow, group.actual_cent);
    addBudgetMoneyCell(groupRow, group.difference_cent, true);
    annualBudgetRows.appendChild(groupRow);

    group.children.forEach((category) => {
      const row = document.createElement('tr');
      row.className = 'budget-detail-row';
      row.dataset.groupIndex = String(groupIndex);
      row.hidden = true;
      row.appendChild(document.createElement('td'));
      const categoryName = document.createElement('td');
      categoryName.textContent = category.categoria2;
      row.appendChild(categoryName);
      addBudgetMoneyCell(row, category.budget_cent);
      addBudgetMoneyCell(row, category.actual_cent);
      addBudgetMoneyCell(row, category.difference_cent, true);
      annualBudgetRows.appendChild(row);
    });
  });

  annualBudgetTotals.replaceChildren();
  const totalRow = document.createElement('tr');
  totalRow.className = 'budget-grand-total';
  const totalLabel = document.createElement('td');
  totalLabel.textContent = 'Total acumulado';
  totalRow.append(totalLabel, document.createElement('td'));
  addBudgetMoneyCell(totalRow, data.budget_total_cent);
  addBudgetMoneyCell(totalRow, data.actual_total_cent);
  addBudgetMoneyCell(totalRow, data.difference_total_cent, true);
  annualBudgetTotals.appendChild(totalRow);
}

annualBudgetRows.addEventListener('click', (event) => {
  const groupRow = event.target.closest('.budget-group-row');
  const toggle = groupRow?.querySelector('.budget-group-toggle');
  if (!toggle) return;

  const expanded = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!expanded));
  annualBudgetRows.querySelectorAll('.budget-detail-row').forEach((row) => {
    if (row.dataset.groupIndex === toggle.dataset.groupIndex) {
      row.hidden = expanded;
    }
  });
});

function renderBudgetMovementDetails(cell, items) {
  if (!items.length) {
    cell.textContent = 'No hay movimientos para esta categoría en el mes seleccionado.';
    return;
  }

  const table = document.createElement('table');
  table.className = 'budget-transactions-table';
  const head = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Fecha', 'Fuente', 'Concepto', 'Movimiento', 'Importe'].forEach((label) => {
    const header = document.createElement('th');
    header.textContent = label;
    headerRow.appendChild(header);
  });
  head.appendChild(headerRow);
  table.appendChild(head);

  const body = document.createElement('tbody');
  items.forEach((item) => {
    const row = document.createElement('tr');
    [
      formatShortDate(item.f_valor || item.fecha),
      item.fuente || '—',
      item.concepto || '—',
      item.movimiento || '—',
    ].forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });
    const amount = document.createElement('td');
    amount.className = 'money-cell';
    amount.textContent = formatMoneyFromCents(-item.importe_cent);
    row.appendChild(amount);
    body.appendChild(row);
  });
  table.appendChild(body);
  cell.replaceChildren(table);
}

async function toggleBudgetCategoryMovements(toggle) {
  const groupIndex = toggle.dataset.groupIndex;
  const categoryIndex = toggle.dataset.categoryIndex;
  const key = `${budgetMonth.value}\u0000${toggle.dataset.category2}`;
  const movementsRow = budgetRows.querySelector(
    `.budget-transactions-row[data-group-index="${groupIndex}"][data-category-index="${categoryIndex}"]`,
  );
  if (!movementsRow) return;

  const expanded = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!expanded));
  movementsRow.hidden = expanded;
  if (expanded) return;

  const cell = movementsRow.cells[0];
  if (budgetMovementCache.has(key)) {
    renderBudgetMovementDetails(cell, budgetMovementCache.get(key));
    return;
  }

  cell.textContent = 'Cargando movimientos…';
  try {
    const params = new URLSearchParams({
      month: budgetMonth.value,
      categoria2: toggle.dataset.category2,
    });
    const data = await fetchJson(`/api/presupuestos/movimientos?${params.toString()}`);
    if (!budgetRows.contains(movementsRow) || budgetMonth.value !== data.month) return;
    budgetMovementCache.set(key, data.items);
    renderBudgetMovementDetails(cell, data.items);
  } catch (error) {
    if (budgetRows.contains(movementsRow)) cell.textContent = error.message;
  }
}

budgetRows.addEventListener('click', async (event) => {
  const categoryRow = event.target.closest('.budget-detail-row');
  const categoryToggle = categoryRow?.querySelector('.budget-category-toggle');
  if (categoryToggle) {
    await toggleBudgetCategoryMovements(categoryToggle);
    return;
  }

  const groupRow = event.target.closest('.budget-group-row');
  const groupToggle = groupRow?.querySelector('.budget-group-toggle');
  if (!groupToggle) return;

  const expanded = groupToggle.getAttribute('aria-expanded') === 'true';
  groupToggle.setAttribute('aria-expanded', String(!expanded));
  budgetRows.querySelectorAll('.budget-detail-row, .budget-transactions-row').forEach((row) => {
    if (row.dataset.groupIndex === groupToggle.dataset.groupIndex) {
      row.hidden = expanded;
    }
  });
  if (expanded) {
    budgetRows.querySelectorAll('.budget-category-toggle').forEach((toggle) => {
      if (toggle.dataset.groupIndex === groupToggle.dataset.groupIndex) {
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
});

async function loadBudgets() {
  const month = budgetMonth.value || new Date().toISOString().slice(0, 7);
  budgetMonth.value = month;
  const annualYear = Number(annualBudgetYearInput.value) || new Date().getFullYear();
  annualBudgetYearInput.value = String(annualYear);
  const params = new URLSearchParams({ month, annual_year: String(annualYear) });
  const data = await fetchJson(`/api/presupuestos?${params.toString()}`);
  renderBudgetReport(data);
}

const savingsAmountFields = [
  'Ahorro BBVA',
  'Ahorro Bankinter',
  'Ahorro N26',
  'Ahorro Trade Republic',
  'Ahorro Revolut',
  'Ahorro PIBANK',
  'Trade Wallet',
  'Kraken Wallet',
  'Ahorro Acciones',
  'UBS Acciones',
  'PPI BBVA',
  'Ahorro Mensual Previsto',
  'Gasto Extra2',
  'Aportaciones Abuela',
  'Variable trabajo',
];
const savingsFields = [
  'Mes',
  ...savingsAmountFields,
  'Considerado en grafica?',
  'Comentarios',
];

function parseSavingsAmount(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  let normalized = String(value).trim().replace(/[€$\s]/g, '');
  if (normalized.startsWith('(') && normalized.endsWith(')')) {
    normalized = `-${normalized.slice(1, -1)}`;
  }
  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.lastIndexOf(',') > normalized.lastIndexOf('.')
      ? normalized.replace(/\./g, '').replace(',', '.')
      : normalized.replace(/,/g, '');
  } else {
    normalized = normalized.replace(',', '.');
  }
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function formatSavingsAmount(value) {
  const amount = parseSavingsAmount(value);
  return amount === null
    ? '—'
    : `${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function savingsDateForInput(value) {
  const [day, month, year] = String(value || '').split('/');
  return day && month && year
    ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    : '';
}

function savingsMonthLabel(date) {
  return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function getVisibleSavingsRecords() {
  if (!savedSavingsStartDate) return savingsRecords;
  return savingsRecords.filter((record) => savingsDateForInput(record.Mes) >= savedSavingsStartDate);
}

function getSavingsGraphRecords() {
  return savingsRecords.filter((record) => {
    const recordDate = savingsDateForInput(record.Mes);
    return (!savedSavingsStartDate || recordDate >= savedSavingsStartDate)
      && (!savedSavingsEndDate || recordDate <= savedSavingsEndDate);
  });
}

const savingsScenarioStyles = {
  peor: { label: 'Peor', color: '#e53935', dash: [2, 4] },
  medio: { label: 'Medio', color: '#e67e22', dash: [8, 4] },
  mejor: { label: 'Mejor', color: '#1ea672', dash: [14, 4, 2, 4] },
};

function savingsMonthKey(label) {
  const [year, month] = String(label).split('-').map(Number);
  return year * 12 + month - 1;
}

function savingsFutureLabel(key) {
  return savingsMonthLabel(new Date(Date.UTC(Math.floor(key / 12), key % 12, 1)));
}

function renderSavingsChart() {
  if (savingsChartInstance) savingsChartInstance.destroy();
  const visibleRecords = getSavingsGraphRecords();
  const labels = visibleRecords.map((record) => record.Mes);
  const axisKeys = visibleRecords.map((record) => {
    const [, month, year] = String(record.Mes).split('/').map(Number);
    return year * 12 + month - 1;
  });
  const totalValues = visibleRecords.map((record) => {
    const value = Number(record['Ahorro Total']);
    return Number.isFinite(value) ? value : 0;
  });

  const frozen = savingsForecast?.foto_activa?.valores || null;
  const recalculated = savingsShowRecalculatedInput.checked ? savingsForecast?.actual : null;
  const forecasts = [frozen, recalculated].filter(Boolean);

  if (axisKeys.length && forecasts.length) {
    const forecastEnd = Math.max(...forecasts.map(
      (forecast) => savingsMonthKey(forecast.months[forecast.months.length - 1] || forecast.base.month),
    ));
    let endKey = forecastEnd;
    if (savedSavingsEndDate) {
      const [endYear, endMonth] = savedSavingsEndDate.split('-').map(Number);
      endKey = endYear * 12 + endMonth - 1;
    }
    for (let key = axisKeys[axisKeys.length - 1] + 1; key <= endKey; key += 1) {
      labels.push(savingsFutureLabel(key));
      axisKeys.push(key);
      totalValues.push(null);
    }
  }

  const lastIndexByKey = new Map(axisKeys.map((key, index) => [key, index]));
  const placeSeries = (forecast, name) => {
    const data = axisKeys.map(() => null);
    const points = [
      [forecast.base.month, forecast.base.total],
      ...forecast.months.map((month, index) => [month, forecast.scenarios[name][index]]),
    ];
    points.forEach(([month, value]) => {
      const index = lastIndexByKey.get(savingsMonthKey(month));
      if (index !== undefined) data[index] = value;
    });
    return data;
  };
  const scenarioDatasets = (forecast, suffix, recalculatedStyle) => ['peor', 'mejor', 'medio'].map((name) => {
    const style = savingsScenarioStyles[name];
    return {
      label: `${style.label} (${suffix})`,
      data: placeSeries(forecast, name),
      borderColor: style.color,
      backgroundColor: name === 'mejor' && !recalculatedStyle ? 'rgba(41, 98, 255, 0.12)' : style.color,
      borderDash: style.dash,
      borderWidth: recalculatedStyle ? 1 : 2,
      pointRadius: 0,
      spanGaps: true,
      fill: name === 'mejor' && !recalculatedStyle ? '-1' : false,
    };
  });

  const datasets = [
    {
      label: 'Ahorro Total',
      data: totalValues,
      borderColor: '#2962ff',
      backgroundColor: '#2962ff',
      tension: 0.2,
    },
    ...(frozen ? scenarioDatasets(frozen, 'congelado', false) : []),
    ...(recalculated ? scenarioDatasets(recalculated, 'recalculado', true) : []),
  ];

  savingsChartInstance = new Chart(savingsChartCanvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: {
          itemSort: (left, right) => (right.parsed.y ?? 0) - (left.parsed.y ?? 0),
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatSavingsAmount(context.parsed.y)}`,
          },
        },
      },
      scales: {
        x: { title: { display: true, text: 'Mes' } },
        y: {
          title: { display: true, text: 'Ahorro (€)' },
          ticks: { callback: (value) => formatSavingsAmount(value) },
        },
      },
    },
  });
}

function formatSavingsPercent(value) {
  return value === null || value === undefined
    ? '—'
    : `${(value * 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}

function formatIsoDate(value) {
  const [year, month, day] = String(value || '').split('-');
  return day ? `${day}/${month}/${year}` : '';
}

function renderSavingsFreezeControls() {
  const photos = savingsForecast?.fotos || [];
  savingsSnapshotSelect.replaceChildren();
  if (!photos.length) {
    const option = document.createElement('option');
    option.textContent = 'Sin previsiones congeladas';
    option.disabled = true;
    savingsSnapshotSelect.appendChild(option);
  }
  photos.forEach((photo) => {
    const option = document.createElement('option');
    option.value = String(photo.id);
    option.textContent = `#${photo.id} — ${formatIsoDate(photo.fecha_congelacion)}`;
    option.selected = photo.id === savingsForecast.foto_activa?.id;
    savingsSnapshotSelect.appendChild(option);
  });
  savingsFreezeReminder.hidden = new Date().getMonth() !== 0;
}

function renderSavingsDeviation() {
  const deviation = savingsForecast?.desviacion;
  savingsDeviationRows.replaceChildren();
  if (!deviation || !deviation.rows.length) {
    savingsDeviationCard.textContent = deviation
      ? 'Aún no hay registros reales posteriores a la congelación.'
      : 'Sin previsión congelada.';
    savingsDeviationCard.classList.add('muted');
    return;
  }
  const latest = deviation.latest;
  savingsDeviationCard.classList.remove('muted');
  savingsDeviationCard.textContent = `Último mes (${latest.mes}): ${formatSavingsAmount(latest.desviacion_eur)} `
    + `(${formatSavingsPercent(latest.desviacion_pct)}) frente al escenario medio · ${latest.estado}`;
  [...deviation.rows].reverse().forEach((item) => {
    const row = document.createElement('tr');
    [
      item.mes,
      formatSavingsAmount(item.total_real),
      formatSavingsAmount(item.total_congelado_medio),
      formatSavingsAmount(item.desviacion_eur),
      formatSavingsPercent(item.desviacion_pct),
      item.estado,
      formatSavingsAmount(item.media_movil_3m),
      formatSavingsAmount(item.desviacion_acumulada),
    ].forEach((value, index) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      if (index !== 0 && index !== 5) cell.className = 'text-right';
      row.appendChild(cell);
    });
    savingsDeviationRows.appendChild(row);
  });
}

function renderForecastParamsForm() {
  const params = savingsForecast?.parametros;
  if (!params) return;
  forecastBaseMonthlyInput.value = params.ahorro_base_mensual;
  forecastInvestedMonthlyInput.value = params.aportacion_invertida_mensual;
  forecastExtraPaysInput.value = Object.entries(params.pagas_extra)
    .map(([month, amount]) => `${month}:${amount}`)
    .join(', ');
  forecastInvestedAccounts.replaceChildren();
  savingsBalanceFields.forEach((column) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = column;
    input.checked = params.cuentas_invertidas.includes(column);
    label.append(input, ` ${column}`);
    forecastInvestedAccounts.appendChild(label);
  });
  const interests = params.intereses;
  forecastInterestInputs.active.checked = interests.activo;
  forecastInterestInputs.bankinterBalance.value = interests.bankinter.saldo;
  forecastInterestInputs.bankinterInitialRate.value = interests.bankinter.tipo_inicial_pct;
  forecastInterestInputs.bankinterInitialEnd.value = interests.bankinter.ultimo_mes_tipo_inicial;
  forecastInterestInputs.bankinterLaterRate.value = interests.bankinter.tipo_posterior_pct;
  forecastInterestInputs.bankinterMonths.value = interests.bankinter.meses_pago.join(', ');
  forecastInterestInputs.pibankCapital.value = interests.pibank.capital;
  forecastInterestInputs.pibankRate.value = interests.pibank.tipo_pct;
  forecastInterestInputs.pibankMaturity.value = interests.pibank.vencimiento;
  const rateAccounts = Object.keys(params.escenarios.peor.rentabilidades_pct);
  forecastScenarioHead.replaceChildren();
  ['Escenario', 'Variable enero (€)', 'Gasto extra mensual (€)', ...rateAccounts.map((account) => `Rent. ${account} (%)`)]
    .forEach((text) => {
      const cell = document.createElement('th');
      cell.textContent = text;
      forecastScenarioHead.appendChild(cell);
    });
  forecastScenarioRows.replaceChildren();
  Object.entries(savingsScenarioStyles).forEach(([name, style]) => {
    const row = document.createElement('tr');
    const title = document.createElement('td');
    title.textContent = style.label;
    row.appendChild(title);
    const fields = [
      ['variable_enero', params.escenarios[name].variable_enero],
      ['gasto_extra_mensual', params.escenarios[name].gasto_extra_mensual],
      ...rateAccounts.map((account) => [`rate:${account}`, params.escenarios[name].rentabilidades_pct[account]]),
    ];
    fields.forEach(([field, value]) => {
      const cell = document.createElement('td');
      const input = document.createElement('input');
      input.type = 'number';
      input.step = 'any';
      input.dataset.scenario = name;
      input.dataset.field = field;
      input.value = value;
      cell.appendChild(input);
      row.appendChild(cell);
    });
    forecastScenarioRows.appendChild(row);
  });
}

async function fetchSavingsForecast() {
  const query = savingsSelectedSnapshotId ? `?snapshot_id=${savingsSelectedSnapshotId}` : '';
  savingsForecast = await fetchJson(`/api/ahorro/prevision${query}`);
  renderSavingsFreezeControls();
  renderSavingsDeviation();
  renderForecastParamsForm();
}

async function saveForecastParams() {
  const pays = {};
  for (const part of forecastExtraPaysInput.value.split(',').map((item) => item.trim()).filter(Boolean)) {
    const [month, amount] = part.split(':').map((item) => item.trim());
    if (!month || amount === undefined || amount === '') {
      savingsProjectionConfigStatus.textContent = 'Las pagas extra deben tener el formato mes:importe.';
      return;
    }
    pays[month] = Number(amount);
  }
  const scenarios = {};
  forecastScenarioRows.querySelectorAll('input').forEach((input) => {
    const scenario = scenarios[input.dataset.scenario] ??= { rentabilidades_pct: {} };
    if (input.dataset.field.startsWith('rate:')) {
      scenario.rentabilidades_pct[input.dataset.field.slice(5)] = Number(input.value);
    } else {
      scenario[input.dataset.field] = Number(input.value);
    }
  });
  try {
    await fetchJson('/api/ahorro/prevision/parametros', {
      method: 'PUT',
      body: JSON.stringify({
        ahorro_base_mensual: Number(forecastBaseMonthlyInput.value),
        aportacion_invertida_mensual: Number(forecastInvestedMonthlyInput.value),
        pagas_extra: pays,
        cuentas_invertidas: [...forecastInvestedAccounts.querySelectorAll('input:checked')]
          .map((input) => input.value),
        escenarios: scenarios,
        intereses: {
          activo: forecastInterestInputs.active.checked,
          bankinter: {
            saldo: Number(forecastInterestInputs.bankinterBalance.value),
            tipo_inicial_pct: Number(forecastInterestInputs.bankinterInitialRate.value),
            ultimo_mes_tipo_inicial: forecastInterestInputs.bankinterInitialEnd.value,
            tipo_posterior_pct: Number(forecastInterestInputs.bankinterLaterRate.value),
            meses_pago: forecastInterestInputs.bankinterMonths.value
              .split(',').map((item) => Number(item.trim())).filter((item) => item),
          },
          pibank: {
            capital: Number(forecastInterestInputs.pibankCapital.value),
            tipo_pct: Number(forecastInterestInputs.pibankRate.value),
            vencimiento: forecastInterestInputs.pibankMaturity.value,
          },
        },
      }),
    });
    await fetchSavingsForecast();
    savingsProjectionConfigStatus.textContent = 'Parámetros de previsión guardados.';
    if (activeViewName === 'savings') renderSavingsChart();
  } catch (error) {
    savingsProjectionConfigStatus.textContent = error.message;
  }
}

async function freezeSavingsForecast() {
  freezeSavingsForecastBtn.disabled = true;
  try {
    await fetchJson('/api/ahorro/prevision/congelar', { method: 'POST' });
    savingsSelectedSnapshotId = null;
    await fetchSavingsForecast();
    renderSavingsChart();
    savingsStatus.textContent = 'Previsión congelada.';
  } catch (error) {
    savingsStatus.textContent = error.message;
  } finally {
    freezeSavingsForecastBtn.disabled = false;
  }
}

async function selectSavingsSnapshot() {
  savingsSelectedSnapshotId = Number(savingsSnapshotSelect.value) || null;
  try {
    await fetchSavingsForecast();
    renderSavingsChart();
  } catch (error) {
    savingsStatus.textContent = error.message;
  }
}

function renderSavingsColumnToggles() {
  savingsColumnToggles.replaceChildren();
  const palette = [
    '#2962ff', '#1ea672', '#e67e22', '#a23be0', '#e53935', '#00838f',
    '#8d6e63', '#7cb342', '#d81b60', '#5e35b1', '#546e7a',
  ];
  savedSavingsChartColumns.forEach((column, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'savings-column-toggle';
    button.textContent = column;
    button.setAttribute('aria-pressed', 'true');
    button.style.setProperty('--savings-column-color', palette[savingsBalanceFields.indexOf(column)] || palette[index]);
    button.addEventListener('click', () => {
      const dataset = savingsColumnsChartInstance?.data.datasets.find((item) => item.label === column);
      if (!dataset) return;
      dataset.hidden = !dataset.hidden;
      button.setAttribute('aria-pressed', String(!dataset.hidden));
      savingsColumnsChartInstance.update();
    });
    savingsColumnToggles.appendChild(button);
  });
  if (!savedSavingsChartColumns.length) {
    const empty = document.createElement('span');
    empty.className = 'muted';
    empty.textContent = 'No hay columnas seleccionadas para mostrar.';
    savingsColumnToggles.appendChild(empty);
  }
}

function renderSavingsColumnsChart() {
  if (savingsColumnsChartInstance) savingsColumnsChartInstance.destroy();
  const records = getSavingsGraphRecords();
  const palette = [
    '#2962ff', '#1ea672', '#e67e22', '#a23be0', '#e53935', '#00838f',
    '#8d6e63', '#7cb342', '#d81b60', '#5e35b1', '#546e7a',
  ];
  const datasets = savedSavingsChartColumns.map((column) => ({
    label: column,
    data: records.map((record) => parseSavingsAmount(record[column])),
    borderColor: palette[savingsBalanceFields.indexOf(column)],
    backgroundColor: palette[savingsBalanceFields.indexOf(column)],
    tension: 0.2,
    spanGaps: false,
    fill: true,
  }));
  savingsColumnsChartInstance = new Chart(savingsColumnsChartCanvas, {
    type: 'line',
    data: {
      labels: records.map((record) => record.Mes),
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false } },
      scales: {
        x: { stacked: true, title: { display: true, text: 'Mes' } },
        y: {
          stacked: true,
          title: { display: true, text: 'Saldo acumulado (€)' },
          ticks: { callback: (value) => formatSavingsAmount(value) },
        },
      },
    },
  });
  renderSavingsColumnToggles();
}

function renderSavingsColumnConfig() {
  const renderGroup = (container, selected, groupName) => {
    container.replaceChildren();
    savingsBalanceFields.forEach((column, index) => {
      const label = document.createElement('label');
      label.className = 'savings-column-config-option';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = `${groupName}-${index}`;
      checkbox.value = column;
      checkbox.checked = selected.includes(column);
      label.append(checkbox, document.createTextNode(column));
      container.appendChild(label);
    });
  };
  renderGroup(savingsChartColumnsConfig, savedSavingsChartColumns, 'chart-column');
  renderGroup(savingsModalColumnsConfig, savedSavingsModalColumns, 'modal-column');
}

function applySavingsModalColumnVisibility() {
  savingsBalanceFields.forEach((column) => {
    const input = savingsForm.elements.namedItem(column);
    input.closest('label').hidden = !savedSavingsModalColumns.includes(column);
  });
}

function applySavingsColumnSettings(config) {
  savedSavingsChartColumns = Array.isArray(config.columnas_grafica_ahorro)
    ? config.columnas_grafica_ahorro.filter((column) => savingsBalanceFields.includes(column))
    : [...savingsBalanceFields];
  savedSavingsModalColumns = Array.isArray(config.columnas_modal_ahorro)
    ? config.columnas_modal_ahorro.filter((column) => savingsBalanceFields.includes(column))
    : [...savingsBalanceFields];
  renderSavingsColumnConfig();
  applySavingsModalColumnVisibility();
}

function renderSavingsRows() {
  const visibleRecords = getVisibleSavingsRecords();
  savingsTableHeader.replaceChildren();
  ['Mes', 'Ahorro total', ...savedSavingsModalColumns, 'Ahorro mensual previsto', 'Comentarios', 'Acciones']
    .forEach((label) => {
      const header = document.createElement('th');
      header.textContent = label;
      savingsTableHeader.appendChild(header);
    });
  savingsRows.replaceChildren();
  if (!visibleRecords.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5 + savedSavingsModalColumns.length;
    cell.className = 'empty';
    cell.textContent = savedSavingsStartDate
      ? 'No hay registros de ahorro desde la fecha seleccionada.'
      : 'No hay registros de ahorro.';
    row.appendChild(cell);
    savingsRows.appendChild(row);
    return;
  }

  visibleRecords.forEach((record) => {
    const row = document.createElement('tr');
    const values = [
      record.Mes,
      formatSavingsAmount(record['Ahorro Total']),
      ...savedSavingsModalColumns.map((column) => formatSavingsAmount(record[column])),
      formatSavingsAmount(record['Ahorro Mensual Previsto']),
      record.Comentarios || '—',
    ];
    values.forEach((value, index) => {
      const cell = document.createElement('td');
      cell.textContent = value ?? '';
      if (index > 0 && index < values.length - 1) cell.className = 'savings-amount';
      row.appendChild(cell);
    });
    const actionCell = document.createElement('td');
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'action-btn';
    editButton.title = 'Editar registro';
    editButton.setAttribute('aria-label', 'Editar registro de ahorro');
    editButton.textContent = '✎';
    editButton.addEventListener('click', () => openSavingsModal(record));
    actionCell.appendChild(editButton);
    row.appendChild(actionCell);
    savingsRows.appendChild(row);
  });
  applyDefaultTableSort(savingsRows);
}

async function loadSavings() {
  savingsStatus.textContent = 'Cargando registros...';
  try {
    const [data, config] = await Promise.all([
      fetchJson('/api/ahorro'),
      fetchJson('/api/config/ahorro-proyeccion'),
    ]);
    savedSavingsProjectionYears = String(config.anios_proyeccion_ahorro);
    savedSavingsStartDate = config.fecha_inicio_evolucion_ahorro || '';
    savedSavingsEndDate = config.fecha_fin_evolucion_ahorro || '';
    applySavingsColumnSettings(config);
    savingsProjectionYearsInput.value = savedSavingsProjectionYears;
    savingsStartDateInput.value = savedSavingsStartDate;
    savingsEndDateInput.value = savedSavingsEndDate;
    savingsRecords = data.rows;
    await fetchSavingsForecast();
    renderSavingsRows();
    renderSavingsChart();
    renderSavingsColumnsChart();
    savingsStatus.textContent = `${getVisibleSavingsRecords().length} de ${savingsRecords.length} registros mostrados.`;
  } catch (error) {
    savingsStatus.textContent = error.message;
  }
}

function openSavingsModal(record = null) {
  savingsForm.reset();
  savingsForm.elements.namedItem('rowid').value = record?.rowid ?? '';
  savingsModalTitle.textContent = record ? 'Editar registro de ahorro' : 'Añadir registro de ahorro';
  const previousRecord = savingsRecords[savingsRecords.length - 1];
  const today = new Date();
  const todayValue = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  savingsFields.forEach((field) => {
    const input = savingsForm.elements.namedItem(field);
    const value = record
      ? record[field]
      : savingsBalanceFields.includes(field)
        ? previousRecord?.[field]
        : null;
    if (field === 'Mes') {
      input.value = record ? savingsDateForInput(value) : todayValue;
    } else if (savingsAmountFields.includes(field)) {
      input.value = parseSavingsAmount(value) ?? '';
    } else {
      input.value = value ?? '';
    }
  });
  applySavingsModalColumnVisibility();
  savingsModal.classList.remove('hidden');
  savingsModal.setAttribute('aria-hidden', 'false');
  savingsForm.elements.namedItem('Mes').focus();
}

function closeSavingsModal() {
  savingsModal.classList.add('hidden');
  savingsModal.setAttribute('aria-hidden', 'true');
}

async function saveSavingsRecord(event) {
  event.preventDefault();
  const rowid = savingsForm.elements.namedItem('rowid').value;
  const payload = {};
  savingsFields.forEach((field) => {
    if (rowid && savingsBalanceFields.includes(field) && !savedSavingsModalColumns.includes(field)) {
      return;
    }
    const input = savingsForm.elements.namedItem(field);
    payload[field] = input.value === ''
      ? null
      : savingsAmountFields.includes(field)
        ? Number(input.value)
        : input.value;
  });
  if (rowid) payload.rowid = Number(rowid);

  const saveButton = savingsForm.querySelector('button[type="submit"]');
  saveButton.disabled = true;
  try {
    await fetchJson('/api/ahorro', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    closeSavingsModal();
    await loadSavings();
  } catch (error) {
    savingsStatus.textContent = error.message;
  } finally {
    saveButton.disabled = false;
  }
}

async function loadSavingsProjectionConfig() {
  const data = await fetchJson('/api/config/ahorro-proyeccion');
  savedSavingsProjectionYears = String(data.anios_proyeccion_ahorro);
  savedSavingsStartDate = data.fecha_inicio_evolucion_ahorro || '';
  savedSavingsEndDate = data.fecha_fin_evolucion_ahorro || '';
  applySavingsColumnSettings(data);
  savingsProjectionYearsInput.value = savedSavingsProjectionYears;
  savingsStartDateInput.value = savedSavingsStartDate;
  savingsEndDateInput.value = savedSavingsEndDate;
  savingsDateRangeStatus.textContent = '';
  await fetchSavingsForecast().catch(() => {});
}

async function saveSavingsProjectionConfig() {
  const years = Number(savingsProjectionYearsInput.value);
  if (!Number.isInteger(years) || years < 1 || years > 50) {
    savingsProjectionConfigStatus.textContent = 'Elige un rango entre 1 y 50 años.';
    savingsProjectionYearsInput.value = savedSavingsProjectionYears;
    return;
  }

  try {
    const result = await fetchJson('/api/config/ahorro-proyeccion', {
      method: 'PUT',
      body: JSON.stringify({ anios_proyeccion_ahorro: years }),
    });
    savedSavingsProjectionYears = String(result.anios_proyeccion_ahorro);
    savingsProjectionYearsInput.value = savedSavingsProjectionYears;
    savingsProjectionConfigStatus.textContent = `Horizonte actualizado: ${result.anios_proyeccion_ahorro} años.`;
    await fetchSavingsForecast();
    if (activeViewName === 'savings') renderSavingsChart();
  } catch (error) {
    savingsProjectionYearsInput.value = savedSavingsProjectionYears;
    savingsProjectionConfigStatus.textContent = error.message;
  }
}

async function saveSavingsDateRange() {
  if (
    savingsStartDateInput.value
    && savingsEndDateInput.value
    && savingsStartDateInput.value > savingsEndDateInput.value
  ) {
    savingsDateRangeStatus.textContent = 'La fecha inicial no puede ser posterior a la fecha final.';
    savingsStartDateInput.value = savedSavingsStartDate;
    savingsEndDateInput.value = savedSavingsEndDate;
    return;
  }

  try {
    const result = await fetchJson('/api/config/ahorro-proyeccion', {
      method: 'PUT',
      body: JSON.stringify({
        fecha_inicio_evolucion_ahorro: savingsStartDateInput.value,
        fecha_fin_evolucion_ahorro: savingsEndDateInput.value,
      }),
    });
    savedSavingsStartDate = result.fecha_inicio_evolucion_ahorro || '';
    savedSavingsEndDate = result.fecha_fin_evolucion_ahorro || '';
    savingsStartDateInput.value = savedSavingsStartDate;
    savingsEndDateInput.value = savedSavingsEndDate;
    savingsDateRangeStatus.textContent = savedSavingsStartDate || savedSavingsEndDate
      ? `Rango guardado: ${savedSavingsStartDate ? formatDateValue(savedSavingsStartDate) : 'sin inicio'} – ${savedSavingsEndDate ? formatDateValue(savedSavingsEndDate) : 'sin final'}.`
      : 'Se mostrarán todos los registros en ambas gráficas.';
    renderSavingsRows();
    renderSavingsChart();
    renderSavingsColumnsChart();
  } catch (error) {
    savingsStartDateInput.value = savedSavingsStartDate;
    savingsEndDateInput.value = savedSavingsEndDate;
    savingsDateRangeStatus.textContent = error.message;
  }
}

async function saveSavingsColumnSettings() {
  const chartColumns = [...savingsChartColumnsConfig.querySelectorAll('input:checked')]
    .map((input) => input.value);
  const modalColumns = [...savingsModalColumnsConfig.querySelectorAll('input:checked')]
    .map((input) => input.value);
  try {
    const result = await fetchJson('/api/config/ahorro-proyeccion', {
      method: 'PUT',
      body: JSON.stringify({
        columnas_grafica_ahorro: chartColumns,
        columnas_modal_ahorro: modalColumns,
      }),
    });
    applySavingsColumnSettings(result);
    renderSavingsRows();
    renderSavingsColumnsChart();
    savingsColumnsConfigStatus.textContent = 'Columnas de ahorro actualizadas.';
  } catch (error) {
    renderSavingsColumnConfig();
    savingsColumnsConfigStatus.textContent = error.message;
  }
}

async function refreshDatabaseData() {
  refreshDataBtn.disabled = true;
  refreshDataBtn.setAttribute('aria-label', 'Actualizando datos');
  refreshDataBtn.title = 'Actualizando datos...';

  try {
    await Promise.all([loadOptions(), loadSummary()]);
    if (activeViewName === 'dashboard') {
      await loadDashboard();
    } else if (activeViewName === 'movimientos') {
      await loadMovimientos();
    } else if (activeViewName === 'config') {
      await loadAccountConfig();
    } else if (activeViewName === 'balances') {
      await loadBalanceHistoryChart();
    } else if (activeViewName === 'budgets') {
      await loadBudgets();
    } else if (activeViewName === 'savings') {
      await loadSavings();
    } else {
      await loadImportPreview();
    }
    refreshDataBtn.setAttribute('aria-label', 'Actualizado');
    refreshDataBtn.title = 'Datos actualizados desde la base de datos';
  } catch (error) {
    refreshDataBtn.setAttribute('aria-label', 'Error al actualizar');
    refreshDataBtn.title = error.message;
  } finally {
    refreshDataBtn.disabled = false;
    window.setTimeout(() => {
      refreshDataBtn.setAttribute('aria-label', 'Actualizar');
      refreshDataBtn.title = 'Actualizar datos desde la base de datos';
    }, 1800);
  }
}

refreshDataBtn.addEventListener('click', refreshDatabaseData);

searchInput.addEventListener('input', (event) => {
  state.q = event.target.value.trim();
  loadMovimientos();
});

fuenteFilter.addEventListener('change', (event) => {
  state.fuente = event.target.value;
  loadMovimientos();
});

categoriaFilter.addEventListener('change', (event) => {
  state.categoria = event.target.value;
  loadMovimientos();
});

dateStartFilter.addEventListener('change', (event) => {
  state.dateStart = event.target.value;
  loadMovimientos();
});

dateEndFilter.addEventListener('change', (event) => {
  state.dateEnd = event.target.value;
  loadMovimientos();
});

amountMinFilter.addEventListener('change', (event) => {
  state.amountMin = event.target.value;
  loadMovimientos();
});

amountMaxFilter.addEventListener('change', (event) => {
  state.amountMax = event.target.value;
  loadMovimientos();
});

function setActiveView(viewName) {
  activeViewName = viewName;
  const isDashboard = viewName === 'dashboard';
  const isMovimientos = viewName === 'movimientos';
  const isImport = viewName === 'import';
  const isBalances = viewName === 'balances';
  const isConfig = viewName === 'config';
  const isBudgets = viewName === 'budgets';
  const isSavings = viewName === 'savings';

  tabDashboard.classList.toggle('active', isDashboard);
  tabMovimientos.classList.toggle('active', isMovimientos);
  tabBalances.classList.toggle('active', isBalances);
  tabImport.classList.toggle('active', isImport);
  tabConfig.classList.toggle('active', isConfig);
  tabBudgets.classList.toggle('active', isBudgets);
  tabSavings.classList.toggle('active', isSavings);

  dashboardView.classList.toggle('active', isDashboard);
  balancesView.classList.toggle('active', isBalances);
  movimientosView.classList.toggle('active', isMovimientos);
  importView.classList.toggle('active', isImport);
  configView.classList.toggle('active', isConfig);
  budgetsView.classList.toggle('active', isBudgets);
  savingsView.classList.toggle('active', isSavings);

  if (isDashboard) {
    loadDashboard();
  } else if (isBalances) {
    loadBalanceHistoryChart();
  } else if (isMovimientos) {
    loadMovimientos();
  } else if (isImport) {
    loadImportPreview();
  } else if (isConfig) {
    loadAccountConfig();
  } else if (isBudgets) {
    loadBudgets();
  } else if (isSavings) {
    loadSavings();
  }
}

tabDashboard.addEventListener('click', () => {
  setActiveView('dashboard');
});

tabBalances.addEventListener('click', () => setActiveView('balances'));
tabMovimientos.addEventListener('click', () => setActiveView('movimientos'));
tabImport.addEventListener('click', () => setActiveView('import'));
tabConfig.addEventListener('click', () => setActiveView('config'));
tabBudgets.addEventListener('click', () => setActiveView('budgets'));
tabSavings.addEventListener('click', () => setActiveView('savings'));
budgetMonth.value = new Date().toISOString().slice(0, 7);
budgetMonth.addEventListener('change', loadBudgets);
annualBudgetYearInput.value = String(new Date().getFullYear());
annualBudgetYearInput.addEventListener('change', loadBudgets);
document.getElementById('annualBudgetPreviousYear').addEventListener('click', () => {
  annualBudgetYearInput.value = String(Number(annualBudgetYearInput.value) - 1);
  loadBudgets();
});
document.getElementById('annualBudgetNextYear').addEventListener('click', () => {
  annualBudgetYearInput.value = String(Number(annualBudgetYearInput.value) + 1);
  loadBudgets();
});
budgetConfigYearInput.value = String(new Date().getFullYear());
document.getElementById('budgetConfigPreviousYear').addEventListener(
  'click',
  () => changeBudgetConfigYear(-1),
);
document.getElementById('budgetConfigNextYear').addEventListener(
  'click',
  () => changeBudgetConfigYear(1),
);
document.getElementById('copyBudgetConfigNextYear').addEventListener(
  'click',
  copyBudgetConfigToNextYear,
);
budgetConfigYearInput.addEventListener('change', () => changeBudgetConfigYear());
savingsProjectionYearsInput.addEventListener('change', saveSavingsProjectionConfig);
document.getElementById('saveForecastParams').addEventListener('click', saveForecastParams);
freezeSavingsForecastBtn.addEventListener('click', freezeSavingsForecast);
savingsSnapshotSelect.addEventListener('change', selectSavingsSnapshot);
savingsShowRecalculatedInput.addEventListener('change', renderSavingsChart);
savingsStartDateInput.addEventListener('change', saveSavingsDateRange);
savingsEndDateInput.addEventListener('change', saveSavingsDateRange);
document.getElementById('saveSavingsColumnsConfig').addEventListener('click', saveSavingsColumnSettings);
exportSavingsExcelBtn.addEventListener('click', () => {
  window.location.href = '/api/ahorro/export';
});
document.getElementById('addSavingsRecord').addEventListener('click', () => openSavingsModal());
savingsForm.addEventListener('submit', saveSavingsRecord);
document.getElementById('closeSavingsModal').addEventListener('click', closeSavingsModal);
document.getElementById('cancelSavingsModal').addEventListener('click', closeSavingsModal);
savingsModal.addEventListener('click', (event) => {
  if (event.target === savingsModal) closeSavingsModal();
});
importBankFilter.addEventListener('change', refreshImportTabRows);
importSearchInput.addEventListener('input', refreshImportTabRows);
importSelectAll.addEventListener('change', () => {
  const visibleKeys = filterImportPreviewRows(currentImportRows).map((row) => row.clave);
  visibleKeys.forEach((key) => {
    if (importSelectAll.checked) {
      selectedImportKeys.add(key);
    } else {
      selectedImportKeys.delete(key);
    }
  });
  refreshImportTabRows();
});

document.getElementById('resetFilters').addEventListener('click', () => {
  state.q = '';
  state.fuente = '';
  state.categoria = '';
  state.dateStart = '';
  state.dateEnd = '';
  state.amountMin = '';
  state.amountMax = '';
  state.sortBy = 'f_valor';
  state.sortDir = 'desc';
  updateMovimientosSortIndicators();
  searchInput.value = '';
  fuenteFilter.value = '';
  categoriaFilter.value = '';
  dateStartFilter.value = '';
  dateEndFilter.value = '';
  amountMinFilter.value = '';
  amountMaxFilter.value = '';
  loadMovimientos();
});

exportExcelBtn.addEventListener('click', () => {
  const params = new URLSearchParams({
    q: state.q,
    fuente: state.fuente,
    categoria: state.categoria,
  });
  if (state.dateStart) params.set('date_start', state.dateStart);
  if (state.dateEnd) params.set('date_end', state.dateEnd);
  if (state.amountMin !== '') {
    params.set('importe_min_cent', String(Math.round(Number(state.amountMin) * 100)));
  }
  if (state.amountMax !== '') {
    params.set('importe_max_cent', String(Math.round(Number(state.amountMax) * 100)));
  }
  params.set('sort_by', state.sortBy);
  params.set('sort_dir', state.sortDir);
  window.location.href = `/api/movimientos/export?${params.toString()}`;
});

function populateEditCategoryOptions() {
  const categorySelect = editForm.elements['categoria2'];
  fetchJson('/api/options')
    .then((data) => {
      populateSelect(categorySelect, data.categorias, 'Selecciona una categoría');
    })
    .catch(() => {
      categorySelect.innerHTML = '<option value="">Sin opciones</option>';
    });
}

function openCreateModal() {
  editForm.reset();
  editForm.elements.id.value = '';
  modalTitle.textContent = 'Nueva línea';
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function openEditModal(row) {
  const form = editForm;
  form.reset();
  Object.entries(row).forEach(([key, value]) => {
    const field = form.elements[key];
    if (field) {
      field.value = ['importe_cent', 'disponible_cent'].includes(key) && value !== null && value !== undefined
        ? formatEuroInputFromCents(value)
        : value ?? '';
    }
  });

  if (form.elements['categoria2']) {
    form.elements['categoria2'].value = row.categoria2 || '';
  }

  modalTitle.textContent = 'Editar movimiento';
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

async function openCategoryModal(item) {
  categoryMovementId = item.id;
  categoryModalError.textContent = '';
  categoryModalTitle.textContent = `Cambiar categoría del movimiento ${item.id}`;
  categoryMovementSummary.textContent = `${item.fuente || '—'} · ${formatShortDate(item.f_valor || item.fecha)} · ${item.concepto || '—'}`;

  try {
    const options = await fetchJson('/api/options');
    populateSelect(quickCategorySelect, options.categorias, 'Selecciona una categoría');
    quickCategorySelect.value = item.categoria2 || '';
    categoryModal.classList.remove('hidden');
    categoryModal.setAttribute('aria-hidden', 'false');
    quickCategorySelect.focus();
  } catch (error) {
    categoryModalError.textContent = error.message;
    categoryModal.classList.remove('hidden');
    categoryModal.setAttribute('aria-hidden', 'false');
  }
}

function closeCategoryModal() {
  categoryModal.classList.add('hidden');
  categoryModal.setAttribute('aria-hidden', 'true');
  categoryForm.reset();
  categoryModalError.textContent = '';
  categoryMovementId = null;
}

function closeModal() {
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  editForm.reset();
  modalTitle.textContent = 'Editar movimiento';
}

function closeDeleteModal() {
  deleteConfirmModal.classList.add('hidden');
  deleteConfirmModal.setAttribute('aria-hidden', 'true');
  pendingDeleteId = null;
  pendingDeleteAction = null;
  deleteConfirmTitle.textContent = 'Confirmar eliminación';
  deleteConfirmText.textContent = '¿Seguro que quieres borrar este movimiento?';
  confirmDeleteBtn.textContent = 'Borrar';
}

document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelModal').addEventListener('click', closeModal);
document.getElementById('closeCategoryModal').addEventListener('click', closeCategoryModal);
document.getElementById('cancelCategoryModal').addEventListener('click', closeCategoryModal);
categoryModal.addEventListener('click', (event) => {
  if (event.target === categoryModal) closeCategoryModal();
});
quickCategorySelect.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.isComposing || event.repeat || saveQuickCategoryBtn.disabled) return;

  window.setTimeout(() => {
    if (saveQuickCategoryBtn.disabled) return;
    categoryForm.requestSubmit(saveQuickCategoryBtn);
    if (!saveQuickCategoryBtn.disabled) saveQuickCategoryBtn.focus();
  }, 0);
});
categoryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!categoryMovementId || !quickCategorySelect.value) return;

  saveQuickCategoryBtn.disabled = true;
  categoryModalError.textContent = '';
  try {
    await fetchJson(`/api/movimientos/${categoryMovementId}`, {
      method: 'POST',
      body: JSON.stringify({ categoria2: quickCategorySelect.value }),
    });
    closeCategoryModal();
    await Promise.all([loadMovimientos(), loadSummary(), loadDashboard()]);
  } catch (error) {
    categoryModalError.textContent = error.message;
  } finally {
    saveQuickCategoryBtn.disabled = false;
  }
});
document.getElementById('closeDeleteModal').addEventListener('click', closeDeleteModal);
document.getElementById('cancelDeleteModal').addEventListener('click', closeDeleteModal);
confirmDeleteBtn.addEventListener('click', async () => {
  if (pendingDeleteAction) {
    confirmDeleteBtn.disabled = true;
    try {
      await pendingDeleteAction();
    } finally {
      closeDeleteModal();
      confirmDeleteBtn.disabled = false;
    }
    return;
  }

  if (!pendingDeleteId) return;

  await fetchJson(`/api/movimientos/${pendingDeleteId}`, { method: 'DELETE' });
  closeDeleteModal();
  await loadMovimientos();
  await loadSummary();
});
newMovementBtn.addEventListener('click', openCreateModal);
confirmImportTabBtn.addEventListener('click', confirmImportAndRefresh);
if (confirmImportBtn) {
  confirmImportBtn.addEventListener('click', confirmImportAndRefresh);
}
document.getElementById('cancelImportPreviewBtn').addEventListener('click', () => {
  importPreviewModal.classList.add('hidden');
  importPreviewModal.setAttribute('aria-hidden', 'true');
});
document.getElementById('closeImportPreviewModal').addEventListener('click', () => {
  importPreviewModal.classList.add('hidden');
  importPreviewModal.setAttribute('aria-hidden', 'true');
});
document.getElementById('closeImportRowEditModal').addEventListener('click', closeImportRowEdit);
document.getElementById('cancelImportRowEditModal').addEventListener('click', closeImportRowEdit);
importRowEditModal.addEventListener('click', (event) => {
  if (event.target === importRowEditModal) closeImportRowEdit();
});
importRowCategory.addEventListener('keydown', (event) => {
  if (
    event.key !== 'Enter'
    || event.isComposing
    || event.repeat
    || !importRowCategory.value
  ) return;
  event.preventDefault();
  importRowEditForm.requestSubmit(importRowEditForm.querySelector('button[type="submit"]'));
});
importRowEditForm.addEventListener('submit', saveImportRowEdit);
modal.addEventListener('click', (event) => {
  if (event.target === modal) {
    closeModal();
  }
});
deleteConfirmModal.addEventListener('click', (event) => {
  if (event.target === deleteConfirmModal) {
    closeDeleteModal();
  }
});
importPreviewModal.addEventListener('click', (event) => {
  if (event.target === importPreviewModal) {
    importPreviewModal.classList.add('hidden');
    importPreviewModal.setAttribute('aria-hidden', 'true');
  }
});

editForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(editForm);
  const payload = {};
  let hasInvalidAmount = false;

  formData.forEach((value, key) => {
    if (key === 'id' || value === '') return;
    if (key === 'importe_cent' || key === 'disponible_cent') {
      const field = editForm.elements[key];
      const cents = parseEuroInputToCents(value);
      if (cents === null) {
        field.setCustomValidity('Introduce un importe válido, por ejemplo 1,23.');
        field.reportValidity();
        hasInvalidAmount = true;
        return;
      }
      field.setCustomValidity('');
      payload[key] = cents;
    } else {
      payload[key] = value;
    }
  });
  if (hasInvalidAmount) return;

  const id = formData.get('id');

  try {
    if (id) {
      await fetchJson(`/api/movimientos/${Number(id)}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } else {
      await fetchJson('/api/movimientos', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
    closeModal();
    await loadMovimientos();
    await loadSummary();
  } catch (error) {
    alert(error.message);
  }
});

['importe_cent', 'disponible_cent'].forEach((name) => {
  editForm.elements[name].addEventListener('input', (event) => {
    event.target.setCustomValidity('');
  });
});

(async function init() {
  initializeTheme();
  initializeSortableTables();
  populateEditCategoryOptions();
  await loadOptions();
  await loadSummary();
  setActiveView('dashboard');
})();

function initializeTheme() {
  const isDark = document.documentElement.dataset.theme === 'dark';
  applyChartTheme();
  updateThemeControls(isDark);
  themeToggle.addEventListener('click', () => {
    const enableDark = document.documentElement.dataset.theme !== 'dark';
    if (enableDark) {
      document.documentElement.dataset.theme = 'dark';
    } else {
      delete document.documentElement.dataset.theme;
    }
    localStorage.setItem('gestion-gastos-theme', enableDark ? 'dark' : 'light');
    updateThemeControls(enableDark);
    applyChartTheme();
  });
}

function applyChartTheme() {
  const styles = getComputedStyle(document.documentElement);
  Chart.defaults.color = styles.getPropertyValue('--muted').trim();
  Chart.defaults.borderColor = styles.getPropertyValue('--border').trim();
  [savingsChartInstance, savingsColumnsChartInstance].forEach((chart) => chart?.update());
}

function updateThemeControls(isDark) {
  themeToggle.setAttribute('aria-pressed', String(isDark));
  themeToggle.setAttribute(
    'aria-label',
    isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro',
  );
  themeToggle.title = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
}
