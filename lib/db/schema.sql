CREATE TABLE IF NOT EXISTS tcg_sets (
  id VARCHAR(32) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  series VARCHAR(255) NOT NULL DEFAULT '',
  printed_total INT NULL,
  total INT NULL,
  release_date VARCHAR(32) NULL,
  symbol_url VARCHAR(512) NOT NULL DEFAULT '',
  logo_url VARCHAR(512) NOT NULL DEFAULT '',
  sync_token VARCHAR(36) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tcg_cards (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  set_id VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  number VARCHAR(32) NOT NULL,
  rarity VARCHAR(64) NULL,
  types JSON NOT NULL,
  release_date VARCHAR(32) NULL,
  evolution_line_sort INT NOT NULL DEFAULT 999999,
  evolution_depth SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  payload JSON NOT NULL,
  sync_token VARCHAR(36) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tcg_cards_set FOREIGN KEY (set_id) REFERENCES tcg_sets (id) ON DELETE CASCADE,
  INDEX idx_tcg_cards_set_id (set_id),
  INDEX idx_tcg_cards_rarity (rarity),
  INDEX idx_tcg_cards_release_number (release_date, number),
  INDEX idx_tcg_cards_set_evolution (set_id, evolution_line_sort, evolution_depth),
  INDEX idx_tcg_cards_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tcg_catalog_sync (
  id TINYINT NOT NULL PRIMARY KEY DEFAULT 1,
  status ENUM('idle', 'running', 'success', 'failed') NOT NULL DEFAULT 'idle',
  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  card_count INT NULL,
  set_count INT NULL,
  error_message TEXT NULL,
  CONSTRAINT chk_tcg_catalog_sync_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tcg_catalog_sync (id, status)
VALUES (1, 'idle')
ON DUPLICATE KEY UPDATE id = id;
