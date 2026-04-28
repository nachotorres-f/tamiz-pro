ALTER TABLE `users`
    ADD COLUMN `pageAccessConfigured` BOOLEAN NOT NULL DEFAULT false;

UPDATE `users`
SET `pageAccessConfigured` = true;
