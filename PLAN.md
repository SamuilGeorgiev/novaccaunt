I'll create a concise product and engineering plan with clear milestones and a TODO list so we can track progress toward a full accounting SaaS with OCR and AI vision.

I'll draft a concise, phased product and engineering plan and immediately update our TODOs to reflect concrete next steps and owners. Then we can start implementing the highest-impact items.

# MiniLam SPA → Full Accounting SaaS (with OCR + AI Vision)

Below is a concise, phased plan aligned with your current stack (JS SPA + Supabase). I also added a prioritized TODO list in our planner.

## Product Vision
- Automate document-to-ledger: capture invoices/receipts/contracts → extract → validate → post.
- One workspace per firm, multi-client support, role-based access and approvals.
- Accurate financials: P&L, Balance Sheet, Cash Flow, AR/AP aging, tax/VAT returns.

## Personas
- Accountants/Bookkeepers: bulk processing, approvals, reconciliation.
- Controllers/Owners: month-end close, dashboards, audit/export.
- Clients: upload docs, pay invoices, view statements.

## Phased Roadmap

- MVP (4–6 weeks)
  - Document Inbox with upload (PDF/JPG/PNG) to Supabase Storage.
  - OCR + extraction for invoices/receipts (vendor, date, total, tax, currency, line items).
  - Vendors + Bills (draft → approved → posted).
  - Core GL: Chart of Accounts (COA), Journals, Trial Balance.
  - P&L and Balance Sheet basic reports.
  - Roles/Permissions, audit log.

- V1 (6–10 weeks after MVP)
  - Email-in + mobile upload.
  - 2/3-way match (PO/GRN/Bill).
  - Bank feeds + reconciliation (CSV import first, then aggregator).
  - AR: Sales invoices + payments + dunning.
  - Tax/VAT handling and reports.
  - Document search, duplicate detection, validation rules.
  - Usage metering + billing.

- V2 (continuous)
  - Advanced AI: auto-coding suggestions, anomaly detection, vendor normalization.
  - Multi-entity consolidation, intercompany.
  - Approvals routing, custom workflows.
  - Integrations (Payroll, Payments, ERP connectors).

## Architecture (Supabase-first)
- Storage: Supabase Storage buckets `documents/` and `exports/`.
- DB: Postgres (Supabase) with RLS + row-level multi-tenant isolation.
- Functions:
  - Edge functions (TypeScript) for:
    - On-upload trigger → queue OCR job.
    - Webhook receiver for OCR provider callbacks.
    - GL posting rules, approvals transitions.
- Queues/Jobs: Supabase + cron or external lightweight queue (e.g., QStash) for retries.
- Frontend: Current SPA under `js/` adding modules for `documents`, `vendors`, `coa`, `journals`, `approvals`, `banking`.

## Data Model (high-level tables)
- companies, clients, users, roles, permissions, audit_logs
- documents(id, company_id, type, storage_path, status, ocr_provider, ocr_job_id, hash, uploaded_by, uploaded_at)
- document_extractions(document_id, payload_json, confidence, validated_by, validated_at)
- vendors(id, company_id, name, tax_id, addresses, default_account_id)
- items(id, company_id, name, sku, default_account_id, tax_code_id)
- bills(id, vendor_id, document_id, currency, dates, totals, status)
- bill_lines(bill_id, item_id/null, description, qty, unit_price, tax_code_id, account_id)
- ar_invoices + ar_invoice_lines
- chart_of_accounts(id, company_id, code, name, type)
- journals(id, company_id, date, memo, source, status)
- journal_lines(journal_id, account_id, debit, credit, entity_refs)
- taxes/tax_codes, payments, bank_accounts, bank_transactions, reconciliations

I can generate SQL for Supabase when you’re ready.

## OCR + AI Vision
- Providers to evaluate: Google Document AI, AWS Textract, Azure Form Recognizer.
- Strategy:
  - Start with a managed provider for reliability.
  - Add light post-processing with rules + regex + vendor profiles.
  - Optional open-source fallback: PaddleOCR/Tesseract for offline or cost control (lower accuracy).
- Pipeline:
  1) Upload to `documents/` → create `documents` record.
  2) Edge function submits to provider → store `ocr_job_id`.
  3) Callback or poll → normalize fields (vendor, totals, tax, currency, line items) → `document_extractions`.
  4) Heuristics/ML for account suggestions and tax codes.
  5) User review in Inbox → approve → post to `journals`.

## Security & Compliance
- Supabase RLS strictly per company_id.
- Field-level encryption for PII/tax IDs.
- Audit logs on all critical writes.
- Backups and export (S3-compatible).
- GDPR/data residency toggle if needed.

## Milestones & KPIs
- MVP shipped: month 1–1.5.
- Throughput: 100 docs/day/user with <2 min avg time-to-post.
- Extraction accuracy: 95% header fields, 85% line-level to start.
- Reconciliation: 90% auto-match rate on bank transactions within 30 days.
- Uptime: 99.9%; P95 OCR round trip < 25s.

## Implementation Plan (repo-aligned)
- New SPA modules:
  - `js/modules/documents.js`: upload, list, preview, status, review UI.
  - `js/modules/vendors.js`: CRUD + vendor normalization.
  - `js/modules/coa.js`: COA setup and account picker.
  - `js/modules/journals.js`: journal viewer/posting.
  - `js/modules/approvals.js`: approval workflows.
  - Extend existing: `invoices.js` → AR; `sales.js` → AR flows; `reports.js` → P&L/BS/Cash Flow.
- Supabase:
  - Storage buckets, DB schema, RLS policies.
  - Edge functions: `ocr-dispatch`, `ocr-callback`, `post-bill`, `bank-import`.

## Immediate Next Steps
- Schema & security
  - Draft SQL for `documents`, `vendors`, `bills`, `coa`, `journals`, `audit_logs`, RLS.
- OCR spike
  - Benchmark 20 sample invoices across 2 providers.
  - Decide provider + cost model; implement `ocr-dispatch` edge function.
- UI
  - Wireframe Document Inbox, Review screen (side-by-side: image + extracted fields).
  - Add left-nav entries and routes.
- Bank feeds (CSV first)
  - CSV parser, create `bank_transactions`, simple matching to `journals`.

If you want, I can:
- Generate the initial Supabase SQL schema.
- Scaffold `js/modules/documents.js` and nav/routes in `index.html`.
- Create edge function templates for OCR pipeline.

## Open Questions
- Target geographies and tax regimes (e.g., EU VAT, UK MTD, BG specifics)?
- Budget/preferences for OCR provider and data residency?
- Need mobile capture now or later?
- Any on-prem or private cloud constraints?

Reply with:
- Countries to support first
- OCR provider preference (or “benchmark 2”)
- Whether to proceed with schema + documents module scaffolding now