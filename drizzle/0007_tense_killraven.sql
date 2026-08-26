ALTER TABLE `users` ADD `is21Verified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `verificationMethod` enum('id_check','credit_card','third_party_kyc');--> statement-breakpoint
ALTER TABLE `users` ADD `verificationTimestamp` timestamp;