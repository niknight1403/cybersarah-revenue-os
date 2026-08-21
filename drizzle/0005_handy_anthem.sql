ALTER TABLE `growth_loop_settings` ADD `analyticsWriteKey` varchar(64);--> statement-breakpoint
ALTER TABLE `revenue_daily_metrics` ADD `cacCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `revenue_daily_metrics` ADD `estimatedLtvCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `growth_loop_settings` ADD CONSTRAINT `growth_loop_settings_analyticsWriteKey_unique` UNIQUE(`analyticsWriteKey`);