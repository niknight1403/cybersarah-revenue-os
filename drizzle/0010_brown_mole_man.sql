CREATE TABLE `accountIdentityLinks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('google') NOT NULL,
	`providerSubject` varchar(191) NOT NULL,
	`providerEmail` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `accountIdentityLinks_id` PRIMARY KEY(`id`),
	CONSTRAINT `accountIdentityLinks_provider_subject_unique` UNIQUE(`provider`,`providerSubject`),
	CONSTRAINT `accountIdentityLinks_user_provider_unique` UNIQUE(`userId`,`provider`)
);
