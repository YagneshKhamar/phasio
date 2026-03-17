-- DropForeignKey
ALTER TABLE `evalresult`
DROP FOREIGN KEY `EvalResult_evalRunId_fkey`;

-- DropForeignKey
ALTER TABLE `evalresult`
DROP FOREIGN KEY `EvalResult_testCaseId_fkey`;

-- DropForeignKey
ALTER TABLE `evalrun`
DROP FOREIGN KEY `EvalRun_promptVersionId_fkey`;

-- DropForeignKey
ALTER TABLE `project`
DROP FOREIGN KEY `Project_userId_fkey`;

-- DropForeignKey
ALTER TABLE `prompt`
DROP FOREIGN KEY `Prompt_projectId_fkey`;

-- DropForeignKey
ALTER TABLE `promptversion`
DROP FOREIGN KEY `PromptVersion_promptId_fkey`;

-- DropForeignKey
ALTER TABLE `testcase`
DROP FOREIGN KEY `TestCase_suiteId_fkey`;

-- DropForeignKey
ALTER TABLE `testsuite`
DROP FOREIGN KEY `TestSuite_promptId_fkey`;

-- DropIndex
DROP INDEX `EvalResult_evalRunId_fkey` ON `evalresult`;

-- DropIndex
DROP INDEX `EvalResult_testCaseId_fkey` ON `evalresult`;

-- DropIndex
DROP INDEX `EvalRun_promptVersionId_fkey` ON `evalrun`;

-- DropIndex
DROP INDEX `Project_userId_fkey` ON `project`;

-- DropIndex
DROP INDEX `Prompt_projectId_fkey` ON `prompt`;

-- DropIndex
DROP INDEX `PromptVersion_promptId_fkey` ON `promptversion`;

-- DropIndex
DROP INDEX `TestCase_suiteId_fkey` ON `testcase`;

-- DropIndex
DROP INDEX `TestSuite_promptId_fkey` ON `testsuite`;

-- AlterTable
ALTER TABLE `evalresult` MODIFY `output` TEXT  NOT NULL,
    MODIFY `reason` TEXT  NULL;

-- AlterTable
ALTER TABLE `promptversion` MODIFY `template` TEXT  NOT NULL;

-- AlterTable
ALTER TABLE `testcase` MODIFY `input` TEXT  NOT NULL,
    MODIFY `checkValue` TEXT  NOT NULL;

-- AddForeignKey
ALTER TABLE `Project`
ADD CONSTRAINT `Project_userId_fkey` FOREIGN KEY
(`userId`) REFERENCES `User`
(`id`) ON
DELETE CASCADE ON
UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Prompt`
ADD CONSTRAINT `Prompt_projectId_fkey` FOREIGN KEY
(`projectId`) REFERENCES `Project`
(`id`) ON
DELETE CASCADE ON
UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PromptVersion`
ADD CONSTRAINT `PromptVersion_promptId_fkey` FOREIGN KEY
(`promptId`) REFERENCES `Prompt`
(`id`) ON
DELETE CASCADE ON
UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TestSuite`
ADD CONSTRAINT `TestSuite_promptId_fkey` FOREIGN KEY
(`promptId`) REFERENCES `Prompt`
(`id`) ON
DELETE CASCADE ON
UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TestCase`
ADD CONSTRAINT `TestCase_suiteId_fkey` FOREIGN KEY
(`suiteId`) REFERENCES `TestSuite`
(`id`) ON
DELETE CASCADE ON
UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EvalRun`
ADD CONSTRAINT `EvalRun_promptVersionId_fkey` FOREIGN KEY
(`promptVersionId`) REFERENCES `PromptVersion`
(`id`) ON
DELETE CASCADE ON
UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EvalResult`
ADD CONSTRAINT `EvalResult_evalRunId_fkey` FOREIGN KEY
(`evalRunId`) REFERENCES `EvalRun`
(`id`) ON
DELETE CASCADE ON
UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EvalResult`
ADD CONSTRAINT `EvalResult_testCaseId_fkey` FOREIGN KEY
(`testCaseId`) REFERENCES `TestCase`
(`id`) ON
DELETE CASCADE ON
UPDATE CASCADE;
