CREATE TABLE `loop_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`loopId` varchar(64) NOT NULL,
	`snapshotDate` varchar(10) NOT NULL,
	`mode` enum('manual_approval','semi_autopilot_internal') NOT NULL DEFAULT 'manual_approval',
	`conversionRate` decimal(8,6),
	`revenueCents` int,
	`signals` json NOT NULL,
	`approvalRequired` boolean NOT NULL DEFAULT true,
	`externalExecution` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loop_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `loop_snapshots_workspace_loop_date_idx` UNIQUE(`workspaceId`,`loopId`,`snapshotDate`)
);
--> statement-breakpoint
CREATE INDEX `loop_snapshots_workspace_date_idx` ON `loop_snapshots` (`workspaceId`,`snapshotDate`);