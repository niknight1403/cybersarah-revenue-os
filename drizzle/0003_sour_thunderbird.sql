CREATE TABLE `revenue_provider_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`provider` enum('stripe') NOT NULL,
	`eventType` enum('approval_requested','activated','suspended','webhook_received','webhook_ignored') NOT NULL,
	`actorUserId` int,
	`detail` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `revenue_provider_audits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `revenue_provider_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`provider` enum('stripe') NOT NULL,
	`status` enum('disabled','approval_requested','active','suspended') NOT NULL DEFAULT 'disabled',
	`requestedAt` timestamp,
	`requestedByUserId` int,
	`approvedAt` timestamp,
	`approvedByUserId` int,
	`lastWebhookAt` timestamp,
	`lastWebhookEventType` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `revenue_provider_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `revenue_provider_configs_workspace_provider_idx` UNIQUE(`workspaceId`,`provider`)
);
--> statement-breakpoint
CREATE INDEX `revenue_provider_audits_workspace_time_idx` ON `revenue_provider_audits` (`workspaceId`,`createdAt`);