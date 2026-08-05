export interface RegionLookupRow {
  id?: number;
  region?: string;
  province?: string;
  networkEngineer?: string;
  lea?: string;
  engName?: string;
}

export function normalizeLookupKey(value: string | null | undefined): string {
  return String(value ?? '').replace(/[^A-Za-z0-9]/g, '').toLowerCase();
}

export function formatEngineerDisplay(
  networkEngineer: string | null | undefined,
  engName?: string | null
): string {
  const code = cleanDisplayValue(networkEngineer);
  const name = cleanDisplayValue(engName);

  if (!code) return name || '-';
  return name ? `${code} - ${name}` : code;
}

export function mapRegionRecord(item: any): RegionLookupRow {
  return {
    id: Number(item?.id ?? item?.Id ?? 0) || undefined,
    region: item?.region ?? item?.Region ?? '',
    province: item?.province ?? item?.Province ?? '',
    networkEngineer:
      item?.networkEngineer ??
      item?.networkengineer ??
      item?.NetworkEngineer ??
      item?.network_engineer ??
      '',
    lea:
      item?.lea ??
      item?.leacode ??
      item?.leaCode ??
      item?.LeaCode ??
      item?.LEA ??
      item?.lea_code ??
      '',
    engName:
      item?.engName ??
      item?.EngName ??
      item?.engname ??
      item?.ENGNAME ??
      '',
  };
}

export function mapRegionRecords(items: any[] | null | undefined): RegionLookupRow[] {
  return (Array.isArray(items) ? items : [])
    .map(mapRegionRecord)
    .filter((row) => Boolean(row.region || row.province || row.networkEngineer || row.lea));
}

export function buildEngineerDisplayMap(
  rows: RegionLookupRow[],
  engineers?: string[]
): Record<string, string> {
  const byEngineer = new Map<string, RegionLookupRow>();

  rows.forEach((row) => {
    const key = normalizeLookupKey(row.networkEngineer);
    if (key && !byEngineer.has(key)) {
      byEngineer.set(key, row);
    }
  });

  const source = engineers?.length
    ? engineers
    : Array.from(
        new Set(rows.map((row) => row.networkEngineer).filter((value): value is string => Boolean(value)))
      );

  return source.reduce((acc, engineer) => {
    const row = byEngineer.get(normalizeLookupKey(engineer));
    acc[engineer] = formatEngineerDisplay(engineer, row?.engName);
    return acc;
  }, {} as Record<string, string>);
}

export function buildEngineerDisplayLookupMap(
  rows: RegionLookupRow[],
  engineers?: string[]
): Record<string, string> {
  const lookup: Record<string, string> = {};

  Object.entries(buildEngineerDisplayMap(rows, engineers)).forEach(([engineer, display]) => {
    addDisplayLookup(lookup, engineer, display);
  });

  rows.forEach((row) => {
    const display = formatEngineerDisplay(row.networkEngineer, row.engName);
    [
      row.networkEngineer,
      row.lea,
      row.lea ? `NW/${row.lea}` : ''
    ].forEach((key) => addDisplayLookup(lookup, key, display));
  });

  return lookup;
}

function addDisplayLookup(map: Record<string, string>, key: string | null | undefined, display: string): void {
  const rawKey = cleanDisplayValue(key);
  const rawDisplay = cleanDisplayValue(display);
  if (!rawKey || !rawDisplay) return;

  map[rawKey] = rawDisplay;
  map[normalizeLookupKey(rawKey)] = rawDisplay;
}

function cleanDisplayValue(value: string | null | undefined): string {
  const trimmed = String(value ?? '').trim();
  return trimmed === '—' || trimmed === 'â€”' || trimmed === '-' ? '' : trimmed;
}
