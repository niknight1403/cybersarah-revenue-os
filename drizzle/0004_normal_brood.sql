CREATE TABLE `growth_audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`idempotencyKey` varchar(190) NOT NULL,
	`actor` enum('user','system','cron','webhook') NOT NULL,
	`eventType` varchar(140) NOT NULL,
	`status` enum('accepted','skipped','completed','failed') NOT NULL,
	`detail` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `growth_audit_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `growth_audit_events_idempotency_idx` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE `growth_experiments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`experimentType` enum('landing_page','headline','cta','pricing') NOT NULL,
	`name` varchar(180) NOT NULL,
	`status` enum('draft','needs_approval','active','paused','completed') NOT NULL DEFAULT 'draft',
	`variants` json NOT NULL,
	`maxTrafficPercent` int NOT NULL DEFAULT 0,
	`requiresApproval` boolean NOT NULL DEFAULT true,
	`approvedByUserId` int,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `growth_experiments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `growth_loop_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	`cadenceCron` varchar(64) NOT NULL DEFAULT '0 0 7 * * *',
	`scheduleCronTaskUid` varchar(65),
	`lastRunAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `growth_loop_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `growth_loop_settings_workspace_idx` UNIQUE(`workspaceId`)
);
--> statement-breakpoint
CREATE TABLE `retention_cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`revenueEventId` int NOT NULL,
	`caseType` enum('dunning','retention','upsell') NOT NULL,
	`status` enum('draft','needs_approval','approved','closed') NOT NULL DEFAULT 'draft',
	`subjectRef` varchar(180),
	`recommendedAction` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `retention_cases_id` PRIMARY KEY(`id`),
	CONSTRAINT `retention_cases_event_type_idx` UNIQUE(`revenueEventId`,`caseType`)
);
--> statement-breakpoint
CREATE TABLE `revenue_daily_metrics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`metricDate` varchar(10) NOT NULL,
	`revenueCents` int NOT NULL DEFAULT 0,
	`mrrCents` int NOT NULL DEFAULT 0,
	`checkoutStarted` int NOT NULL DEFAULT 0,
	`checkoutCompleted` int NOT NULL DEFAULT 0,
	`paymentFailures` int NOT NULL DEFAULT 0,
	`cancellations` int NOT NULL DEFAULT 0,
	`activeSubscriptions` int NOT NULL DEFAULT 0,
	`marketingSpendCents` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `revenue_daily_metrics_id` PRIMARY KEY(`id`),
	CONSTRAINT `revenue_daily_metrics_workspace_date_idx` UNIQUE(`workspaceId`,`metricDate`)
);
--> statement-breakpoint
CREATE TABLE `revenue_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`source` enum('stripe','system') NOT NULL,
	`externalEventId` varchar(180) NOT NULL,
	`eventType` varchar(140) NOT NULL,
	`subjectRef` varchar(180),
	`amountCents` int NOT NULL DEFAULT 0,
	`currency` varchar(8) NOT NULL DEFAULT 'EUR',
	`occurredAt` timestamp NOT NULL,
	`metadata` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `revenue_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `revenue_events_source_external_idx` UNIQUE(`source`,`externalEventId`)
);
--> statement-breakpoint
CREATE INDEX `growth_audit_events_workspace_time_idx` ON `growth_audit_events` (`workspaceId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `growth_experiments_workspace_status_idx` ON `growth_experiments` (`workspaceId`,`status`);--> statement-breakpoint
CREATE INDEX `growth_loop_settings_task_uid_idx` ON `growth_loop_settings` (`scheduleCronTaskUid`);--> statement-breakpoint
CREATE INDEX `retention_cases_workspace_status_idx` ON `retention_cases` (`workspaceId`,`status`);--> statement-breakpoint
CREATE INDEX `revenue_events_workspace_time_idx` ON `revenue_events` (`workspaceId`,`occurredAt`);--> statement-breakpoint
CREATE INDEX `revenue_events_workspace_type_idx` ON `revenue_events` (`workspaceId`,`eventType`);