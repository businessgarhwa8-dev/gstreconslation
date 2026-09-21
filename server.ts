import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Supabase REST client configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kqftiejneuipwjncwtzi.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_9p0wrxWsCruyEBNnWuUEMA_iGaU-vIa';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database Health & Status Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    supabaseUrl: SUPABASE_URL,
    configured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
    timestamp: new Date().toISOString(),
  });
});

// SQL DDL Schema creation query for Supabase PostgreSQL
const SCHEMA_SQL = `
-- Clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id TEXT PRIMARY KEY,
  file_no TEXT,
  company_name TEXT NOT NULL,
  trade_name TEXT,
  gstin TEXT,
  financial_year TEXT,
  contact_person TEXT,
  phone_number TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Company Settings table
CREATE TABLE IF NOT EXISTS public.company_settings (
  client_id TEXT PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  company_name TEXT,
  gstin TEXT,
  financial_year TEXT,
  file_no TEXT,
  selected_month TEXT,
  invoice_matching_tolerance NUMERIC,
  tax_difference_tolerance NUMERIC,
  decimal_precision NUMERIC,
  report_date TEXT,
  pdf_file_name TEXT,
  import_mode TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Purchases table
CREATE TABLE IF NOT EXISTS public.purchases (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES public.clients(id) ON DELETE CASCADE,
  financial_year TEXT,
  sr INTEGER,
  status TEXT,
  party TEXT,
  gstin TEXT,
  period TEXT,
  invoice_no TEXT,
  pos TEXT,
  invoice_date TEXT,
  invoice_value NUMERIC,
  taxable_value NUMERIC,
  rate NUMERIC,
  tax NUMERIC,
  igst NUMERIC,
  cgst NUMERIC,
  sgst NUMERIC,
  cess NUMERIC,
  cfs TEXT,
  rc TEXT,
  remark TEXT,
  gstr_status TEXT,
  gstr_gstin TEXT,
  gstr_invoice_no TEXT,
  gstr_invoice_date TEXT,
  gstr_taxable_value NUMERIC,
  gstr_igst NUMERIC,
  gstr_cgst NUMERIC,
  gstr_sgst NUMERIC,
  gstr_cess NUMERIC,
  gstr_period TEXT,
  gstr_pos TEXT,
  gstr_invoice_value NUMERIC,
  gstr_rate NUMERIC,
  gstr_tax NUMERIC,
  gstr_3b_status TEXT,
  gstr_r1_date TEXT,
  gstr_rc TEXT,
  gstr_remark TEXT,
  diff_invoice_value NUMERIC,
  diff_taxable_value NUMERIC,
  diff_tax NUMERIC,
  diff_remark TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales table
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES public.clients(id) ON DELETE CASCADE,
  financial_year TEXT,
  month TEXT,
  month_index INTEGER,
  taxable_sales NUMERIC,
  exempt_sales NUMERIC,
  total_sales NUMERIC,
  igst NUMERIC,
  cgst NUMERIC,
  sgst NUMERIC,
  cess NUMERIC,
  total_tax NUMERIC,
  tax_rate NUMERIC,
  remark TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ITC table
CREATE TABLE IF NOT EXISTS public.itc (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES public.clients(id) ON DELETE CASCADE,
  financial_year TEXT,
  month TEXT,
  month_index INTEGER,
  exempt_purchase NUMERIC,
  igst NUMERIC,
  cgst NUMERIC,
  sgst NUMERIC,
  cess NUMERIC,
  total_tax NUMERIC,
  opening_itc NUMERIC,
  closing_itc NUMERIC,
  remarks TEXT,
  invoice_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ITC Balances table
CREATE TABLE IF NOT EXISTS public.itc_balances (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES public.clients(id) ON DELETE CASCADE,
  financial_year TEXT,
  head TEXT,
  opening NUMERIC,
  closing NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consolidated 3B table
CREATE TABLE IF NOT EXISTS public.consolidated_3b (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES public.clients(id) ON DELETE CASCADE,
  financial_year TEXT,
  month TEXT,
  month_short TEXT,
  month_index INTEGER,
  outward_nrc NUMERIC,
  outward_rc NUMERIC,
  non_taxable NUMERIC,
  total_outward NUMERIC,
  outward_igst NUMERIC,
  outward_cgst NUMERIC,
  outward_sgst NUMERIC,
  outward_cess NUMERIC,
  cgst_by_cgst NUMERIC,
  sgst_by_sgst NUMERIC,
  igst_by_igst NUMERIC,
  cess_by_cess NUMERIC,
  tax_paid_cash_cgst NUMERIC,
  tax_paid_cash_sgst NUMERIC,
  tax_paid_cash_igst NUMERIC,
  tax_paid_cash_cess NUMERIC,
  inward_nrc NUMERIC,
  itc_eligible_nrc_cgst NUMERIC,
  itc_eligible_nrc_sgst NUMERIC,
  itc_eligible_nrc_igst NUMERIC,
  itc_eligible_nrc_cess NUMERIC,
  itc_ineligible_cgst NUMERIC,
  itc_ineligible_sgst NUMERIC,
  filing_date TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrations for existing tables
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS financial_year TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS financial_year TEXT;
ALTER TABLE public.itc ADD COLUMN IF NOT EXISTS financial_year TEXT;
ALTER TABLE public.itc_balances ADD COLUMN IF NOT EXISTS financial_year TEXT;
ALTER TABLE public.consolidated_3b ADD COLUMN IF NOT EXISTS financial_year TEXT;

`;

// API to run database schema setup
app.post('/api/db/init', async (req, res) => {
  try {
    const dbUrl = process.env.DATABASE_URL;
    let pgExecuted = false;
    let pgError = null;

    if (dbUrl && !dbUrl.includes('[YOUR-PASSWORD]')) {
      try {
        const { Client } = await import('pg');
        const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
        await client.connect();
        await client.query(SCHEMA_SQL);
        await client.end();
        pgExecuted = true;
      } catch (e: any) {
        pgError = e.message;
      }
    }

    res.json({
      success: true,
      message: 'Supabase schema verification step complete.',
      pgExecuted,
      pgError,
      schemaSql: SCHEMA_SQL,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
