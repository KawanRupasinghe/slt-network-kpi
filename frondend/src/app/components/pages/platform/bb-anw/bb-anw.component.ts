/*
 File: bb-anw.component.ts
 Description: Broadband & Access Network KPI platform page
 Purpose: Display and manage BB ANW KPI metrics for assigned platforms.
 Features: Data visualization, export to Excel, node-level analytics
*/

import { CommonModule } from '@angular/common';
import { AuthService } from '../../../../services/auth.service';
import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RegionService, Region } from '../../../../services/region.service';
import { BbAnwService, BbAnwDto } from '../../../../services/bb-anw.service';
import { AgedNetworkFailureService } from '../../../../services/aged-network-failure.service';
import * as ExcelJS from 'exceljs';
import { firstValueFrom } from 'rxjs';

const AGED_FAILURE_KPI = 'Unavailability of Aged Network Failures - BB ANW';
const AGED_FAILURE_PLATFORM = 'BB_ANW';

/* ========== DATA TYPES ========== */

/* Generic dictionary type */
type Dict<T = any> = Record<string, T>;

interface RegionRow {
	region?: string;
	province?: string;
	networkEngineer?: string;
	lea?: string;
}

interface NodeMeta {
	month: number;
	year: number;
}

interface BbAnwEntry {
	id: number;
	order: number;
	networkEngineerKpi: string;
	division?: string | null;
	section?: string | null;
	kpiPercent?: number | null;
	totalMinutes: Dict<number | null>;
	unavailableMinutes: Dict<number | null>;
	totalNodes: Dict<number | null>;
	nodeMeta: Dict<NodeMeta>;
}

interface EditCellState {
	rowId: number | null;
	key: string | null;
	value: string;
}

type MetricKey = 'unavailableMinutes' | 'totalMinutes' | 'totalNodes';

const LOCAL_REGION_TABLE: RegionRow[] = [
	{ region: 'Region 3', province: 'NP', networkEngineer: 'NW/NP-2', lea: 'KOMLTMBVA' },
	{ region: 'Region 3', province: 'NP', networkEngineer: 'NW/NP-1', lea: 'JA' },
	{ region: 'Region 3', province: 'EP', networkEngineer: 'NW/EP', lea: 'BCAPKLTC' },
	{ region: 'Region 2', province: 'WPS & SP', networkEngineer: 'NW/WPS', lea: 'HRKTPH' },
	{ region: 'Region 2', province: 'WPS & SP', networkEngineer: 'NW/SPW', lea: 'AGGL' },
	{ region: 'Region 2', province: 'WPS & SP', networkEngineer: 'NW/SPE', lea: 'EMBMBMH' },
	{ region: 'Region 2', province: 'SAB & UVA', networkEngineer: 'NW/SAB', lea: 'KERN' },
	{ region: 'Region 2', province: 'SAB & UVA', networkEngineer: 'NW/UVA', lea: 'BDBWMRG' },
	{ region: 'Region 1', province: 'CP & NCP', networkEngineer: 'NW/NCP', lea: 'ADPR' },
	{ region: 'Region 1', province: 'CP & NCP', networkEngineer: 'NW/CPS', lea: 'GPHTNW' },
	{ region: 'Region 1', province: 'CP & NCP', networkEngineer: 'NW/CPN', lea: 'DBKYMT' },
	{ region: 'Region 1', province: 'WPN & NWP', networkEngineer: 'NW/NWPW', lea: 'CWPX' },
	{ region: 'Region 1', province: 'WPN & NWP', networkEngineer: 'NW/NWPE', lea: 'KGKLY' },
	{ region: 'Region 1', province: 'WPN & NWP', networkEngineer: 'NW/WPN', lea: 'NGWT' },
	{ region: 'Metro', province: 'Metro 2', networkEngineer: 'NWWPE', lea: 'KONKX' },
	{ region: 'Metro', province: 'Metro 2', networkEngineer: 'NWWPSE', lea: 'AWHO' },
	{ region: 'Metro', province: 'Metro 2', networkEngineer: 'NWWPSW', lea: 'NDRM' },
	{ region: 'Metro', province: 'Metro 1', networkEngineer: 'NWWPNE', lea: 'GQKINTB' },
	{ region: 'Metro', province: 'Metro 1', networkEngineer: 'NWWPC-2 (CEN/HK/MD)', lea: 'CENHKMD' },
	{ region: 'Metro', province: 'Metro 1', networkEngineer: 'NWWPC-1 (CEN/HK/MD)', lea: 'CENHKMD1' },
];

@Component({
	selector: 'app-bb-anw',
	standalone: true,
	imports: [CommonModule, FormsModule],
	templateUrl: './bb-anw.component.html',
	styleUrls: ['./bb-anw.component.scss'],
})
export class BbAnwComponent implements OnInit, OnDestroy {
	pageTitle = 'BB & ANW';

	data: BbAnwEntry[] = [];
	private allEntries: BbAnwEntry[] = [];
	regionTable: RegionRow[] = [...LOCAL_REGION_TABLE];
	adminRows: BbAnwDto[] = [];

	loading = true;
	error: string | null = null;
	cellSaving = false;

	isEditingAllowed = false;
	devRoleOverride: 'padmin' | 'user' | null = null;

	private permissionTimer: ReturnType<typeof setInterval> | null = null;

	formValues = {
		dropdown1: '',
		dropdown2: '',
		dropdown3: '',
		dropdown4: '',
	};

	dropdown2Options: string[] = [];
	dropdown3Options: string[] = [];
	dropdown4Options: string[] = [];

	selectedYear: number = new Date().getFullYear();
	selectedMonth: number = new Date().getMonth() + 1;
	yearOptions: number[] = [];
	readonly monthOptions: Array<{ label: string; value: number }> = [
		{ value: 1, label: 'January' },
		{ value: 2, label: 'February' },
		{ value: 3, label: 'March' },
		{ value: 4, label: 'April' },
		{ value: 5, label: 'May' },
		{ value: 6, label: 'June' },
		{ value: 7, label: 'July' },
		{ value: 8, label: 'August' },
		{ value: 9, label: 'September' },
		{ value: 10, label: 'October' },
		{ value: 11, label: 'November' },
		{ value: 12, label: 'December' },
	];

	editCell: EditCellState = {
		rowId: null,
		key: null,
		value: '',
	};

	toasts: Array<{ id: number; type: 'success' | 'danger'; text: string }> = [];
	private toastId = 1;

	optionMapping: Record<string, string> = {
		cenhkmd: 'CEN/HK/MD',
		cenhkmd1: 'CEN/HK/MD',
		gqkintb: 'GQ / KI / NTB',
		ndfrm: 'ND / RM',
		awho: 'AW / HO',
		konix: 'KON / KX',
		ngivt: 'NG / WT',
		kgkly: 'KG / KLY',
		cwpx: 'CW / PX',
		debkymt: 'DB / KY / MT',
		gphtnw: 'GP / HT / NW',
		adipr: 'AD / PR',
		bddwmrg: 'BD / BW / MRG',
		keirn: 'KE / RN',
		embmbmh: 'EMB / HB / MH',
		aggl: 'AG / GL',
		hrktph: 'HR / KT / PH',
		bcjrdkltc: 'BC / AP / KL / TC',
		ja: 'JA',
		komltmbva: 'KO / MLT / MB / VA',
	};

	// Tracks has_unavailability value per area for aged-failure KPI rows
	agedFailureValues: Record<string, number> = {}; // key = areaCode, value = 0|1
	agedFailureSaving = false;

	private metricLabelMap: Record<MetricKey, string> = {
		unavailableMinutes: 'Unavailable minutes',
		totalMinutes: 'Total minutes',
		totalNodes: 'Total nodes',
	};

	private friendlyToDbKey: Record<string, string> = {};
	private filtersInitialized = false;

	constructor(
		private regionService: RegionService,
		private bbAnwService: BbAnwService,
		private authService: AuthService,
		private agedFailureService: AgedNetworkFailureService,
		private cdr: ChangeDetectorRef
	) {}

	ngOnInit(): void {
		this.buildFriendlyMap();
		this.initializePeriodDefaults();
		this.refreshEditPermission();
		this.loadRegionTable();
		this.initializeFilters();
		this.loadData();
		this.loadAgedFailureData();

		this.permissionTimer = setInterval(() => this.refreshEditPermission(), 60000);
	}

	ngOnDestroy(): void {
		if (this.permissionTimer) {
			clearInterval(this.permissionTimer);
			this.permissionTimer = null;
		}
	}

	get regions(): string[] {
		return Array.from(
			new Set(this.regionTable.map((row) => row.region).filter(Boolean) as string[])
		);
	}

	get selectedKey(): string {
		return this.formValues.dropdown4 ? this.norm(this.formValues.dropdown4) : '';
	}

	get selectedAreaLabel(): string | null {
		const key = this.selectedKey;
		if (!key) {
			return null;
		}
		return this.optionMapping[key] ?? key.toUpperCase();
	}

	get selectedMonthLabel(): string {
		return (
			this.monthOptions.find((month) => month.value === this.selectedMonth)?.label ??
			'Month'
		);
	}

	get showAreaMetrics(): boolean {
		return Boolean(this.selectedKey);
	}

	getSelectedAvailability(entry: BbAnwEntry): string {
		const key = this.selectedKey;
		if (!key) {
			return '--';
		}
		const unavailable = entry.unavailableMinutes?.[key];
		const total = entry.totalMinutes?.[key];
		const nodes = entry.totalNodes?.[key];
		const hasData = [unavailable, total, nodes].some(
			(value) => value !== undefined && value !== null
		);
		if (!hasData) {
			return '--';
		}
		const meta = entry.nodeMeta?.[key];
		const pct = this.calculatePercentage(total, unavailable, nodes, meta);
		return `${pct.toFixed(2)}%`;
	}

	getMetricDisplay(
		entry: BbAnwEntry,
		metric: 'unavailableMinutes' | 'totalMinutes' | 'totalNodes'
	): string {
		const key = this.selectedKey;
		if (!key) {
			return '--';
		}
		const source = (entry as any)[metric] ?? {};
		const rawValue = source[key];
		if (rawValue === undefined || rawValue === null || rawValue === '') {
			return '--';
		}
		return typeof rawValue === 'number' ? String(rawValue) : `${rawValue}`;
	}

	private norm(value: string | null | undefined): string {
		return value ? value.replace(/[^A-Za-z0-9]/g, '').toLowerCase() : '';
	}

	private hasAreaData(entry: BbAnwEntry, key: string): boolean {
		const pools = [entry.unavailableMinutes, entry.totalMinutes, entry.totalNodes];
		return pools.some((pool) => pool && pool[key] !== undefined && pool[key] !== null);
	}

	private buildFriendlyMap(): void {
		const out: Record<string, string> = {};
		Object.keys(this.optionMapping).forEach((dbKey) => {
			out[this.norm(this.optionMapping[dbKey])] = dbKey;
			out[this.norm(dbKey)] = dbKey;
		});
		this.friendlyToDbKey = out;
	}

	private showToast(type: 'success' | 'danger', text: string): void {
		const id = this.toastId++;
		this.toasts.push({ id, type, text });
		setTimeout(() => this.dismissToast(id), 2800);
	}

	dismissToast(id: number): void {
		this.toasts = this.toasts.filter((toast) => toast.id !== id);
	}

	private refreshEditPermission(): void {
		if (this.devRoleOverride) {
			this.isEditingAllowed = this.devRoleOverride === 'padmin';
			return;
		}

		this.isEditingAllowed = this.authService.canEditPage('BB ANW');
	}

	toggleRoleOverride(): void {
		if (!this.devRoleOverride) {
			this.devRoleOverride = 'padmin';
		} else if (this.devRoleOverride === 'padmin') {
			this.devRoleOverride = 'user';
		} else {
			this.devRoleOverride = null;
		}

		this.refreshEditPermission();
		const label = this.devRoleOverride ? this.devRoleOverride.toUpperCase() : 'LIVE ROLE';
		this.showToast('success', `Role override: ${label}`);
	}


	loadRegionTable(): void {
		this.regionService.getAll().subscribe({
			next: (res: Region[] | any[]) => {
				const source = Array.isArray(res) ? res : [];

				const mapped: RegionRow[] = source.map((item: any) => ({
					region: item.region ?? item.Region ?? '',
					province: item.province ?? item.Province ?? '',
					networkEngineer:
						item.networkEngineer ??
						item.networkengineer ??
						item.NetworkEngineer ??
						'',
					lea:
						item.lea ??
						item.leacode ??
						item.leaCode ??
						item.LEA ??
						'',
				}));

				this.regionTable = mapped.length ? mapped : [...LOCAL_REGION_TABLE];
				this.initializeFilters();
			},
			error: (err) => {
				console.error('Failed to fetch region table from API, using local fallback:', err);
				this.regionTable = [...LOCAL_REGION_TABLE];
				this.initializeFilters();
			},
		});
	}

	loadData(): void {
		this.loading = true;
		this.error = null;

		this.bbAnwService.getAll().subscribe({
			next: (rows) => {
				const list = Array.isArray(rows) ? rows : [];
				this.adminRows = list;
				this.allEntries = list.map((row, index) => this.mapDtoToEntry(row, index + 1));
				this.applyPeriodFilter();
				this.loading = false;
				this.cdr.detectChanges();
			},
			error: (err) => {
				console.error('Failed to load BB & ANW admin data:', err);
				this.adminRows = [];
				this.data = [];
				this.loading = false;
				this.error = 'Failed to load BB & ANW KPI data.';
				this.cdr.detectChanges();
			},
		});
	}

	private mapDtoToEntry(dto: BbAnwDto, order = 0): BbAnwEntry {
		const entry: BbAnwEntry = {
			id: dto.id ?? 0,
			order,
			networkEngineerKpi: dto.networkEngineerKpi,
			division: dto.division ?? null,
			section: dto.section ?? null,
			kpiPercent: dto.kpiPercent ?? null,
			totalMinutes: {},
			unavailableMinutes: {},
			totalNodes: {},
			nodeMeta: {},
		};

		(dto.nodes ?? []).forEach((node) => {
			console.log('DTO node:', node?.month, node?.year);
			const code = this.norm(node.nodeCode);
			if (!code) return;
			entry.unavailableMinutes[code] = node.unavailableMinutes ?? null;
			entry.totalMinutes[code] = node.totalMinutes ?? null;
			entry.totalNodes[code] = node.totalNodes ?? null;
			entry.nodeMeta[code] = this.normalizeNodeMeta(node?.month, node?.year);
		});

		return entry;
	}

	private buildDtoFromEntry(entry: BbAnwEntry): BbAnwDto {
		const codes = this.collectNodeCodes(entry);
		const nodes = codes
			.map((code) => {
				const meta = this.ensureNodeMeta(entry, code);
				return {
					nodeCode: code,
					unavailableMinutes: this.toNullableNumber(entry.unavailableMinutes[code]),
					totalMinutes: this.toNullableNumber(entry.totalMinutes[code]),
					totalNodes: this.toNullableNumber(entry.totalNodes[code]),
					month: meta.month,
					year: meta.year,
				};
			})
			.filter(
					(node) =>
						node.unavailableMinutes != null ||
						node.totalNodes != null ||
						node.totalMinutes != null
				);

		return {
			id: entry.id,
			networkEngineerKpi: entry.networkEngineerKpi,
			division: entry.division ?? null,
			section: entry.section ?? null,
			kpiPercent: entry.kpiPercent ?? null,
			nodes,
		};
	}

	private collectNodeCodes(entry: BbAnwEntry): string[] {
		const codes = new Set<string>();
		Object.keys(entry.unavailableMinutes || {}).forEach((key) => codes.add(key));
		Object.keys(entry.totalMinutes || {}).forEach((key) => codes.add(key));
		Object.keys(entry.totalNodes || {}).forEach((key) => codes.add(key));
		Object.keys(entry.nodeMeta || {}).forEach((key) => codes.add(key));
		return Array.from(codes).filter((code): code is string => Boolean(code));
	}

	private ensureNodeMeta(entry: BbAnwEntry, key: string): NodeMeta {
		if (!entry.nodeMeta[key]) {
			entry.nodeMeta[key] = this.getDefaultNodeMeta();
		}
		return entry.nodeMeta[key];
	}

	private getDefaultNodeMeta(): NodeMeta {
		return this.normalizeNodeMeta(this.selectedMonth, this.selectedYear);
	}

	private normalizeNodeMeta(month?: number | null, year?: number | null): NodeMeta {
		// Prefer the currently selected reporting period as the fallback so
		// missing node metadata aligns with the UI period the user is viewing.
		const now = new Date();
		const fallbackMonth = typeof this.selectedMonth === 'number' ? this.selectedMonth : now.getMonth() + 1;
		const fallbackYear = typeof this.selectedYear === 'number' ? this.selectedYear : now.getFullYear();
		const safeMonth =
			typeof month === 'number' && month >= 1 && month <= 12 ? month : fallbackMonth;
		const safeYear = typeof year === 'number' && year >= 1900 ? year : fallbackYear;
		return { month: safeMonth, year: safeYear };
	}

	private getDaysInMonth(month?: number | null, year?: number | null): number {
		const meta = this.normalizeNodeMeta(month, year);
		return new Date(meta.year, meta.month, 0).getDate();
	}

	private toNullableNumber(value: any): number | null {
		if (value === undefined || value === null || value === '') return null;
		const numeric = typeof value === 'number' ? value : Number(value);
		return Number.isFinite(numeric) ? numeric : null;
	}

	private updateDropdown2Options(region: string): void {
		if (!region) {
			this.dropdown2Options = [];
			return;
		}

		this.dropdown2Options = Array.from(
			new Set(
				this.regionTable
					.filter((row) => row.region === region)
					.map((row) => row.province)
					.filter(Boolean) as string[]
			)
		);
	}

	private updateDropdown3Options(province: string): void {
		if (!province || !this.formValues.dropdown1) {
			this.dropdown3Options = [];
			return;
		}

		this.dropdown3Options = Array.from(
			new Set(
				this.regionTable
					.filter(
						(row) => row.region === this.formValues.dropdown1 && row.province === province
					)
					.map((row) => row.networkEngineer)
					.filter(Boolean) as string[]
			)
		);
	}

	private updateDropdown4Options(engineer: string): void {
		if (!engineer || !this.formValues.dropdown1 || !this.formValues.dropdown2) {
			this.dropdown4Options = [];
			return;
		}

		const leas = this.regionTable
			.filter(
				(row) =>
					row.region === this.formValues.dropdown1 &&
					row.province === this.formValues.dropdown2 &&
					row.networkEngineer === engineer
			)
			.map((row) => {
				const normalized = this.norm(row.lea);
				return this.friendlyToDbKey[normalized] || normalized;
			})
			.filter(Boolean);

		this.dropdown4Options = Array.from(new Set(leas));
	}

	private initializeFilters(): void {
		// Do not auto-select any filters; keep "Select an option" as default
		// and let the user drive all selections consistently with other pages.
		this.formValues = {
			dropdown1: '',
			dropdown2: '',
			dropdown3: '',
			dropdown4: '',
		};
		this.dropdown2Options = [];
		this.dropdown3Options = [];
		this.dropdown4Options = [];
		this.filtersInitialized = true;
	}

	private initializePeriodDefaults(): void {
		const now = new Date();
		const currentYear = now.getFullYear();
		this.yearOptions = [currentYear - 2, currentYear - 1, currentYear];
		const previous = new Date(currentYear, now.getMonth() - 1, 1);
		this.selectedYear = previous.getFullYear();
		this.selectedMonth = previous.getMonth() + 1;
		this.applyPeriodFilter();
	}

	private applyPeriodFilter(): void {
		if (!this.allEntries.length) {
			this.data = [];
			return;
		}

		const month = this.selectedMonth;
		const year = this.selectedYear;
		this.data = this.allEntries.map((entry) =>
			this.createPeriodScopedEntry(entry, month, year)
		);
	}

	private createPeriodScopedEntry(entry: BbAnwEntry, month: number, year: number): BbAnwEntry {
		const filteredUnavailable: Dict<number | null> = {};
		const filteredTotal: Dict<number | null> = {};
		const filteredNodes: Dict<number | null> = {};
		const filteredMeta: Dict<NodeMeta> = {};
		const codes = this.collectNodeCodes(entry);

		codes.forEach((code) => {
			const rawMeta = entry.nodeMeta?.[code];
			const normalized = rawMeta
				? this.normalizeNodeMeta(rawMeta.month, rawMeta.year)
				: { month, year };
			const matchesPeriod = normalized.month === month && normalized.year === year;
			if (matchesPeriod) {
				filteredUnavailable[code] = entry.unavailableMinutes?.[code] ?? null;
				filteredTotal[code] = entry.totalMinutes?.[code] ?? null;
				filteredNodes[code] = entry.totalNodes?.[code] ?? null;
				filteredMeta[code] = normalized;
			} else {
				// initialize empty values for the requested period instead of inheriting from other months
				filteredUnavailable[code] = null;
				filteredTotal[code] = null;
				filteredNodes[code] = null;
				filteredMeta[code] = { month, year };
			}
		});

		return {
			...entry,
			unavailableMinutes: filteredUnavailable,
			totalMinutes: filteredTotal,
			totalNodes: filteredNodes,
			nodeMeta: filteredMeta,
		};
	}

	onDropdownChange(
		name: 'dropdown1' | 'dropdown2' | 'dropdown3' | 'dropdown4',
		value: string
	): void {
		if (name === 'dropdown1') {
			this.formValues.dropdown1 = value;
			this.formValues.dropdown2 = '';
			this.formValues.dropdown3 = '';
			this.formValues.dropdown4 = '';

			this.updateDropdown2Options(value);
			this.dropdown3Options = [];
			this.dropdown4Options = [];
			this.cancelEdit();
			return;
		}

		if (name === 'dropdown2') {
			this.formValues.dropdown2 = value;
			this.formValues.dropdown3 = '';
			this.formValues.dropdown4 = '';

			this.updateDropdown3Options(value);
			this.dropdown4Options = [];
			this.cancelEdit();
			return;
		}

		if (name === 'dropdown3') {
			this.formValues.dropdown3 = value;
			this.formValues.dropdown4 = '';

			this.updateDropdown4Options(value);
			this.cancelEdit();
			return;
		}

		this.formValues.dropdown4 = value;
		this.cancelEdit();
		this.loadAgedFailureData();
	}

	isAgedFailureKpi(name: string): boolean {
		return name?.includes('Unavailability of Aged Network Failures') ?? false;
	}

	getAgedFailureValue(areaCode: string): number {
		return this.agedFailureValues[areaCode] ?? 0;
	}

	setAgedFailureValue(areaCode: string, value: number): void {
		this.agedFailureValues[areaCode] = value;
	}

	async saveAgedFailure(areaCode: string): Promise<void> {
		if (!areaCode) return;
		this.agedFailureSaving = true;
		try {
			const result: any = await firstValueFrom(this.agedFailureService.upsert({
				areaCode,
				platformType: AGED_FAILURE_PLATFORM,
				hasUnavailability: this.agedFailureValues[areaCode] ?? 0,
				month: this.selectedMonth,
				year: this.selectedYear,
			}));
			this.showToast('success', result?.message ?? 'Saved successfully.');
		} catch {
			this.showToast('danger', 'Failed to save Has Unavailability.');
		} finally {
			this.agedFailureSaving = false;
		}
	}

	private loadAgedFailureData(): void {
		const key = this.selectedKey;
		if (!key) return;
		this.agedFailureService
			.get(key, this.selectedMonth, this.selectedYear, AGED_FAILURE_PLATFORM)
			.subscribe({
				next: (rows) => {
					rows.forEach((r) => {
						// normalise key: strip non-alphanumeric, lowercase
						const k = r.areaCode?.replace(/[^A-Za-z0-9]/g, '').toLowerCase() ?? '';
						if (k) this.agedFailureValues[k] = r.hasUnavailability;
					});
					this.cdr.detectChanges();
				},
				error: () => {},
			});
	}

	onPeriodChange(): void {
		this.cancelEdit();
		this.applyPeriodFilter();
		this.loadAgedFailureData();
	}

	calculatePercentage(
		totalMinutes: any,
		unavailableMinutes: any,
		totalNodes: any,
		meta?: NodeMeta
	): number {
		const tm = Number(totalMinutes) || 0;
		const um = Number(unavailableMinutes) || 0;
		const tn = Number(totalNodes) || 0;

		const totalAvailableMinutes = tm - um;
		const days = this.getDaysInMonth(meta?.month, meta?.year);
		const totalMin = 24 * 60 * days * tn;
		if (totalMin <= 0) {
			return 100;
		}

		const pct = (100 * totalAvailableMinutes) / totalMin;
		return Math.max(0, Math.min(100, pct));
	}

	startEdit(entry: BbAnwEntry, key: MetricKey): void {
		// disallow editing of computed-only metric `totalMinutes`
		if (key === 'totalMinutes') return;
		if (!this.isEditingAllowed || !this.selectedKey || this.cellSaving) return;

		const nestedKey = `${key}.${this.selectedKey}`;
		const value = (entry as any)[key]?.[this.selectedKey];

		this.editCell = {
			rowId: entry.id,
			key: nestedKey,
			value: value === undefined || value === null ? '' : String(value),
		};
	}

	onEditInput(value: string): void {
		this.editCell = { ...this.editCell, value };
	}

	async doneEdit(): Promise<void> {
		if (this.editCell.rowId === null || !this.editCell.key) return;

		const [rawParentKey, childKey] = this.editCell.key.split('.');
		const parentKey = rawParentKey as MetricKey;
		if (!childKey || !parentKey) {
			this.cancelEdit();
			return;
		}

		const newValue = this.editCell.value;
		const updatedEntry = this.findAndUpdateEntry(parentKey, childKey, newValue);

		if (!updatedEntry) {
			this.cancelEdit();
			return;
		}
		if (!updatedEntry.id) {
			this.showToast('danger', 'Missing KPI identifier. Please reload and try again.');
			this.cancelEdit();
			return;
		}

		this.cellSaving = true;
		try {
			await firstValueFrom(
				this.bbAnwService.update(updatedEntry.id, this.buildDtoFromEntry(updatedEntry))
			);
			const metricLabel = this.metricLabelMap[parentKey] || 'KPI metric';
			this.showToast('success', `${metricLabel} saved.`);
		} catch (error) {
			console.error('Failed to save KPI metric:', error);
			this.showToast('danger', 'Failed to save metric. Please try again.');
		} finally {
			this.cellSaving = false;
			this.cancelEdit();
		}
	}

	private findAndUpdateEntry(
		parentKey: MetricKey,
		childKey: string,
		newValue: string
	): BbAnwEntry | null {
		// prevent updates to computed-only metric
		if (parentKey === 'totalMinutes') return null;
		let filteredEntry: BbAnwEntry | null = null;

		this.data = this.data.map((entry) => {
			if (entry.id !== this.editCell.rowId) {
				return entry;
			}

			const next: BbAnwEntry = this.createPeriodScopedEntry(
				entry,
				this.selectedMonth,
				this.selectedYear
			);

			(next as any)[parentKey][childKey] = this.toNullableNumber(newValue);

			// ensure node meta reflects the current edited period so the DTO sends correct month/year
			(next as any).nodeMeta = { ...(next as any).nodeMeta };
			(next as any).nodeMeta[childKey] = { month: this.selectedMonth, year: this.selectedYear };

			if (parentKey === 'totalNodes') {
				const nodeVal = (next as any).totalNodes?.[childKey] ?? null;
				if (nodeVal == null) {
					next.totalMinutes = {
						...(next.totalMinutes || {}),
						[childKey]: null,
					};
				} else {
					const days = this.getDaysInMonth(this.selectedMonth, this.selectedYear);
					next.totalMinutes = {
						...(next.totalMinutes || {}),
						[childKey]: 24 * 60 * days * nodeVal,
					};
				}
			}

			filteredEntry = next;
			return next;
		});

		if (!filteredEntry) {
			return null;
		}

		const targetEntry = filteredEntry as BbAnwEntry;
		const targetId = targetEntry.id;
		this.allEntries = this.allEntries.map((entry) => {
			if (entry.id !== targetId) {
				return entry;
			}

			const next: BbAnwEntry = this.createPeriodScopedEntry(
				entry,
				this.selectedMonth,
				this.selectedYear
			);

			(next as any)[parentKey][childKey] = this.toNullableNumber(newValue);

			// also force nodeMeta on the canonical allEntries copy
			(next as any).nodeMeta = { ...(next as any).nodeMeta };
			(next as any).nodeMeta[childKey] = { month: this.selectedMonth, year: this.selectedYear };

			if (parentKey === 'totalNodes') {
				const nodeVal = next.totalNodes?.[childKey] ?? null;
				if (nodeVal == null) {
					next.totalMinutes = {
						...next.totalMinutes,
						[childKey]: null,
					};
				} else {
					const days = this.getDaysInMonth(this.selectedMonth, this.selectedYear);
					next.totalMinutes = {
						...next.totalMinutes,
						[childKey]: 24 * 60 * days * nodeVal,
					};
				}
			}

			return next;
		});

		return this.allEntries.find((entry) => entry.id === targetId) ?? null;
	}

	isEditingCell(entry: BbAnwEntry, key: 'unavailableMinutes' | 'totalMinutes' | 'totalNodes'): boolean {
		const selected = this.selectedKey;
		if (!selected) {
			return false;
		}
		return this.editCell.rowId === entry.id && this.editCell.key === `${key}.${selected}`;
	}

	cancelEdit(): void {
		this.editCell = { rowId: null, key: null, value: '' };
	}

	async exportToExcel(): Promise<void> {
		const workbook = new ExcelJS.Workbook();
		const worksheet = workbook.addWorksheet('BB & ANW KPI');
		const exportEntries = this.selectedKey
			? this.data.filter((entry) => this.hasAreaData(entry, this.selectedKey!))
			: this.data;
		const areaKeys = this.selectedKey ? [this.selectedKey] : Object.keys(this.optionMapping);

		worksheet.addRow(['KPI (MSAN / OLT / IP Core - Network Availability)']);
		worksheet.addRow([`Generated Date: ${new Date().toISOString().split('T')[0]}`]);
		worksheet.addRow([]);

		const headers = [
			'No',
			'Network Engineer KPI',
			'Division',
			'Section',
			'KPI Percent',
			...areaKeys.flatMap((key) => {
				const label = this.optionMapping[key] || key;
				return [
					`${label} Availability (%)`,
					`${label} Unavailable Minutes`,
					`${label} Total Minutes`,
					`${label} Total Nodes`,
				];
			}),
		];

		const headerRow = worksheet.addRow(headers);
		headerRow.eachCell((cell: ExcelJS.Cell) => {
			cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0070C0' } };
			cell.font = { bold: true, color: { argb: 'FFFFFF' } };
			cell.alignment = { vertical: 'middle', horizontal: 'center' };
			cell.border = {
				top: { style: 'thin' },
				left: { style: 'thin' },
				bottom: { style: 'thin' },
				right: { style: 'thin' },
			};
		});

		exportEntries.forEach((entry) => {
			const row: any[] = [
				entry.order,
				entry.networkEngineerKpi,
				entry.division,
				entry.section,
				entry.kpiPercent,
			];

			areaKeys.forEach((key) => {
				const pct = this.calculatePercentage(
					entry.totalMinutes?.[key],
					entry.unavailableMinutes?.[key],
					entry.totalNodes?.[key],
					entry.nodeMeta?.[key]
				);
				row.push(isNaN(pct) ? '' : `${pct.toFixed(2)}%`);
				row.push(entry.unavailableMinutes?.[key] ?? '');
				row.push(entry.totalMinutes?.[key] ?? '');
				row.push(entry.totalNodes?.[key] ?? '');
			});

			const bodyRow = worksheet.addRow(row);
			bodyRow.eachCell((cell: ExcelJS.Cell) => {
				cell.alignment = { vertical: 'middle', horizontal: 'center' };
				cell.border = {
					top: { style: 'thin' },
					left: { style: 'thin' },
					bottom: { style: 'thin' },
					right: { style: 'thin' },
				};
			});

		});

		worksheet.columns.forEach((column) => {
			if (column) {
				column.width = 18;
			}
		});

		const buffer = await workbook.xlsx.writeBuffer();
		const blob = new Blob([buffer], {
			type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		});

		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = `BB_ANW_KPI_${new Date().toISOString().split('T')[0]}.xlsx`;
		link.click();
		URL.revokeObjectURL(link.href);
	}
}
