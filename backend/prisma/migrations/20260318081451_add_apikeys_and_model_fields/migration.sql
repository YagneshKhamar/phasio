-- AlterTable
ALTER TABLE `evalrun` ADD COLUMN `model` VARCHAR(191) NOT NULL DEFAULT 'gpt-4o-mini',
    ADD COLUMN `provider` VARCHAR(191) NOT NULL DEFAULT 'openai',
    ADD COLUMN `source` VARCHAR(191) NOT NULL DEFAULT 'web';

-- AlterTable
ALTER TABLE `user` ADD COLUMN `anthropicModel` VARCHAR(191) NOT NULL DEFAULT 'claude-haiku-4-5-20251001',
    ADD COLUMN `openaiModel` VARCHAR(191) NOT NULL DEFAULT 'gpt-4o-mini';

-- CreateTable
CREATE TABLE `ApiKey` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `keyHash` VARCHAR(191) NOT NULL,
    `keyPrefix` VARCHAR(191) NOT NULL,
    `usageCount` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastUsedAt` DATETIME(3) NULL,

    UNIQUE INDEX `ApiKey_keyHash_key`(`keyHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ApiKey` ADD CONSTRAINT `ApiKey_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
