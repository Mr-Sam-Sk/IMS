# Fieldwork Operations

Fieldwork is a browser-based inventory and workforce operations dashboard for a small materials business. It tracks stock, purchasing and sales movements, orders, daily attendance, and estimated payroll.

## Access Setup

On first launch, create the administrator account. The administrator can create business workspaces from **Business accounts**; each business receives a generated temporary password shown once after creation. Business users sign in with the username and password, can edit their profile, and can sign out from the top bar. Each business has a separate inventory/workforce data key in this browser.

This is a local demo, not production authentication. Account records and business data live in browser local storage, so they are not shared across devices and can be changed by anyone with access to the browser profile. Passwords are salted and hashed in the browser, but this does not replace server-side authentication, authorization, audit logging, or a shared database. Do not use real passwords or sensitive business data here.

## Start

Install Node.js 20 or newer, then run from this project directory:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production build, run `npm run build`; `npm run preview` serves that build locally.

## Workflows

- Add and edit materials, set reorder points, search and filter the catalog, and remove obsolete records.
- Record a sale or purchase. Sales reduce stock and are blocked when the requested quantity exceeds available stock; purchases increase stock.
- Review completed and pending orders in one register.
- Mark team members present or absent. Attendance changes update the current payroll estimate.
- Calculate take-home estimates as monthly base salary minus absence deductions (base salary divided by 26 times absent days) and fixed deductions.
- Print the payroll summary from the Payroll view.
- Show all amounts in Indian rupees (INR).

Records are stored in this browser's local storage. This prototype has no shared database, accounting integrations, tax tables, or automatic backups. Validate local payroll policy and tax rules before using estimates to issue payment. Existing sample numeric values are interpreted as INR; no exchange-rate conversion is applied.
