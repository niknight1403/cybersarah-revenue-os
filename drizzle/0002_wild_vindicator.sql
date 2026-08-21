CREATE TABLE `revenue_agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`agentKey` varchar(80) NOT NULL,
	`name` varchar(160) NOT NULL,
	`status` enum('waiting','active','paused','error') NOT NULL DEFAULT 'waiting',
	`enabled` boolean NOT NULL DEFAULT true,
	`lastRunAt` timestamp,
	`lastError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `revenue_agents_id` PRIMARY KEY(`id`),
	CONSTRAINT `revenue_agents_workspace_key_idx` UNIQUE(`workspaceId`,`agentKey`)
);
--> statement-breakpoint
CREATE TABLE `revenue_external_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`actionKey` varchar(120) NOT NULL,
	`actionType` varchar(100) NOT NULL,
	`target` varchar(240) NOT NULL,
	`payload` json NOT NULL,
	`status` enum('draft','needs_approval','approved','rejected','executed','failed') NOT NULL DEFAULT 'draft',
	`requiresApproval` boolean NOT NULL DEFAULT true,
	`requestedAt` timestamp,
	`decidedAt` timestamp,
	`decidedByUserId` int,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `revenue_external_actions_id` PRIMARY KEY(`id`),
	CONSTRAINT `revenue_external_actions_actionKey_unique` UNIQUE(`actionKey`)
);
--> statement-breakpoint
CREATE TABLE `revenue_system_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`source` enum('runtime','manual','integration') NOT NULL,
	`score` int NOT NULL,
	`summary` text NOT NULL,
	`findings` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `revenue_system_audits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `revenue_workspaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`status` enum('setup','active','paused') NOT NULL DEFAULT 'setup',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `revenue_workspaces_id` PRIMARY KEY(`id`),
	CONSTRAINT `revenue_workspaces_user_idx` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `revenue_agents_status_idx` ON `revenue_agents` (`status`);--> statement-breakpoint
CREATE INDEX `revenue_external_actions_workspace_status_idx` ON `revenue_external_actions` (`workspaceId`,`status`);--> statement-breakpoint
CREATE INDEX `revenue_system_audits_workspace_time_idx` ON `revenue_system_audits` (`workspaceId`,`createdAt`);