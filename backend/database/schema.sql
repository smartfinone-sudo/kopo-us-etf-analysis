-- ETF Analysis System Database Schema

-- ETF Holdings Table
CREATE TABLE IF NOT EXISTS etf_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gs_project_id VARCHAR(100),
    gs_table_name VARCHAR(100) DEFAULT 'etf_holdings',
    etf_symbol VARCHAR(10) NOT NULL,
    upload_date BIGINT NOT NULL,
    ticker VARCHAR(20) NOT NULL,
    company_name VARCHAR(255),
    weight DECIMAL(10, 6),
    shares BIGINT,
    market_value BIGINT,
    sector VARCHAR(100),
    snapshot_id VARCHAR(100) NOT NULL,
    created_at BIGINT NOT NULL DEFAULT extract(epoch from now()) * 1000,
    updated_at BIGINT NOT NULL DEFAULT extract(epoch from now()) * 1000,
    deleted BOOLEAN DEFAULT FALSE
);

-- Stock Details Table
CREATE TABLE IF NOT EXISTS stock_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gs_project_id VARCHAR(100),
    gs_table_name VARCHAR(100) DEFAULT 'stock_details',
    ticker VARCHAR(20) NOT NULL UNIQUE,
    company_name VARCHAR(255),
    roe DECIMAL(10, 2),
    eps DECIMAL(10, 2),
    pbr DECIMAL(10, 2),
    bps DECIMAL(10, 2),
    market_cap BIGINT,
    sector VARCHAR(100),
    last_updated BIGINT,
    created_at BIGINT NOT NULL DEFAULT extract(epoch from now()) * 1000,
    updated_at BIGINT NOT NULL DEFAULT extract(epoch from now()) * 1000,
    deleted BOOLEAN DEFAULT FALSE
);

-- Upload History Table
CREATE TABLE IF NOT EXISTS upload_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gs_project_id VARCHAR(100),
    gs_table_name VARCHAR(100) DEFAULT 'upload_history',
    etf_symbol VARCHAR(10) NOT NULL,
    upload_date BIGINT NOT NULL,
    snapshot_id VARCHAR(100) NOT NULL,
    total_holdings INTEGER,
    file_name VARCHAR(255),
    status VARCHAR(50),
    notes TEXT,
    created_at BIGINT NOT NULL DEFAULT extract(epoch from now()) * 1000,
    updated_at BIGINT NOT NULL DEFAULT extract(epoch from now()) * 1000,
    deleted BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_holdings_etf_symbol ON etf_holdings(etf_symbol);
CREATE INDEX IF NOT EXISTS idx_holdings_snapshot_id ON etf_holdings(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_holdings_ticker ON etf_holdings(ticker);
CREATE INDEX IF NOT EXISTS idx_holdings_upload_date ON etf_holdings(upload_date);
CREATE INDEX IF NOT EXISTS idx_holdings_weight ON etf_holdings(weight);
CREATE INDEX IF NOT EXISTS idx_holdings_deleted ON etf_holdings(deleted);

CREATE INDEX IF NOT EXISTS idx_stock_details_ticker ON stock_details(ticker);
CREATE INDEX IF NOT EXISTS idx_stock_details_deleted ON stock_details(deleted);

CREATE INDEX IF NOT EXISTS idx_upload_history_etf_symbol ON upload_history(etf_symbol);
CREATE INDEX IF NOT EXISTS idx_upload_history_snapshot_id ON upload_history(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_upload_history_upload_date ON upload_history(upload_date);
CREATE INDEX IF NOT EXISTS idx_upload_history_deleted ON upload_history(deleted);

-- Comments
COMMENT ON TABLE etf_holdings IS 'ETF portfolio holdings data';
COMMENT ON TABLE stock_details IS 'Stock financial details (ROE, EPS, PBR, BPS)';
COMMENT ON TABLE upload_history IS 'CSV upload history tracking';
