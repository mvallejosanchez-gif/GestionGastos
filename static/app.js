const state = {
  page: 1,
  limit: 50,
  total: 0,
  q: '',
  fuente: '',
  categoria: '',
  dateStart: '',
  dateEnd: '',
};

const summaryEl = document.getElementById('summary');
const refreshDataBtn = document.getElementById('refreshDataBtn');
const tableBody = document.getElementById('movimientosBody');
const searchInput = document.getElementById('searchInput');
const fuenteFilter = document.getElementById('fuenteFilter');
const categoriaFilter = document.getElementById('categoriaFilter');
const pageInfoEl = document.getElementById('pageInfo');
const movimientosCountEl = document.getElementById('movimientosCount');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const newMovementBtn = document.getElementById('newMovement');
const dateStartFilter = document.getElementById('dateStartFilter');
const dateEndFilter = document.getElementById('dateEndFilter');
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
const deleteConfirmText = document.getElementById('deleteConfirmText');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const importPreviewModal = document.getElementById('importPreviewModal');
const importPreviewSummary = document.getElementById('importPreviewSummary');
const importPreviewRows = document.getElementById('importPreviewRows');
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
const balanceHistoryMonthsInput = document.getElementById('balanceHistoryMonths');
const balanceHistoryConfigStatus = document.getElementById('balanceHistoryConfigStatus');
const budgetMonth = document.getElementById('budgetMonth');
const budgetSummary = document.getElementById('budgetSummary');
const budgetRows = document.getElementById('budgetRows');
const budgetTotals = document.getElementById('budgetTotals');
const savingsRows = document.getElementById('savingsRows');
const savingsChartCanvas = document.getElementById('savingsChart');
const savingsStatus = document.getElementById('savingsStatus');
const savingsModal = document.getElementById('savingsModal');
const savingsForm = document.getElementById('savingsForm');
const savingsModalTitle = document.getElementById('savingsModalTitle');
const savingsProjectionYearsInput = document.getElementById('savingsProjectionYears');
const savingsForecastMonthsInput = document.getElementById('savingsForecastMonths');
const savingsStartDateInput = document.getElementById('savingsStartDate');
const savingsProjectionConfigStatus = document.getElementById('savingsProjectionConfigStatus');
const importSummaryBadge = document.getElementById('importSummaryBadge');
const importStatusText = document.getElementById('importStatusText');
const importTabRows = document.getElementById('importTabRows');
const importBankFilter = document.getElementById('importBankFilter');
const importSearchInput = document.getElementById('importSearchInput');
const importSelectAll = document.getElementById('importSelectAll');
const confirmImportTabBtn = document.getElementById('confirmImportTabBtn');
const dashboardBankButtons = document.getElementById('dashboardBankButtons');
const dashboardTotal = document.getElementById('dashboardTotal');
const balanceHistoryChart = document.getElementById('balanceHistoryChart');
const balanceChartWrap = document.getElementById('balanceChartWrap');
const balanceChartTooltip = document.getElementById('balanceChartTooltip');
const balanceChartSummary = document.getElementById('balanceChartSummary');
const balanceChartLegend = document.getElementById('balanceChartLegend');
const balanceHistoryRows = document.getElementById('balanceHistoryRows');
const balanceMonthSelect = document.getElementById('balanceMonthSelect');
const dashboardCategoryVisuals = document.getElementById('dashboardVisuals');
const clearDashboardCategoryFilter = document.getElementById('clearDashboardCategoryFilter');
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
const dashboardMovementsPageLabel = document.getElementById('dashboardMovementsPage');
const dashboardMovementsPrevious = document.getElementById('dashboardMovementsPrevious');
const dashboardMovementsNext = document.getElementById('dashboardMovementsNext');

let selectedBanks = null;
let dashboardMovementsPage = 1;
let dashboardFilterKey = null;
let selectedDashboardCategories = {
  categoria0: null,
  categoria1: null,
  categoria2: null,
};
let pendingDeleteId = null;
let categoryMovementId = null;
let activeRangePreset = null;
let activeViewName = 'dashboard';
let currentImportRows = [];
let currentImportFilesCount = 0;
let selectedImportKeys = new Set();
let savingsChartInstance = null;
let savingsRecords = [];
let savedSavingsProjectionYears = '5';
let savedSavingsForecastMonths = '12';
let savedSavingsStartDate = '';
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
    header.tabIndex = 0;
    header.classList.add('sortable-header');
    header.setAttribute('aria-sort', 'none');
  });
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
  updateDashboardDateRange(data);
  clearDashboardCategoryFilter.disabled = !dashboardCategoryLevels.some((level) => selectedDashboardCategories[level]);
  dashboardCategoryLevels.forEach((level) => {
    renderDashboardCategory(level, data[`totales_por_${level}`] || []);
  });
}

function renderDashboardMovements(data) {
  const items = data.items || [];
  dashboardMovementsRows.replaceChildren();
  if (!items.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'empty';
    cell.textContent = 'No hay movimientos para los filtros seleccionados.';
    row.appendChild(cell);
    dashboardMovementsRows.appendChild(row);
  } else {
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
      dashboardMovementsRows.appendChild(row);
    });
  }

  const pages = Number(data.pages || 1);
  const page = Number(data.page || 1);
  dashboardMovementsSummary.textContent = `${data.total} movimientos · ${page}/${pages}`;
  dashboardMovementsPageLabel.textContent = `Página ${page} de ${pages}`;
  dashboardMovementsPrevious.disabled = page <= 1;
  dashboardMovementsNext.disabled = page >= pages;
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
  const button = event.target.closest('.dashboard-category-select');
  if (!button) return;
  const { categoryLevel, categoryValue } = button.dataset;
  selectedDashboardCategories[categoryLevel] = selectedDashboardCategories[categoryLevel] === categoryValue
    ? null
    : categoryValue;
  loadDashboard();
});

clearDashboardCategoryFilter.addEventListener('click', () => {
  dashboardCategoryLevels.forEach((level) => {
    selectedDashboardCategories[level] = null;
  });
  loadDashboard();
});

function renderImportPreviewRows(rows, filesCount = 0, targetBody = importPreviewRows, summaryEl = importPreviewSummary, countEl = importSummaryBadge) {
  if (!targetBody) return;
  const isImportTab = targetBody === importTabRows;
  const filteredRows = isImportTab ? filterImportPreviewRows(rows) : rows;
  const columnsCount = isImportTab ? 8 : 6;

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

  targetBody.innerHTML = filteredRows
    .map(
      (row, index) => `
        <tr>
          ${isImportTab ? `<td class="selection-cell"><input class="import-row-checkbox" type="checkbox" data-import-key="${row.clave}" aria-label="Seleccionar ${row.concepto || row.fuente || 'registro'}" ${selectedImportKeys.has(row.clave) ? 'checked' : ''} /></td>` : ''}
          <td>${row.fuente || '—'}</td>
          <td>${row.update_snapshot ? 'Actualizar saldo · ' : ''}${row.source_file || row.fuente || 'input'}</td>
          <td>${formatShortDate(row.f_valor || row.fecha)}</td>
          <td>${row.concepto || '—'}</td>
          <td>${row.movimiento || '—'}</td>
          <td class="money-cell">${formatMoneyFromCents(row.importe_cent || 0)}</td>
          ${isImportTab ? `<td><div class="row-actions"><button class="action-btn edit-btn" type="button" data-import-row-index="${index}" title="Editar fila">✎</button></div></td>` : ''}
        </tr>
      `
    )
    .join('');
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

  targetBody.querySelectorAll('.edit-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const row = filteredRows[Number(button.dataset.importRowIndex)];
      if (row) {
        openEditModal(row);
      }
    });
  });
  if (isImportTab) updateImportSelectionControls();
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
    currentImportRows = rows;
    currentImportFilesCount = filesCount;
    renderImportPreviewRows(rows, filesCount, importTabRows, importStatusText, importSummaryBadge);
    if (importPreviewSummary) {
      importPreviewSummary.textContent = rows.length
        ? `Se van a importar ${rows.length} registros pendientes desde la carpeta input.`
        : filesCount > 0
          ? `He revisado ${filesCount} archivo(s) de input y no quedan registros nuevos para importar.`
          : 'No hay registros nuevos pendientes de importación.';
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
      body: JSON.stringify({ claves: [...selectedImportKeys] }),
    });
    if (importPreviewModal) {
      importPreviewModal.classList.add('hidden');
      importPreviewModal.setAttribute('aria-hidden', 'true');
    }
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

function renderMovimientos(items) {
  if (!items.length) {
    tableBody.innerHTML = '<tr><td colspan="10" class="empty">No hay movimientos para esta búsqueda.</td></tr>';
    return;
  }

  tableBody.innerHTML = items
    .map(
      (item) => `
        <tr>
          <td>${item.id}</td>
          <td>${item.fuente || '—'}</td>
          <td>${formatShortDate(item.f_valor || item.fecha)}</td>
          <td>${item.concepto || '—'}</td>
          <td>${item.movimiento || '—'}</td>
          <td class="money-cell">${money(item.importe_cent)}</td>
          <td class="money-cell">${money(item.disponible_calculado_cent)}</td>
          <td><button class="badge category-edit-btn" type="button" data-id="${item.id}" title="Cambiar categoría" aria-label="Cambiar categoría del movimiento ${item.id}">${item.categoria2 || '—'}</button></td>
          <td>${item.comentarios || '—'}</td>
          <td>
            <div class="row-actions">
              <button class="action-btn edit-btn" type="button" data-id="${item.id}" title="Editar" aria-label="Editar movimiento ${item.id}">✎</button>
              <button class="action-btn clone-btn" type="button" data-id="${item.id}" title="Clonar" aria-label="Clonar movimiento ${item.id}">⧉</button>
              <button class="action-btn delete-btn" type="button" data-id="${item.id}" title="Borrar" aria-label="Borrar movimiento ${item.id}">🗑</button>
            </div>
          </td>
        </tr>
      `
    )
    .join('');
  applyDefaultTableSort(tableBody);

  tableBody.querySelectorAll('.category-edit-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const item = items.find((movement) => String(movement.id) === button.dataset.id);
      if (item) openCategoryModal(item);
    });
  });

  tableBody.querySelectorAll('.edit-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const row = await fetchJson(`/api/movimientos/${button.dataset.id}`);
      openEditModal(row);
    });
  });

  tableBody.querySelectorAll('.clone-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      await fetchJson(`/api/movimientos/${button.dataset.id}/clone`, { method: 'POST' });
      await loadMovimientos();
      await loadSummary();
    });
  });

  tableBody.querySelectorAll('.delete-btn').forEach((button) => {
    button.addEventListener('click', () => {
      pendingDeleteId = button.dataset.id;
      deleteConfirmText.textContent = `¿Seguro que quieres borrar el movimiento ${pendingDeleteId}?`;
      deleteConfirmModal.classList.remove('hidden');
      deleteConfirmModal.setAttribute('aria-hidden', 'false');
    });
  });
}

function updatePagination() {
  const pages = Math.max(1, Math.ceil(state.total / state.limit));
  prevPageBtn.disabled = state.page <= 1;
  nextPageBtn.disabled = state.page >= pages;
  pageInfoEl.textContent = `Página ${state.page} / ${pages}`;

  if (state.total === 1) {
    movimientosCountEl.textContent = '1 registro';
  } else {
    movimientosCountEl.textContent = `${state.total} registros`;
  }
}

async function loadOptions() {
  const data = await fetchJson('/api/options');
  populateSelect(fuenteFilter, data.fuentes, 'Todas las fuentes');
  populateSelect(categoriaFilter, data.categorias, 'Todas las categorías');

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

  const allBanksSelected = selectedBanks === null || selectedBanks.length === fuentes.length;
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

dateStartSlider.addEventListener('input', () => {
  activeRangePreset = null;
  setRangeShortcutState();
  if (Number(dateStartSlider.value) > Number(dateEndSlider.value)) {
    dateEndSlider.value = dateStartSlider.value;
  }
  syncDashboardDateInputs();
  loadDashboard();
});

dateEndSlider.addEventListener('input', () => {
  activeRangePreset = null;
  setRangeShortcutState();
  if (Number(dateEndSlider.value) < Number(dateStartSlider.value)) {
    dateStartSlider.value = dateEndSlider.value;
  }
  syncDashboardDateInputs();
  loadDashboard();
});

document.querySelectorAll('.range-shortcut:not(#clearDashboardDateFilter)').forEach((button) => {
  button.addEventListener('click', () => {
    applyRangePreset(button.dataset.range);
  });
});

if (clearDashboardDateFilter) {
  clearDashboardDateFilter.addEventListener('click', () => {
    if (!dashboardRange.min || !dashboardRange.max) return;
    activeRangePreset = 'all';
    setRangeShortcutState();
    dateStartSlider.value = '0';
    dateEndSlider.value = String(Math.max(1, daysBetween(dashboardRange.min, dashboardRange.max)));
    syncDashboardDateInputs();
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

async function loadDashboard(requestedMovementsPage = null) {
  const params = buildDashboardFilterParams();
  const filterKey = params.toString();
  if (dashboardFilterKey !== filterKey) {
    dashboardFilterKey = filterKey;
    dashboardMovementsPage = 1;
  }
  if (requestedMovementsPage !== null) {
    dashboardMovementsPage = requestedMovementsPage;
  }

  const dashboardData = await fetchJson(`/api/dashboard?${params.toString()}`);
  renderDashboard(dashboardData);
  params.set('page', String(dashboardMovementsPage));
  try {
    const movementsData = await fetchJson(`/api/dashboard/movimientos?${params.toString()}`);
    dashboardMovementsPage = movementsData.page;
    renderDashboardMovements(movementsData);
  } catch (error) {
    dashboardMovementsSummary.textContent = error.message;
    dashboardMovementsRows.innerHTML = '<tr><td colspan="6" class="empty">No se pudieron cargar los movimientos.</td></tr>';
  }
}

dashboardMovementsPrevious.addEventListener('click', () => {
  if (dashboardMovementsPage > 1) loadDashboard(dashboardMovementsPage - 1);
});

dashboardMovementsNext.addEventListener('click', () => {
  loadDashboard(dashboardMovementsPage + 1);
});

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

async function loadMovimientos() {
  const params = new URLSearchParams({
    page: String(state.page),
    limit: String(state.limit),
    q: state.q,
    fuente: state.fuente,
    categoria: state.categoria,
  });
  if (state.dateStart) params.set('date_start', state.dateStart);
  if (state.dateEnd) params.set('date_end', state.dateEnd);

  const data = await fetchJson(`/api/movimientos?${params.toString()}`);
  state.total = data.total;
  renderMovimientos(data.items);
  updatePagination();
}

async function loadSummary() {
  const data = await fetchJson('/api/summary');
  renderSummary(data);
}

async function loadAccountConfig() {
  accountConfigStatus.textContent = '';
  const [data] = await Promise.all([
    fetchJson('/api/config/cuentas'),
    loadSavingsProjectionConfig(),
  ]);
  balanceHistoryMonthsInput.value = String(data.meses_saldo_historico || 18);
  savedBalanceHistoryMonths = balanceHistoryMonthsInput.value;
  balanceHistoryConfigStatus.textContent = '';
  accountConfigBody.replaceChildren();

  if (!data.cuentas.length) {
    accountConfigBody.innerHTML = '<tr><td colspan="3" class="empty">No hay cuentas configuradas.</td></tr>';
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

    const balanceToggleCell = document.createElement('td');
    const balanceToggle = document.createElement('input');
    balanceToggle.type = 'checkbox';
    balanceToggle.className = 'account-balance-toggle';
    balanceToggle.checked = Boolean(account.incluir_en_saldos);
    balanceToggle.setAttribute('aria-label', `Incluir ${account.fuente} en saldos`);
    balanceToggle.addEventListener('change', async () => {
      balanceToggle.disabled = true;
      try {
        const saved = await fetchJson(`/api/config/cuentas/${encodeURIComponent(account.fuente)}`, {
          method: 'PUT',
          body: JSON.stringify({ incluir_en_saldos: balanceToggle.checked }),
        });
        balanceToggle.checked = Boolean(saved.incluir_en_saldos);
        accountConfigStatus.textContent = `${account.fuente} ${saved.incluir_en_saldos ? 'incluida en' : 'excluida de'} los saldos.`;
      } catch (error) {
        balanceToggle.checked = !balanceToggle.checked;
        accountConfigStatus.textContent = error.message;
      } finally {
        balanceToggle.disabled = false;
      }
    });
    balanceToggleCell.appendChild(balanceToggle);

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
    row.append(nameCell, amountCell, balanceToggleCell);
    accountConfigBody.appendChild(row);
  });
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
  budgetSummary.textContent = `Presupuesto: ${formatMoneyFromCents(data.budget_total_cent)} · Real: ${formatMoneyFromCents(data.actual_total_cent)} · Diferencia: ${formatBudgetDifference(data.difference_total_cent)}`;
  budgetRows.replaceChildren();

  data.groups.forEach((group) => {
    const groupRow = document.createElement('tr');
    groupRow.className = 'budget-group-row';
    const groupName = document.createElement('td');
    groupName.textContent = group.categoria1;
    groupRow.appendChild(groupName);
    groupRow.appendChild(document.createElement('td'));
    addBudgetMoneyCell(groupRow, group.budget_cent);
    addBudgetMoneyCell(groupRow, group.actual_cent);
    addBudgetMoneyCell(groupRow, group.difference_cent, true);
    budgetRows.appendChild(groupRow);

    group.children.forEach((category) => {
      const row = document.createElement('tr');
      row.className = 'budget-detail-row';
      row.appendChild(document.createElement('td'));
      const categoryName = document.createElement('td');
      categoryName.textContent = category.categoria2;
      row.appendChild(categoryName);
      addBudgetMoneyCell(row, category.budget_cent);
      addBudgetMoneyCell(row, category.actual_cent);
      addBudgetMoneyCell(row, category.difference_cent, true);
      budgetRows.appendChild(row);
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
}

async function loadBudgets() {
  const month = budgetMonth.value || new Date().toISOString().slice(0, 7);
  const data = await fetchJson(`/api/presupuestos?month=${encodeURIComponent(month)}`);
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

function getSavingsMonthlyRecords(records) {
  const monthlyRecords = new Map();
  records.forEach((record) => {
    const [day, month, year] = String(record.Mes || '').split('/').map(Number);
    if (day && month && year) {
      const monthIndex = year * 12 + month - 1;
      monthlyRecords.set(monthIndex, record);
    }
  });
  return [...monthlyRecords.entries()].sort(([left], [right]) => left - right);
}

function getSavingsProjectionMonthlyAverage(records, months) {
  const monthlyRecords = getSavingsMonthlyRecords(records).slice(-months);
  const recentForecasts = monthlyRecords
    .map(([, record]) => parseSavingsAmount(record['Ahorro Mensual Previsto']))
    .filter((value) => value !== null);
  if (!recentForecasts.length) return 0;
  return recentForecasts.reduce((total, value) => total + value, 0) / recentForecasts.length;
}

function getSavingsTotalMonthlyChange(records, months) {
  const monthlyRecords = getSavingsMonthlyRecords(records).slice(-months);
  if (monthlyRecords.length < 2) return 0;

  const monthlyRates = [];
  for (let index = 1; index < monthlyRecords.length; index += 1) {
    const [previousMonth, previousRecord] = monthlyRecords[index - 1];
    const [currentMonth, currentRecord] = monthlyRecords[index];
    const elapsedMonths = currentMonth - previousMonth;
    if (!elapsedMonths) continue;
    const previousTotal = parseSavingsAmount(previousRecord['Ahorro Total']) || 0;
    const currentTotal = parseSavingsAmount(currentRecord['Ahorro Total']) || 0;
    monthlyRates.push((currentTotal - previousTotal) / elapsedMonths);
  }
  if (!monthlyRates.length) return 0;
  return monthlyRates.reduce((total, rate) => total + rate, 0) / monthlyRates.length;
}

function getVisibleSavingsRecords() {
  if (!savedSavingsStartDate) return savingsRecords;
  return savingsRecords.filter((record) => savingsDateForInput(record.Mes) >= savedSavingsStartDate);
}

function renderSavingsChart() {
  if (savingsChartInstance) savingsChartInstance.destroy();
  const visibleRecords = getVisibleSavingsRecords();
  const labels = visibleRecords.map((record) => record.Mes);
  const totalValues = visibleRecords.map((record) => {
    const value = Number(record['Ahorro Total']);
    return Number.isFinite(value) ? value : 0;
  });
  const hypotheticalValues = visibleRecords.map((record) => {
    const value = Number(record['Ahorro Hipotético']);
    return Number.isFinite(value) ? value : 0;
  });
  const totalForecastValues = visibleRecords.map(() => null);
  const hypotheticalForecastValues = visibleRecords.map(() => null);

  if (visibleRecords.length) {
    const lastIndex = visibleRecords.length - 1;
    const lastRecord = visibleRecords[lastIndex];
    const windowMonths = Number(savedSavingsForecastMonths);
    const plannedMonthlySavings = getSavingsProjectionMonthlyAverage(savingsRecords, windowMonths);
    const totalMonthlyChange = getSavingsTotalMonthlyChange(savingsRecords, windowMonths);
    let projectedTotal = totalValues[lastIndex];
    let projectedHypothetical = hypotheticalValues[lastIndex];
    totalForecastValues[lastIndex] = projectedTotal;
    hypotheticalForecastValues[lastIndex] = projectedHypothetical;

    const [day, month, year] = String(lastRecord.Mes).split('/').map(Number);
    if (day && month && year) {
      const monthCount = Number(savedSavingsProjectionYears) * 12;
      for (let offset = 1; offset <= monthCount; offset += 1) {
        const futureDate = new Date(Date.UTC(year, month - 1 + offset, 1));
        projectedTotal += totalMonthlyChange;
        projectedHypothetical += plannedMonthlySavings;
        labels.push(savingsMonthLabel(futureDate));
        totalValues.push(null);
        hypotheticalValues.push(null);
        totalForecastValues.push(projectedTotal);
        hypotheticalForecastValues.push(projectedHypothetical);
      }
    }
  }

  savingsChartInstance = new Chart(savingsChartCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Ahorro Total',
          data: totalValues,
          borderColor: '#2962ff',
          backgroundColor: '#2962ff',
          tension: 0.2,
        },
        {
          label: 'Ahorro Hipotético',
          data: hypotheticalValues,
          borderColor: '#1ea672',
          backgroundColor: '#1ea672',
          tension: 0.2,
        },
        {
          label: 'Forecast Ahorro Total',
          data: totalForecastValues,
          borderColor: '#e67e22',
          backgroundColor: '#e67e22',
          borderDash: [6, 4],
          pointRadius: 2,
          spanGaps: true,
        },
        {
          label: 'Forecast Ahorro Hipotético',
          data: hypotheticalForecastValues,
          borderColor: '#a23be0',
          backgroundColor: '#a23be0',
          borderDash: [6, 4],
          pointRadius: 2,
          spanGaps: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
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

function renderSavingsRows() {
  const visibleRecords = getVisibleSavingsRecords();
  savingsRows.replaceChildren();
  if (!visibleRecords.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
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
      formatSavingsAmount(record['Ahorro Mensual Previsto']),
      record.Comentarios || '—',
    ];
    values.forEach((value, index) => {
      const cell = document.createElement('td');
      cell.textContent = value ?? '';
      if (index === 1 || index === 2) cell.className = 'savings-amount';
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
    savedSavingsForecastMonths = String(config.meses_media_forecast_ahorro);
    savedSavingsStartDate = config.fecha_inicio_evolucion_ahorro || '';
    savingsProjectionYearsInput.value = savedSavingsProjectionYears;
    savingsForecastMonthsInput.value = savedSavingsForecastMonths;
    savingsStartDateInput.value = savedSavingsStartDate;
    savingsRecords = data.rows;
    renderSavingsRows();
    renderSavingsChart();
    savingsStatus.textContent = `${getVisibleSavingsRecords().length} de ${savingsRecords.length} registros mostrados.`;
  } catch (error) {
    savingsStatus.textContent = error.message;
  }
}

function openSavingsModal(record = null) {
  savingsForm.reset();
  savingsForm.elements.namedItem('rowid').value = record?.rowid ?? '';
  savingsModalTitle.textContent = record ? 'Editar registro de ahorro' : 'Añadir registro de ahorro';
  savingsFields.forEach((field) => {
    const input = savingsForm.elements.namedItem(field);
    const value = record?.[field];
    if (field === 'Mes') {
      input.value = savingsDateForInput(value);
    } else if (savingsAmountFields.includes(field)) {
      input.value = parseSavingsAmount(value) ?? '';
    } else {
      input.value = value ?? '';
    }
  });
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
  savedSavingsForecastMonths = String(data.meses_media_forecast_ahorro);
  savedSavingsStartDate = data.fecha_inicio_evolucion_ahorro || '';
  savingsProjectionYearsInput.value = savedSavingsProjectionYears;
  savingsForecastMonthsInput.value = savedSavingsForecastMonths;
  savingsStartDateInput.value = savedSavingsStartDate;
  savingsProjectionConfigStatus.textContent = '';
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
    savingsProjectionConfigStatus.textContent = `Proyección actualizada: ${result.anios_proyeccion_ahorro} años.`;
    if (activeViewName === 'savings') renderSavingsChart();
  } catch (error) {
    savingsProjectionYearsInput.value = savedSavingsProjectionYears;
    savingsProjectionConfigStatus.textContent = error.message;
  }
}

async function saveSavingsForecastMonths() {
  const months = Number(savingsForecastMonthsInput.value);
  if (!Number.isInteger(months) || months < 1 || months > 120) {
    savingsProjectionConfigStatus.textContent = 'Elige una ventana entre 1 y 120 meses.';
    savingsForecastMonthsInput.value = savedSavingsForecastMonths;
    return;
  }

  try {
    const result = await fetchJson('/api/config/ahorro-proyeccion', {
      method: 'PUT',
      body: JSON.stringify({ meses_media_forecast_ahorro: months }),
    });
    savedSavingsForecastMonths = String(result.meses_media_forecast_ahorro);
    savingsForecastMonthsInput.value = savedSavingsForecastMonths;
    savingsProjectionConfigStatus.textContent = `Ventana del forecast actualizada: ${result.meses_media_forecast_ahorro} meses.`;
    if (activeViewName === 'savings') renderSavingsChart();
  } catch (error) {
    savingsForecastMonthsInput.value = savedSavingsForecastMonths;
    savingsProjectionConfigStatus.textContent = error.message;
  }
}

async function saveSavingsStartDate() {
  try {
    const result = await fetchJson('/api/config/ahorro-proyeccion', {
      method: 'PUT',
      body: JSON.stringify({ fecha_inicio_evolucion_ahorro: savingsStartDateInput.value }),
    });
    savedSavingsStartDate = result.fecha_inicio_evolucion_ahorro || '';
    savingsStartDateInput.value = savedSavingsStartDate;
    savingsProjectionConfigStatus.textContent = savedSavingsStartDate
      ? `La evolución del ahorro se mostrará desde el ${formatDateValue(savedSavingsStartDate)}.`
      : 'Se mostrarán todos los registros de ahorro.';
    renderSavingsRows();
    renderSavingsChart();
    savingsStatus.textContent = `${getVisibleSavingsRecords().length} de ${savingsRecords.length} registros mostrados.`;
  } catch (error) {
    savingsStartDateInput.value = savedSavingsStartDate;
    savingsProjectionConfigStatus.textContent = error.message;
  }
}

async function refreshDatabaseData() {
  const originalText = refreshDataBtn.textContent;
  refreshDataBtn.disabled = true;
  refreshDataBtn.textContent = 'Actualizando...';

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
    refreshDataBtn.textContent = 'Actualizado';
    refreshDataBtn.title = 'Datos actualizados desde la base de datos';
  } catch (error) {
    refreshDataBtn.textContent = 'Error al actualizar';
    refreshDataBtn.title = error.message;
  } finally {
    refreshDataBtn.disabled = false;
    window.setTimeout(() => {
      refreshDataBtn.textContent = originalText;
      refreshDataBtn.title = 'Actualizar datos desde la base de datos';
    }, 1800);
  }
}

refreshDataBtn.addEventListener('click', refreshDatabaseData);

searchInput.addEventListener('input', (event) => {
  state.q = event.target.value.trim();
  state.page = 1;
  loadMovimientos();
});

fuenteFilter.addEventListener('change', (event) => {
  state.fuente = event.target.value;
  state.page = 1;
  loadMovimientos();
});

categoriaFilter.addEventListener('change', (event) => {
  state.categoria = event.target.value;
  state.page = 1;
  loadMovimientos();
});

dateStartFilter.addEventListener('change', (event) => {
  state.dateStart = event.target.value;
  state.page = 1;
  loadMovimientos();
});

dateEndFilter.addEventListener('change', (event) => {
  state.dateEnd = event.target.value;
  state.page = 1;
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
savingsProjectionYearsInput.addEventListener('change', saveSavingsProjectionConfig);
savingsForecastMonthsInput.addEventListener('change', saveSavingsForecastMonths);
savingsStartDateInput.addEventListener('change', saveSavingsStartDate);
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
  state.page = 1;
  searchInput.value = '';
  fuenteFilter.value = '';
  categoriaFilter.value = '';
  dateStartFilter.value = '';
  dateEndFilter.value = '';
  loadMovimientos();
});

prevPageBtn.addEventListener('click', () => {
  if (state.page > 1) {
    state.page -= 1;
    loadMovimientos();
  }
});

nextPageBtn.addEventListener('click', () => {
  const pages = Math.max(1, Math.ceil(state.total / state.limit));
  if (state.page < pages) {
    state.page += 1;
    loadMovimientos();
  }
});

exportExcelBtn.addEventListener('click', () => {
  const params = new URLSearchParams({
    q: state.q,
    fuente: state.fuente,
    categoria: state.categoria,
  });
  if (state.dateStart) params.set('date_start', state.dateStart);
  if (state.dateEnd) params.set('date_end', state.dateEnd);
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
}

document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelModal').addEventListener('click', closeModal);
document.getElementById('closeCategoryModal').addEventListener('click', closeCategoryModal);
document.getElementById('cancelCategoryModal').addEventListener('click', closeCategoryModal);
categoryModal.addEventListener('click', (event) => {
  if (event.target === categoryModal) closeCategoryModal();
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
  initializeSortableTables();
  populateEditCategoryOptions();
  await loadOptions();
  await loadSummary();
  await loadMovimientos();
  await loadDashboard();
  setActiveView('dashboard');
})();
