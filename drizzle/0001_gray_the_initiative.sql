CREATE TABLE `buildings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cityId` int NOT NULL,
	`type` varchar(64) NOT NULL,
	`goldPerTurn` int NOT NULL DEFAULT 0,
	`foodPerTurn` int NOT NULL DEFAULT 0,
	`productionPerTurn` int NOT NULL DEFAULT 0,
	`sciencePerTurn` int NOT NULL DEFAULT 0,
	`culturePerTurn` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `buildings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`civilizationId` int NOT NULL,
	`gameId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`x` int NOT NULL,
	`y` int NOT NULL,
	`population` int NOT NULL DEFAULT 1,
	`maxPopulation` int NOT NULL DEFAULT 10,
	`productionQueue` json NOT NULL DEFAULT ('[]'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `civilizations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`gameId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`leader` varchar(128) NOT NULL,
	`color` varchar(7) NOT NULL,
	`gold` int NOT NULL DEFAULT 100,
	`food` int NOT NULL DEFAULT 50,
	`production` int NOT NULL DEFAULT 30,
	`science` int NOT NULL DEFAULT 20,
	`culture` int NOT NULL DEFAULT 20,
	`happiness` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `civilizations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `diplomacy` (
	`id` int AUTO_INCREMENT NOT NULL,
	`civ1Id` int NOT NULL,
	`civ2Id` int NOT NULL,
	`gameId` int NOT NULL,
	`relationship` enum('allied','friendly','neutral','hostile','at_war') NOT NULL DEFAULT 'neutral',
	`tradingAgreement` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `diplomacy_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gameStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`gameId` int NOT NULL,
	`civilizationId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`currentRound` int NOT NULL DEFAULT 1,
	`score` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gameStates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `games` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`currentRound` int NOT NULL DEFAULT 1,
	`maxRounds` int NOT NULL DEFAULT 500,
	`status` enum('active','paused','finished') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `games_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leaderboard` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`score` int NOT NULL DEFAULT 0,
	`wins` int NOT NULL DEFAULT 0,
	`losses` int NOT NULL DEFAULT 0,
	`totalGames` int NOT NULL DEFAULT 0,
	`averageRounds` decimal(5,2) DEFAULT '0',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leaderboard_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `technologies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`scienceCost` int NOT NULL,
	`era` varchar(64) NOT NULL,
	`description` text,
	`prerequisites` json NOT NULL DEFAULT ('[]'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `technologies_id` PRIMARY KEY(`id`),
	CONSTRAINT `technologies_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `technologyProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`civilizationId` int NOT NULL,
	`technologyId` int NOT NULL,
	`progress` int NOT NULL DEFAULT 0,
	`status` enum('researching','completed','available') NOT NULL DEFAULT 'available',
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `technologyProgress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `units` (
	`id` int AUTO_INCREMENT NOT NULL,
	`civilizationId` int NOT NULL,
	`gameId` int NOT NULL,
	`type` varchar(64) NOT NULL,
	`x` int NOT NULL,
	`y` int NOT NULL,
	`health` int NOT NULL DEFAULT 100,
	`maxHealth` int NOT NULL DEFAULT 100,
	`experience` int NOT NULL DEFAULT 0,
	`status` enum('active','fortified','healing') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `units_id` PRIMARY KEY(`id`)
);
