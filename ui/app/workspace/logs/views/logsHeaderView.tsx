import { ColumnConfigDropdown, type ColumnConfigEntry } from "@/components/table";
import { Button } from "@/components/ui/button";
import { Command, CommandItem, CommandList } from "@/components/ui/command";
import { DateTimePickerWithRange } from "@/components/ui/datePickerWithRange";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getErrorMessage, useRecalculateLogCostsMutation } from "@/lib/store";
import type { LogFilters as LogFiltersType } from "@/lib/types/logs";
import { getRangeForPeriod, TIME_PERIODS } from "@/lib/utils/timeRange";
import { Calculator, MoreVertical, Radio, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface LogsHeaderViewProps {
	filters: LogFiltersType;
	onFiltersChange: (filters: LogFiltersType) => void;
	fetchLogs: () => Promise<void>;
	fetchStats: () => Promise<void>;
	fetchHistogram: () => Promise<void>;
	loading?: boolean;
	polling: boolean;
	onPollToggle: (enabled: boolean) => void;
	period: string;
	onPeriodChange: (period?: string, from?: Date, to?: Date) => void;
	/** Column config for the ColumnConfigDropdown */
	columnEntries: ColumnConfigEntry[];
	columnLabels: Record<string, string>;
	onToggleColumnVisibility: (id: string) => void;
	onResetColumns: () => void;
}

export function LogsHeaderView({
	filters,
	onFiltersChange,
	fetchLogs,
	fetchStats,
	fetchHistogram,
	loading = false,
	polling,
	onPollToggle,
	period,
	onPeriodChange,
	columnEntries,
	columnLabels,
	onToggleColumnVisibility,
	onResetColumns,
}: LogsHeaderViewProps) {
	const { t } = useTranslation();
	const [openMoreActionsPopover, setOpenMoreActionsPopover] = useState(false);
	const [localSearch, setLocalSearch] = useState(filters.content_search || "");
	const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
	const filtersRef = useRef<LogFiltersType>(filters);
	const [recalculateCosts] = useRecalculateLogCostsMutation();

	const [startTime, setStartTime] = useState<Date | undefined>(filters.start_time ? new Date(filters.start_time) : undefined);
	const [endTime, setEndTime] = useState<Date | undefined>(filters.end_time ? new Date(filters.end_time) : undefined);

	useEffect(() => {
		setStartTime(filters.start_time ? new Date(filters.start_time) : undefined);
		setEndTime(filters.end_time ? new Date(filters.end_time) : undefined);
	}, [filters.start_time, filters.end_time]);

	useEffect(() => {
		filtersRef.current = filters;
	}, [filters]);

	useEffect(() => {
		setLocalSearch(filters.content_search || "");
	}, [filters.content_search]);

	useEffect(() => {
		return () => {
			if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
		};
	}, []);

	const handleRecalculateCosts = useCallback(async () => {
		try {
			const response = await recalculateCosts({ filters }).unwrap();
			await fetchLogs();
			await fetchStats();
			setOpenMoreActionsPopover(false);
			toast.success(t("workspace.logs.header.recalculatedCostsTitle", { count: response.updated }), {
				description: t("workspace.logs.header.recalculatedCostsDescription", {
					updated: response.updated,
					skipped: response.skipped,
					remaining: response.remaining,
				}),
				duration: 5000,
			});
		} catch (err) {
			toast.error(getErrorMessage(err));
		}
	}, [filters, recalculateCosts, fetchLogs, fetchStats]);

	const handleSearchChange = useCallback(
		(value: string) => {
			setLocalSearch(value);
			if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
			searchTimeoutRef.current = setTimeout(() => {
				onFiltersChange({ ...filtersRef.current, content_search: value });
			}, 500);
		},
		[onFiltersChange],
	);

	return (
		<div className="flex grow items-center justify-between space-x-2">
			<Button
				data-testid="logs-refresh-btn"
				variant="outline"
				size="sm"
				className="h-7.5 disabled:opacity-100"
				onClick={() => {
					fetchLogs();
					fetchStats();
					fetchHistogram();
				}}
				disabled={loading}
			>
				<RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
				{t("workspace.logs.refresh")}
			</Button>
			<Button
				data-testid="logs-live-btn"
				variant={polling ? "default" : "outline"}
				size="sm"
				className="h-7.5"
				onClick={() => onPollToggle(!polling)}
			>
				{polling ? <Radio className="h-4 w-4 animate-pulse" /> : <Radio className="h-4 w-4" />}
				{t("workspace.mcpLogs.live")}
			</Button>
			<div className="border-input flex h-7.5 flex-1 items-center gap-2 rounded-sm border">
				<Search className="mr-0.5 ml-2 size-4" />
				<Input
					type="text"
					className="!h-7 rounded-tl-none rounded-tr-sm rounded-br-sm rounded-bl-none border-none bg-slate-50 shadow-none outline-none focus-visible:ring-0"
					placeholder={t("workspace.logs.header.searchPlaceholder")}
					value={localSearch}
					onChange={(e) => handleSearchChange(e.target.value)}
				/>
			</div>

			<DateTimePickerWithRange
				triggerTestId="filter-date-range"
				dateTime={{ from: startTime, to: endTime }}
				predefinedPeriod={period || undefined}
				onDateTimeUpdate={(p) => {
					setStartTime(p.from);
					setEndTime(p.to);
					onPeriodChange(undefined, p.from, p.to);
				}}
				preDefinedPeriods={TIME_PERIODS}
				onPredefinedPeriodChange={(periodValue) => {
					if (!periodValue) return;
					const { from, to } = getRangeForPeriod(periodValue);
					setStartTime(from);
					setEndTime(to);
					// Relative period: store it in URL and update timestamps via parent
					onPeriodChange(periodValue, from, to);
				}}
			/>
			<Popover open={openMoreActionsPopover} onOpenChange={setOpenMoreActionsPopover}>
				<PopoverTrigger asChild>
					<Button variant="outline" size="sm" className="h-7.5 w-7.5">
						<MoreVertical className="h-4 w-4" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="bg-accent w-[250px] p-2" align="end">
					<Command>
						<CommandList>
							<CommandItem className="hover:bg-accent/50 cursor-pointer" onSelect={handleRecalculateCosts}>
								<Calculator className="text-muted-foreground size-4" />
								<div className="flex flex-col">
									<span className="text-sm">{t("workspace.logs.header.recalculateCosts")}</span>
									<span className="text-muted-foreground text-xs">{t("workspace.logs.header.recalculateCostsDescriptionShort")}</span>
								</div>
							</CommandItem>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
			<ColumnConfigDropdown
				entries={columnEntries}
				labels={columnLabels}
				onToggleVisibility={onToggleColumnVisibility}
				onReset={onResetColumns}
			/>
		</div>
	);
}
