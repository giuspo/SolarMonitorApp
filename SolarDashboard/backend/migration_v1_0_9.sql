-- Migrazione D1 per aggiunta colonne telemetria carico (pwm, load_cut), umidità (h_box) e versione firmware (fw_ver)
ALTER TABLE solar_records ADD COLUMN h_box REAL;
ALTER TABLE solar_records ADD COLUMN fw_ver TEXT;
ALTER TABLE solar_records ADD COLUMN load_pwm REAL DEFAULT 0;
ALTER TABLE solar_records ADD COLUMN is_load_cut BOOLEAN DEFAULT 0;

ALTER TABLE daily_summaries ADD COLUMN h_box_max REAL;
ALTER TABLE daily_summaries ADD COLUMN avg_load_pwm REAL DEFAULT 0;
ALTER TABLE daily_summaries ADD COLUMN load_cut_count INTEGER DEFAULT 0;
