-- AlterTable
ALTER TABLE `evalresult` MODIFY `output` TEXT NOT NULL,
    MODIFY `reason` TEXT NULL;

-- AlterTable
ALTER TABLE `promptversion` MODIFY `template` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `testcase` MODIFY `input` TEXT NOT NULL,
    MODIFY `checkValue` TEXT NOT NULL;
