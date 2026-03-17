-- CreateTable
CREATE TABLE `EvalComparison` (
    `id` VARCHAR(191) NOT NULL,
    `promptId` VARCHAR(191) NOT NULL,
    `suiteId` VARCHAR(191) NOT NULL,
    `runAId` VARCHAR(191) NOT NULL,
    `runBId` VARCHAR(191) NOT NULL,
    `winner` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EvalComparison_runAId_key`(`runAId`),
    UNIQUE INDEX `EvalComparison_runBId_key`(`runBId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EvalComparison` ADD CONSTRAINT `EvalComparison_promptId_fkey` FOREIGN KEY (`promptId`) REFERENCES `Prompt`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EvalComparison` ADD CONSTRAINT `EvalComparison_runAId_fkey` FOREIGN KEY (`runAId`) REFERENCES `EvalRun`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EvalComparison` ADD CONSTRAINT `EvalComparison_runBId_fkey` FOREIGN KEY (`runBId`) REFERENCES `EvalRun`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
