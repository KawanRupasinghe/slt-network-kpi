const ExcelJS = require('exceljs');
const { execSync } = require('child_process');

function normalizeKpiKey(name) {
  return String(name).toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*\(\s*/g, '(')
    .replace(/\s*\)\s*/g, ')')
    .replace(/\s*<\s*/g, '<')
    .replace(/\s*>\s*/g, '>');
}

const KPI_NAME_ALIASES = {
  'routine maintenance - slbn/sdh': 'routine maintenance - slbn',
  'routine maintenance - msan/olte': 'routine maintenance - msan/olt'
};

function getCellText(cell) {
  const v = cell.value;
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'object' && v.richText) return v.richText.map((x) => x.text).join('');
  if (typeof v === 'object' && v.result !== undefined) return String(v.result);
  return String(v);
}

function getCellNum(cell) {
  const v = cell.value;
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && v.result !== undefined) {
    const r = v.result;
    return typeof r === 'number' ? r : null;
  }
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}

(async () => {
  const files = [
    'src/assets/kpi-sheets/overall_kpi_2026_01.xlsx',
    'src/assets/kpi-sheets/overall_kpi_2026_02.xlsx',
    'src/assets/kpi-sheets/overall_kpi_2026_03.xlsx'
  ];

  const sql = execSync("sqlcmd -S LAPTOP-8DKPN7A4\\SQLEXPRESS -d NWKPI -C -Q \"SET NOCOUNT ON; SELECT [keyPerformanceIndicators] FROM [dbo].[KpiDefinition] ORDER BY id;\"", { encoding: 'utf8' });
  const defs = sql.split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('keyPerformanceIndicators') && !line.startsWith('-----------') && !line.startsWith('id') && !line.startsWith('(') && !/^\d+$/.test(line))
    .map((line) => line.replace(/^\s*\d+\s+/, ''));

  const summary = [];

  for (const file of files) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);

    const ws = wb.getWorksheet('KPI Calculation') ?? wb.worksheets.find((candidate) => {
      for (let r = 1; r <= Math.min(candidate.rowCount, 15); r++) {
        const row = candidate.getRow(r);
        for (let c = 1; c <= Math.min(candidate.columnCount, 20); c++) {
          const text = getCellText(row.getCell(c)).trim().toLowerCase();
          if (text.includes('key performance indicators (kpi)')) return true;
        }
      }
      return false;
    }) ?? wb.worksheets[0];

    let headerRowIndex = 0;
    let kpiColumnIndex = -1;
    for (let rowIndex = 1; rowIndex <= Math.min(ws.rowCount, 20); rowIndex++) {
      const row = ws.getRow(rowIndex);
      for (let colIndex = 1; colIndex <= Math.min(ws.columnCount, 20); colIndex++) {
        const text = getCellText(row.getCell(colIndex)).trim().toLowerCase();
        if (text === 'key performance indicators (kpi)') {
          headerRowIndex = rowIndex;
          kpiColumnIndex = colIndex;
          break;
        }
      }
      if (headerRowIndex > 0) break;
    }

    const engineerRow = ws.getRow(headerRowIndex - 1);
    const leaColMap = [];
    for (let colIndex = 1; colIndex <= ws.columnCount; colIndex++) {
      const lea = getCellText(engineerRow.getCell(colIndex)).trim();
      if (!lea) continue;
      const nextCol = colIndex + 1;
      const nextNextCol = colIndex + 2;
      if (getCellText(engineerRow.getCell(nextCol)).trim() === lea && getCellText(engineerRow.getCell(nextNextCol)).trim() === lea) {
        leaColMap.push({ lea, col: colIndex });
        colIndex += 2;
      }
    }

    const rows = [];
    for (let rowIndex = headerRowIndex + 1; rowIndex <= ws.rowCount; rowIndex++) {
      const row = ws.getRow(rowIndex);
      const rawKpi = getCellText(row.getCell(kpiColumnIndex)).trim();
      if (!rawKpi) continue;
      const hasMetricValues = leaColMap.some(({ col }) => [col, col + 1, col + 2].some((metricCol) => getCellNum(row.getCell(metricCol)) !== null));
      if (!hasMetricValues) continue;
      rows.push(rawKpi);
    }

    summary.push({ file, rows });
  }

  console.log('Definitions from DB:');
  defs.forEach((d) => console.log('-', d));
  console.log('\nWorkbook KPI rows by file:');
  summary.forEach(({ file, rows }) => {
    console.log('\n' + file);
    rows.forEach((row) => console.log('-', row));
  });

  console.log('\nMatch report:');
  for (const def of defs) {
    const key = KPI_NAME_ALIASES[normalizeKpiKey(def)] ?? normalizeKpiKey(def);
    const present = summary.map(({ file, rows }) => ({ file, present: rows.some((row) => normalizeKpiKey(row) === key) }));
    if (!present.some((x) => x.present)) {
      console.log('NO MATCH:', def, '=>', key);
    }
  }
})();
