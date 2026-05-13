import { createFileRoute } from "@tanstack/react-router";
import { NoPermissionView } from "@/components/noPermissionView";
import { RbacOperation, RbacResource, useRbac } from "@enterprise/lib";
import { useTranslation } from "react-i18next";
import MCPToolGroupsPage from "./page";

function RouteComponent() {
	const { t } = useTranslation();
	const hasMCPGatewayAccess = useRbac(RbacResource.MCPGateway, RbacOperation.View);
	if (!hasMCPGatewayAccess) {
		return <NoPermissionView entity={t("sidebar.sub.toolGroups")} />;
	}
	return <MCPToolGroupsPage />;
}

export const Route = createFileRoute("/workspace/mcp-tool-groups")({
	component: RouteComponent,
});
