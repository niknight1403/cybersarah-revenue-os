CREATE TABLE `growth_experiment_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`experimentId` int NOT NULL,
	`subjectKey` varchar(128) NOT NULL,
	`variantKey` varchar(64) NOT NULL,
	`eventType` enum('impression','cta_click','checkout_start') NOT NULL,
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `growth_experiment_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `growth_experiment_events_subject_event_idx` UNIQUE(`experimentId`,`subjectKey`,`eventType`)
);
--> statement-breakpoint
CREATE INDEX `growth_experiment_events_experiment_variant_idx` ON `growth_experiment_events` (`experimentId`,`variantKey`);--> statement-breakpoint
CREATE INDEX `growth_experiment_events_workspace_time_idx` ON `growth_experiment_events` (`workspaceId`,`occurredAt`);