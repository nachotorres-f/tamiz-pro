CREATE TABLE `user_page_access` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `pageKey` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `user_page_access_userId_pageKey_key`(`userId`, `pageKey`),
    INDEX `user_page_access_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `user_page_access`
    ADD CONSTRAINT `user_page_access_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

INSERT IGNORE INTO `user_page_access` (`userId`, `pageKey`)
SELECT `id`, 'calendario' FROM `users` WHERE `rol` IN ('admin', 'editor', 'consultor');
INSERT IGNORE INTO `user_page_access` (`userId`, `pageKey`)
SELECT `id`, 'planificacion' FROM `users` WHERE `rol` IN ('admin', 'editor', 'consultor');
INSERT IGNORE INTO `user_page_access` (`userId`, `pageKey`)
SELECT `id`, 'produccion' FROM `users` WHERE `rol` IN ('admin', 'editor', 'consultor');
INSERT IGNORE INTO `user_page_access` (`userId`, `pageKey`)
SELECT `id`, 'entregaMP' FROM `users` WHERE `rol` IN ('admin', 'editor', 'consultor');
INSERT IGNORE INTO `user_page_access` (`userId`, `pageKey`)
SELECT `id`, 'expedicion' FROM `users` WHERE `rol` IN ('admin', 'editor', 'consultor');
INSERT IGNORE INTO `user_page_access` (`userId`, `pageKey`)
SELECT `id`, 'picking' FROM `users` WHERE `rol` IN ('admin', 'editor', 'consultor');
INSERT IGNORE INTO `user_page_access` (`userId`, `pageKey`)
SELECT `id`, 'usuarios' FROM `users` WHERE `rol` = 'admin';
