/**
 * Routing Rules Table
 * Displays all routing rules with CRUD actions
 */

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alertDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProviderIconType, RenderProviderIcon } from "@/lib/constants/icons";
import { getProviderLabel } from "@/lib/constants/logs";
import { getErrorMessage } from "@/lib/store";
import { useDeleteRoutingRuleMutation, useUpdateRoutingRuleMutation } from "@/lib/store/apis/routingRulesApi";
import { RoutingRule, RoutingTarget } from "@/lib/types/routingRules";
import { getPriorityBadgeClass, getScopeLabel, truncateCELExpression } from "@/lib/utils/routingRules";
import { ChevronLeft, ChevronRight, Edit, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface RoutingRulesTableProps {
	rules: RoutingRule[] | undefined;
	totalCount: number;
	isLoading: boolean;
	onEdit: (rule: RoutingRule) => void;
	onRowClick: (rule: RoutingRule) => void;
	/** When false, delete button is hidden and deletion is disabled (e.g. for read-only users). */
	canDelete?: boolean;
	/** When false, enabled toggle is disabled (e.g. for read-only users). */
	canUpdate?: boolean;
	search: string;
	onSearchChange: (value: string) => void;
	offset: number;
	limit: number;
	onOffsetChange: (offset: number) => void;
}

export function RoutingRulesTable({
	rules,
	totalCount,
	isLoading,
	onEdit,
	onRowClick,
	canDelete = false,
	canUpdate = false,
	search,
	onSearchChange,
	offset,
	limit,
	onOffsetChange,
}: RoutingRulesTableProps) {
	const { t } = useTranslation();
	const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
	const [deleteRoutingRule, { isLoading: isDeleting }] = useDeleteRoutingRuleMutation();
	const [updateRoutingRule] = useUpdateRoutingRuleMutation();

	const handleDelete = async () => {
		if (!canDelete || !deleteRuleId) return;

		try {
			await deleteRoutingRule(deleteRuleId).unwrap();
			toast.success(t("workspace.routingRules.deletedSuccess"));
			setDeleteRuleId(null);
		} catch (error: any) {
			toast.error(getErrorMessage(error));
		}
	};

	if (isLoading) {
		return (
			<div className="rounded-sm border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("workspace.routingRules.name")}</TableHead>
							<TableHead>{t("workspace.routingRules.targets")}</TableHead>
							<TableHead>{t("workspace.routingRules.scope")}</TableHead>
							<TableHead className="text-right">{t("workspace.routingRules.priority")}</TableHead>
							<TableHead>{t("workspace.routingRules.expression")}</TableHead>
							<TableHead>{t("workspace.routingRules.enabled")}</TableHead>
							<TableHead className="text-right">{t("workspace.routingRules.actions")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{[...Array(5)].map((_, i) => (
							<TableRow key={i}>
								<TableCell colSpan={7} className="h-10">
									<div className="bg-muted h-2 w-32 animate-pulse rounded" />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		);
	}

	const sortedRules = rules ? [...rules].sort((a, b) => a.priority - b.priority) : [];
	const ruleToDelete = sortedRules.find((r) => r.id === deleteRuleId);

	return (
		<>
			{/* Toolbar: Search */}
			<div className="flex items-center gap-3">
				<div className="relative max-w-sm flex-1">
					<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
					<Input
						aria-label={t("workspace.routingRules.searchAriaLabel")}
						placeholder={t("workspace.routingRules.searchPlaceholder")}
						value={search}
						onChange={(e) => onSearchChange(e.target.value)}
						className="pl-9"
						data-testid="routing-rules-search-input"
					/>
				</div>
			</div>

			<div className="overflow-hidden rounded-sm border">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/50">
							<TableHead className="font-semibold">{t("workspace.routingRules.name")}</TableHead>
							<TableHead className="font-semibold">{t("workspace.routingRules.targets")}</TableHead>
							<TableHead className="font-semibold">{t("workspace.routingRules.scope")}</TableHead>
							<TableHead className="text-right font-semibold">{t("workspace.routingRules.priority")}</TableHead>
							<TableHead className="font-semibold">{t("workspace.routingRules.expression")}</TableHead>
							<TableHead className="font-semibold">{t("workspace.routingRules.status")}</TableHead>
							<TableHead className="text-right font-semibold">{t("workspace.routingRules.actions")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sortedRules.length === 0 ? (
							<TableRow>
								<TableCell colSpan={7} className="h-24 text-center">
									<span className="text-muted-foreground text-sm">{t("workspace.routingRules.noMatching")}</span>
								</TableCell>
							</TableRow>
						) : (
							sortedRules.map((rule) => (
								<TableRow key={rule.id} className="hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => onRowClick(rule)}>
									<TableCell className="font-medium">
										<div className="flex flex-col gap-1">
											<span className="max-w-xs truncate">{rule.name}</span>
											{rule.description && (
												<span data-testid="routing-rule-description" className="text-muted-foreground max-w-xs truncate text-xs">
													{rule.description}
												</span>
											)}
										</div>
									</TableCell>
									<TableCell>
										<TargetsSummary targets={rule.targets || []} />
									</TableCell>
									<TableCell>
										<Badge variant="secondary">{getScopeLabel(rule.scope)}</Badge>
									</TableCell>
									<TableCell className="text-right">
										<div className={`inline-block rounded px-2.5 py-1 text-xs font-medium ${getPriorityBadgeClass()}`}>{rule.priority}</div>
									</TableCell>
									<TableCell>
										<span className="text-muted-foreground block max-w-xs truncate font-mono text-xs" title={rule.cel_expression}>
											{truncateCELExpression(rule.cel_expression)}
										</span>
									</TableCell>
									<TableCell onClick={(e) => e.stopPropagation()}>
										<Switch
											data-testid={`routing-rule-enabled-${rule.id}-switch`}
											checked={rule.enabled ?? true}
											size="md"
											disabled={!canUpdate}
											onAsyncCheckedChange={async (checked) => {
												await updateRoutingRule({ id: rule.id, data: { enabled: checked } })
													.unwrap()
													.then(() => {
													toast.success(t("workspace.routingRules.toggledStateSuccess", { state: checked ? t("workspace.routingRules.enabled") : t("workspace.routingRules.disabled") }));
												})
												.catch((err) => {
													toast.error(t("workspace.routingRules.failedToUpdate"), { description: getErrorMessage(err) });
												});
											}}
										/>
									</TableCell>
									<TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
										<div className="flex items-center justify-end gap-2">
											{canUpdate && (
												<Button
													variant="ghost"
													size="sm"
													onClick={() => onEdit(rule)}
													aria-label={t("workspace.routingRules.editAriaLabel")}
													data-testid={`routing-rule-edit-${rule.id}-btn`}
												>
													<Edit className="h-4 w-4" />
												</Button>
											)}
											{canDelete && (
												<Button
													variant="ghost"
													size="sm"
													onClick={() => setDeleteRuleId(rule.id)}
													aria-label={t("workspace.routingRules.deleteAriaLabel")}
													data-testid={`routing-rule-delete-${rule.id}-btn`}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											)}
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			{totalCount > 0 && (
				<div className="flex items-center justify-between px-2">
					<p className="text-muted-foreground text-sm">
						{t("workspace.routingRules.showing", { from: offset + 1, to: Math.min(offset + limit, totalCount), total: totalCount })}
					</p>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={offset === 0}
							onClick={() => onOffsetChange(Math.max(0, offset - limit))}
							data-testid="routing-rules-pagination-prev-btn"
						>
							<ChevronLeft className="mr-1 h-4 w-4" />
							{t("workspace.routingRules.previous")}
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={offset + limit >= totalCount}
							onClick={() => onOffsetChange(offset + limit)}
							data-testid="routing-rules-pagination-next-btn"
						>
							{t("workspace.routingRules.next")}
							<ChevronRight className="ml-1 h-4 w-4" />
						</Button>
					</div>
				</div>
			)}

			<AlertDialog open={!!deleteRuleId} onOpenChange={(open) => !open && setDeleteRuleId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("workspace.routingRules.deleteTitle")}</AlertDialogTitle>
						<AlertDialogDescription>
							{t("workspace.routingRules.deleteDescription", { name: ruleToDelete?.name })}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>{t("common.cancel")}</AlertDialogCancel>
						<AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
							{isDeleting ? t("workspace.routingRules.deleting") : t("common.delete")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function TargetsSummary({ targets }: { targets: RoutingTarget[] }) {
	const { t } = useTranslation();
	if (!targets || targets.length === 0) {
		return <span className="text-muted-foreground text-sm">{t("workspace.routingRules.notAvailable")}</span>;
	}

	const first = targets[0];
	const label = [first.provider ? getProviderLabel(first.provider) : t("workspace.routingRules.any"), first.model || t("workspace.routingRules.anyModel")].join(" / ");

	return (
		<div className="flex flex-col gap-1">
			<div className="flex items-center gap-1.5">
				{first.provider && <RenderProviderIcon provider={first.provider as ProviderIconType} size="sm" className="h-4 w-4 shrink-0" />}
				<span className="max-w-[160px] truncate text-sm">{label}</span>
			</div>
			{targets.length > 1 && (
				<span className="text-muted-foreground text-xs">
					{t("workspace.routingRules.moreTargets", { count: targets.length - 1 })}
				</span>
			)}
		</div>
	);
}
