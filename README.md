# साख (Saakh)

**Turning a shopkeeper's messy khata into a bank-ready credit story.**

Saakh is an AI agent built for the **Build with Gemma: Bengaluru AI Sprint** hackathon (SME & Financial AI track). It reads handwritten khata pages, UPI payment screenshots, and loose invoices — the actual paper trail small shopkeepers already keep — and turns them into a structured P&L statement and a creditworthiness narrative a bank can actually act on.

---

## The Problem

Millions of small shopkeepers in India run profitable businesses with real, provable cash flow — but that proof lives in handwritten ledgers, WhatsApp UPI screenshots, and stacks of paper invoices. Banks can't underwrite what they can't read. So shopkeepers with good businesses get denied credit simply because their records aren't in a bankable format.

## What Saakh Does

1. **Upload** — shopkeeper (or field agent) uploads photos of khata pages, UPI screenshots, and invoices
2. **Understand** — Gemma's multimodal capabilities extract transactions, amounts, dates, and parties directly from the images, no manual data entry
3. **Score** — the extracted data is turned into a creditworthiness score
4. **Forecast** — cash flow trends are projected forward
5. **Export** — a bank-ready P&L statement and narrative report is generated as a PDF
6. **Dashboard & Action Center** — ongoing view of business health, with flagged actions/follow-ups
7. **Copilot** — conversational assistant for querying the business's own financial data

## Features

| Module | File(s) | What it does |
|---|---|---|
| Upload & Understand | `upload-understand.html/js` | Ingests khata/UPI/invoice images and runs multimodal extraction |
| Scoring | `score.html/js` | Computes creditworthiness score from extracted records |
| Forecasting | `forecast.html/js` | Projects future cash flow from historical data |
| Dashboard | `dashboard.html/js` | Central view of business financial health |
| Action Center | `action-center.html/js` | Surfaces flagged issues and follow-up actions |
| Export | `export.html/js`, `export-pdf.js` | Generates the bank-ready PDF report |
| Copilot | `copilot.html/js` | Conversational interface over the shopkeeper's own data |
| Auth | `auth.js` | User authentication |

## Tech Stack

- **Frontend:** HTML, CSS, vanilla JavaScript
- **AI:** Gemma (multimodal document/image understanding) — `gemma.js`
- **Backend/Data:** Supabase — `supabase-config.js`, `tasks_schema.sql`
- **Deployment:** Cloudflare Workers — `wrangler.jsonc`
- **i18n:** `i18n.js` for local-language support

## Getting Started

```bash
git clone https://github.com/tanmaykatiyar0207-cell/Saakh.git
cd Saakh
npm install
```

Set up your Supabase project and Gemma API credentials in `supabase-config.js` and the relevant config, then run the app with your local server / Wrangler setup of choice.

```bash
node build.js
```

## Project Structure

```
Saakh/
├── index.html                 # Landing page
├── upload-understand.html/js  # Document ingestion + Gemma extraction
├── score.html/js              # Creditworthiness scoring
├── forecast.html/js           # Cash flow forecasting
├── dashboard.html/js          # Main dashboard
├── action-center.html/js      # Flagged actions & follow-ups
├── export.html/js
├── export-pdf.js              # PDF report generation
├── copilot.html/js            # Conversational assistant
├── auth.js                    # Authentication
├── gemma.js                   # Gemma model integration
├── supabase-config.js         # Backend/data config
├── tasks_schema.sql           # Database schema
├── i18n.js                    # Localization
├── wrangler.jsonc             # Cloudflare Workers deploy config
└── styles.css
```

## Hackathon

Built for **Build with Gemma: Bengaluru AI Sprint** (July 18, 2026, MSRIT), under the SME & Financial AI theme.

## License

_Add a license before making this public if you intend for others to reuse the code._
