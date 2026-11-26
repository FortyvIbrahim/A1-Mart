START TRANSACTION;

-- SQL Query to create circles table
CREATE TABLE stock_circles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    department_id INT NOT NULL,
    category_id INT NULL,
    subcategory_id INT NULL,
    period_type ENUM('yearly', 'biyearly', 'quarterly', 'monthly', 'daily') NOT NULL,
    period VARCHAR(255) NULL COMMENT 'Used for yearly, biyearly, quarterly periods (e.g., "2025-2026", "01 Jul 2025 - 31 Dec 2025")',
    period_start_date DATE NULL COMMENT 'Used for daily and monthly periods',
    period_end_date DATE NULL COMMENT 'Used for daily and monthly periods',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Foreign key constraints (adjust table names as per your schema)
    FOREIGN KEY (department_id) REFERENCES products_department(department_id) ON DELETE RESTRICT,
    FOREIGN KEY (category_id) REFERENCES products_categories(category_id) ON DELETE SET NULL,
    FOREIGN KEY (subcategory_id) REFERENCES products_subcategories(subcategory_id) ON DELETE SET NULL,
    
    -- Indexes for better query performance
    INDEX idx_department_id (department_id),
    INDEX idx_category_id (category_id),
    INDEX idx_subcategory_id (subcategory_id),
    INDEX idx_period_type (period_type),
    INDEX idx_period_start_date (period_start_date),
    INDEX idx_period_end_date (period_end_date),
    
    -- Check constraint to ensure date range is valid when both dates are provided
    CONSTRAINT chk_date_range CHECK (
        (period_start_date IS NULL AND period_end_date IS NULL) OR
        (period_start_date IS NOT NULL AND period_end_date IS NOT NULL AND period_end_date >= period_start_date)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

COMMIT;