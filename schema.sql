-- ============================================================
-- RURAL AREA PROBLEMS PORTAL — MySQL Schema
-- Three-Tier Architecture | RDS MySQL 8.0
-- ============================================================

CREATE DATABASE IF NOT EXISTS rural_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rural_portal;

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  email       VARCHAR(150)  NOT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,
  phone       VARCHAR(15)   DEFAULT NULL,
  state       VARCHAR(100)  NOT NULL,
  district    VARCHAR(100)  NOT NULL,
  village     VARCHAR(150)  NOT NULL,
  role        ENUM('user','admin') NOT NULL DEFAULT 'user',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email    (email),
  INDEX idx_users_role     (role),
  INDEX idx_users_state    (state),
  INDEX idx_users_district (district)
) ENGINE=InnoDB;

-- ── Categories ────────────────────────────────────────────────────────────────
CREATE TABLE categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  icon        VARCHAR(50)  NOT NULL DEFAULT 'alert-circle',
  color       VARCHAR(20)  NOT NULL DEFAULT '#4CAF50',
  description TEXT         DEFAULT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO categories (name, icon, color, description) VALUES
  ('Water Supply',       'droplets',    '#2196F3', 'Drinking water, irrigation, drainage issues'),
  ('Roads & Transport',  'road',        '#FF9800', 'Potholes, damaged roads, lack of connectivity'),
  ('Electricity',        'zap',         '#FFC107', 'Power outages, transformer faults, street lighting'),
  ('Healthcare',         'heart-pulse', '#F44336', 'Hospital access, medicine availability, sanitation'),
  ('Education',          'book-open',   '#9C27B0', 'School infrastructure, teacher shortage'),
  ('Agriculture',        'wheat',       '#4CAF50', 'Crop damage, irrigation, soil, fertilizer supply'),
  ('Sanitation',         'trash-2',     '#795548', 'Open defecation, waste disposal, drainage clogging'),
  ('Connectivity',       'signal',      '#607D8B', 'Mobile network, internet, broadband issues'),
  ('Public Safety',      'shield-alert','#E91E63', 'Crime, animal attacks, disaster preparedness'),
  ('Govt Schemes',       'landmark',    '#00BCD4', 'Scheme not reaching beneficiaries, corruption');

-- ── Problems ──────────────────────────────────────────────────────────────────
CREATE TABLE problems (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NOT NULL,
  category_id     INT UNSIGNED NOT NULL,
  title           VARCHAR(255) NOT NULL,
  description     TEXT         NOT NULL,
  ai_summary      TEXT         DEFAULT NULL,
  ai_tags         VARCHAR(500) DEFAULT NULL,
  state           VARCHAR(100) NOT NULL,
  district        VARCHAR(100) NOT NULL,
  village         VARCHAR(150) NOT NULL,
  pincode         VARCHAR(10)  DEFAULT NULL,
  latitude        DECIMAL(10,8) DEFAULT NULL,
  longitude       DECIMAL(11,8) DEFAULT NULL,
  status          ENUM('pending','in_review','in_progress','resolved','rejected') NOT NULL DEFAULT 'pending',
  priority        ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  upvotes         INT UNSIGNED NOT NULL DEFAULT 0,
  views           INT UNSIGNED NOT NULL DEFAULT 0,
  admin_notes     TEXT         DEFAULT NULL,
  resolved_at     TIMESTAMP    DEFAULT NULL,
  created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_problems_user     FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
  CONSTRAINT fk_problems_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  INDEX idx_problems_user     (user_id),
  INDEX idx_problems_category (category_id),
  INDEX idx_problems_status   (status),
  INDEX idx_problems_state    (state),
  INDEX idx_problems_district (district),
  INDEX idx_problems_created  (created_at DESC),
  FULLTEXT idx_problems_search (title, description)
) ENGINE=InnoDB;

-- ── Problem Photos ────────────────────────────────────────────────────────────
CREATE TABLE problem_photos (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  problem_id  INT UNSIGNED NOT NULL,
  filename    VARCHAR(255) NOT NULL,
  s3_key      VARCHAR(512) NOT NULL,
  s3_url      VARCHAR(1024) NOT NULL,
  size_bytes  INT UNSIGNED DEFAULT NULL,
  mime_type   VARCHAR(50)  DEFAULT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_photos_problem FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
  INDEX idx_photos_problem (problem_id)
) ENGINE=InnoDB;

-- ── Upvotes ───────────────────────────────────────────────────────────────────
CREATE TABLE upvotes (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  problem_id  INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_upvote (problem_id, user_id),
  CONSTRAINT fk_upvotes_problem FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
  CONSTRAINT fk_upvotes_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── Comments ──────────────────────────────────────────────────────────────────
CREATE TABLE comments (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  problem_id  INT UNSIGNED NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  content     TEXT         NOT NULL,
  is_official BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_comments_problem FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  INDEX idx_comments_problem (problem_id)
) ENGINE=InnoDB;

-- ── Status History ────────────────────────────────────────────────────────────
CREATE TABLE status_history (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  problem_id   INT UNSIGNED NOT NULL,
  changed_by   INT UNSIGNED NOT NULL,
  old_status   ENUM('pending','in_review','in_progress','resolved','rejected') DEFAULT NULL,
  new_status   ENUM('pending','in_review','in_progress','resolved','rejected') NOT NULL,
  old_priority ENUM('low','medium','high','critical') DEFAULT NULL,
  new_priority ENUM('low','medium','high','critical') DEFAULT NULL,
  notes        TEXT DEFAULT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_history_problem FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
  CONSTRAINT fk_history_changer FOREIGN KEY (changed_by) REFERENCES users(id)    ON DELETE CASCADE,
  INDEX idx_history_problem (problem_id)
) ENGINE=InnoDB;

-- ── Notifications ─────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     INT UNSIGNED NOT NULL,
  problem_id  INT UNSIGNED DEFAULT NULL,
  type        ENUM('status_change','comment','upvote','admin_note','system') NOT NULL,
  title       VARCHAR(255) NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_notif_problem FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE SET NULL,
  INDEX idx_notif_user   (user_id),
  INDEX idx_notif_unread (user_id, is_read)
) ENGINE=InnoDB;

-- ── Default Admin (password: Admin@1234) ──────────────────────────────────────
INSERT INTO users (name, email, password, phone, state, district, village, role)
VALUES (
  'Portal Admin',
  'admin@ruralportal.in',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TsG/8wHKr2uFB0u/TpAKYrn6JjNm',
  '+910000000000',
  'Delhi', 'New Delhi', 'Admin Office',
  'admin'
);

-- ── Analytics Views ───────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT
  (SELECT COUNT(*)  FROM problems)                                    AS total_problems,
  (SELECT COUNT(*)  FROM problems WHERE status = 'pending')           AS pending,
  (SELECT COUNT(*)  FROM problems WHERE status = 'in_progress')       AS in_progress,
  (SELECT COUNT(*)  FROM problems WHERE status = 'resolved')          AS resolved,
  (SELECT COUNT(*)  FROM users    WHERE role   = 'user')              AS total_users,
  (SELECT COUNT(*)  FROM problems WHERE DATE(created_at) = CURDATE()) AS today_reports;
