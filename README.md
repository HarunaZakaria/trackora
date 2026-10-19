# Stockora

### Your Business. Under Control.

**Stockora** is a modern small-business operating software designed for building materials stores, automobile spare parts shops, and other inventory-driven retail businesses.

It provides a centralized platform for managing inventory, processing sales, tracking expenses, managing suppliers and customers, monitoring credit transactions, and generating business reports.

Stockora aims to help business owners replace scattered notebooks, manual calculations, and disconnected spreadsheets with a reliable, easy-to-use digital system.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Vision and Objectives](#vision-and-objectives)
3. [Target Users](#target-users)
4. [Core Features](#core-features)
5. [Technology Stack](#technology-stack)
6. [System Architecture](#system-architecture)
7. [Project Structure](#project-structure)
8. [Prerequisites](#prerequisites)
9. [Installation and Setup](#installation-and-setup)
10. [Environment Variables](#environment-variables)
11. [Database Design](#database-design)
12. [Application Modules](#application-modules)
13. [API Design](#api-design)
14. [Authentication and Authorization](#authentication-and-authorization)
15. [Inventory and Stock Management](#inventory-and-stock-management)
16. [Sales and Payment Processing](#sales-and-payment-processing)
17. [Business Intelligence and Reports](#business-intelligence-and-reports)
18. [User Interface and Branding](#user-interface-and-branding)
19. [Validation and Error Handling](#validation-and-error-handling)
20. [Testing](#testing)
21. [Security Considerations](#security-considerations)
22. [Deployment](#deployment)
23. [Development Roadmap](#development-roadmap)
24. [Contribution Guidelines](#contribution-guidelines)
25. [License](#license)

---

## Project Overview

Stockora is a full-stack business management application that helps small and medium-sized retail businesses manage their daily operations from one place.

The system is designed to support businesses with different inventory structures, including:

- Building materials stores selling cement, roofing sheets, iron rods, paint, plumbing supplies, electrical materials, and tools.
- Automobile spare parts stores selling brake pads, oil filters, engine components, batteries, tyres, and accessories.
- General retail businesses that need inventory tracking, sales processing, supplier management, and financial reporting.

Stockora is designed around a configurable business model so that different businesses can use the same platform while maintaining their own products, prices, stock records, customers, suppliers, and transactions.

### Brand Identity

| Brand element    | Value                         |
| ---------------- | ----------------------------- |
| Product name     | Stockora                      |
| Tagline          | Your Business. Under Control. |
| Primary color    | Navy `#12304A`                |
| Accent color     | Emerald `#22C58B`             |
| Background color | `#F5F7FA`                     |
| Surface color    | `#FFFFFF`                     |
| Secondary text   | `#64748B`                     |
| Interface style  | Modern, clean, professional   |
| Theme support    | Light and dark modes          |

---

## Vision and Objectives

The vision of Stockora is to make reliable business management software accessible to everyday shop owners.

The primary objectives are to:

1. Digitize inventory and stock management.
2. Simplify sales and point-of-sale operations.
3. Track business income, expenses, and operating costs.
4. Improve visibility into outstanding customer debts.
5. Organize supplier records and purchasing activities.
6. Reduce stock discrepancies and calculation errors.
7. Provide useful reports for business decision-making.
8. Support both building materials and spare parts inventory.
9. Provide an interface that is easy to learn and use.
10. Establish a scalable foundation for future multi-branch and subscription-based services.

---

## Target Users

### 1. Building Materials Retailers

Stockora should support products measured in units such as:

- Bags
- Pieces
- Lengths
- Rolls
- Sheets
- Boxes
- Litres
- Kilograms
- Bundles
- Cubic metres

### 2. Automobile Spare Parts Retailers

Stockora should support:

- Product codes and SKUs
- Manufacturer part numbers
- Brand and model information
- Vehicle compatibility
- Product variations
- Purchase and selling prices
- Warranty information where applicable

### 3. Business Owners and Managers

Owners and managers should be able to monitor sales, inventory, expenses, staff activity, outstanding balances, and business performance.

### 4. Cashiers and Sales Staff

Authorized employees should be able to process sales, receive payments, search for products, and issue receipts according to their assigned permissions.

---

## Core Features

The following list defines the intended product scope. Individual features should be marked as implemented only after they have been developed and tested.

### 1. Authentication and User Management

- User registration and login.
- Secure password hashing.
- Logout and session/token management.
- Password reset.
- User profile management.
- Business registration and configuration.
- Role-based access control.
- Staff invitations and account management.

### 2. Business Dashboard

The dashboard should provide an overview of business performance, including:

- Today's sales.
- Sales over selected periods.
- Number of products.
- Low-stock products.
- Total inventory value.
- Recorded expenses.
- Outstanding customer balances.
- Supplier balances.
- Recent sales and transactions.
- Sales performance charts.

Dashboard statistics must be calculated from actual business records rather than hardcoded demonstration values.

### 3. Inventory Management

- Create, view, edit, and archive products.
- Assign product categories and brands.
- Generate or assign SKUs.
- Track quantities in stock.
- Configure measurement units.
- Store purchase and selling prices.
- Support multiple prices where appropriate.
- Record stock adjustments.
- Record stock received from suppliers.
- Track stock movements.
- Configure low-stock thresholds.
- Search and filter products.
- Support barcode scanning where available.
- Export inventory records.
- Maintain product-level transaction history.

### 4. Point of Sale (POS)

- Search products by name, SKU, or barcode.
- Add products to a sale.
- Adjust quantities.
- Calculate subtotals and totals.
- Apply authorized discounts.
- Support partial and full payments.
- Record cash, mobile money, card, or other configured payment methods.
- Generate unique receipt numbers.
- Print or download receipts.
- Maintain sales history.
- Process authorized returns and refunds.
- Update stock after a completed sale.

### 5. Supplier Management

- Register suppliers.
- Store contact information.
- Record supplier products.
- Record purchases and deliveries.
- Track supplier invoices.
- Monitor outstanding supplier balances.
- Record payments to suppliers.
- View purchase history.

### 6. Customer Management

- Register customers.
- Store customer contact details.
- View purchase history.
- Record customer payments.
- Support approved credit sales.
- Track outstanding balances.
- Record payment due dates.
- Generate customer account statements.

### 7. Expense Management

- Record daily business expenses.
- Categorize expenses.
- Record expense dates and amounts.
- Add descriptions and references.
- Record payment methods.
- Filter expenses by category or date.
- Generate expense summaries.

### 8. Credit and Debt Management

- Record credit sales.
- Track amounts paid and outstanding.
- Maintain payment histories.
- Record due dates.
- Identify overdue balances.
- Generate customer statements.
- Restrict credit transactions based on permissions.

### 9. Reporting and Analytics

- Daily, weekly, and monthly sales reports.
- Sales by product and category.
- Inventory and stock valuation reports.
- Low-stock reports.
- Purchase reports.
- Expense reports.
- Gross profit estimates.
- Outstanding customer balances.
- Supplier balance reports.
- Payment summaries.
- Exportable reports.

Financial reports must use consistent calculations and account for returns, discounts, cost of goods sold, and other relevant transactions.

### 10. Settings

- Business name and contact details.
- Logo upload.
- Currency configuration.
- Date and number formatting.
- Receipt customization.
- Tax settings where applicable.
- Low-stock notification settings.
- User roles and permissions.
- Theme preferences.
- Business-specific configuration.

---

## Technology Stack

The following is the proposed technology stack for Stockora.

| Layer           | Technology                                            | Purpose                        |
| --------------- | ----------------------------------------------------- | ------------------------------ |
| Frontend        | React                                                 | User interface                 |
| Language        | JavaScript or TypeScript                              | Application logic              |
| Styling         | Tailwind CSS                                          | Responsive styling             |
| Routing         | React Router                                          | Frontend navigation            |
| Backend         | Node.js                                               | Server runtime                 |
| API framework   | Express.js                                            | REST API                       |
| Database        | MongoDB                                               | Persistent application data    |
| Database ODM    | Mongoose                                              | Schema definitions and queries |
| Authentication  | JWT with secure session handling                      | Authentication                 |
| Validation      | Zod, Joi, or an equivalent library                    | Input validation               |
| Charts          | Recharts or an equivalent library                     | Analytics visualizations       |
| Testing         | Vitest, React Testing Library, and Supertest          | Application testing            |
| Version control | Git and GitHub                                        | Source control                 |
| Deployment      | A frontend host and a Node.js-compatible backend host | Production hosting             |

Choose and standardize the exact libraries before implementation. Avoid introducing multiple libraries for the same responsibility without a clear reason.

---

## System Architecture

Stockora follows a client-server architecture.

```text
┌──────────────────────────────┐
│       React Frontend         │
│                              │
│ Dashboard, POS, Inventory    │
│ Customers, Reports, Settings │
└──────────────┬───────────────┘
               │
               │ HTTPS / JSON
               ▼
┌──────────────────────────────┐
│       Express API            │
│                              │
│ Routes and Controllers       │
│ Authentication and RBAC      │
│ Validation and Business Logic│
│ Reporting and Transactions  │
└──────────────┬───────────────┘
               │
               │ Mongoose
               ▼
┌──────────────────────────────┐
│          MongoDB             │
│                              │
│ Businesses, Users, Products  │
│ Sales, Payments, Purchases   │
│ Expenses, Stock Movements    │
└──────────────────────────────┘
```

### Architecture Principles

- Keep frontend and backend responsibilities separate.
- Store persistent business records in the database.
- Validate all incoming requests on the server.
- Apply authorization before accessing business records.
- Keep business logic outside route definitions where practical.
- Use reusable frontend components.
- Maintain consistent API response formats.
- Protect data belonging to one business from access by another.
- Use database transactions where multiple operations must succeed together.
- Keep secrets and credentials outside source control.

---

## Project Structure

A recommended monorepo structure is:

```text
stockora/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── dashboard/
│   │   │   ├── inventory/
│   │   │   ├── sales/
│   │   │   └── layout/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── routes/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── validators/
│   │   ├── utils/
│   │   ├── jobs/
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   ├── .env.example
│   └── package.json
│
├── docs/
│   ├── architecture.md
│   ├── database-schema.md
│   └── api-reference.md
│
├── .gitignore
├── package.json
├── README.md
└── LICENSE
```

This is a recommended structure; adapt filenames and folders to the actual codebase.

---

## Prerequisites

Install the following before starting development:

1. **Node.js:** Use a currently supported LTS release.
2. **npm:** Included with Node.js.
3. **MongoDB:** Use a local installation or a managed MongoDB service.
4. **Git:** For version control.
5. **Code editor:** Visual Studio Code or an equivalent editor.
6. **API testing tool:** Postman, Insomnia, or a similar tool.

Verify the installations:

```bash
node --version
npm --version
git --version
```

If using MongoDB locally, verify that the database service is running before starting the backend.

---

## Installation and Setup

### Step 1: Clone the repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd stockora
```

Replace `<YOUR_REPOSITORY_URL>` with the actual repository URL.

### Step 2: Install frontend dependencies

```bash
cd client
npm install
```

### Step 3: Install backend dependencies

Open a separate terminal:

```bash
cd stockora/server
npm install
```

### Step 4: Configure environment variables

Create a `.env` file inside the `server` directory using the `.env.example` file as a guide.

Configure the frontend environment using `client/.env` if the frontend requires environment variables.

Never commit real `.env` files to Git.

### Step 5: Start MongoDB

If using a local MongoDB installation, start its service using the appropriate command for your operating system.

If using a managed database, obtain the connection string from the database provider.

### Step 6: Start the backend

From the `server` directory:

```bash
npm run dev
```

This assumes a development script has been configured in `server/package.json`.

The API should start on the port specified in the environment configuration.

### Step 7: Start the frontend

From the `client` directory:

```bash
npm run dev
```

This assumes a development script has been configured in `client/package.json`.

Open the local URL printed by the frontend development server.

### Step 8: Verify the application

Confirm that:

- The frontend loads successfully.
- The backend starts without errors.
- The database connection succeeds.
- The API health endpoint responds.
- Authentication works.
- Authorized users can access their own business records.
- Product and sales operations persist to the database.

**Important:** The commands above describe the intended workflow. The actual scripts and ports must match the project's `package.json` files and configuration.

---

## Current Frontend Demo

The current repository contains a Next.js frontend in `client/`; an Express API and MongoDB backend are not present yet. The frontend can be run independently with:

```bash
cd client
npm install
npm run dev
```

The dashboard, point of sale, inventory, purchases, suppliers, customers, expenses, reports, and settings screens use editable sample data saved in the current browser's local storage. The demo supports product and contact forms, inventory search and low-stock filters, purchase receipt and stock updates, customer and supplier balance payments, expense tracking, POS checkout with stock checks, CSV exports, and receipt printing. Use **Settings → Reset browser data** to restore the initial sample records.

This is a frontend-only demo, not production persistence: browser data is not shared between users or devices, and it is not protected by authentication or server-side authorization. Do not use it as the system of record for real business or financial transactions. Connect the screens to a validated, authenticated backend before production use.

---

## Environment Variables

Create `server/.env.example` with the following template:

```dotenv
NODE_ENV=development
PORT=5000

MONGODB_URI=mongodb://127.0.0.1:27017/stockora

CLIENT_URL=http://localhost:5173

JWT_SECRET=replace_with_a_secure_random_secret
JWT_EXPIRES_IN=15m

COOKIE_SECRET=replace_with_a_different_secure_random_secret

LOG_LEVEL=debug
```

If the frontend uses Vite, `client/.env.example` may contain:

```dotenv
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

### Environment variable guidelines

- Generate strong, unique secrets for each environment.
- Never commit production secrets to Git.
- Use secure, HTTP-only cookies for authentication tokens when appropriate.
- Configure cookie settings correctly for your production domain.
- Use a separate database for testing.
- Keep the frontend API URL configurable.
- Never expose backend secrets through frontend environment variables.
- Validate required environment variables when the server starts.

Use a supported authentication design rather than copying the example settings without review.

---

## Database Design

Stockora's database should be designed to preserve accurate inventory, financial records, and business ownership.

### 1. User

Stores individual user accounts.

Suggested fields:

```text
_id
name
email
passwordHash
status
createdAt
updatedAt
```

### 2. Business

Stores information about each registered business.

```text
_id
name
businessType
ownerId
currency
contactDetails
address
settings
createdAt
updatedAt
```

### 3. Membership

Associates users with businesses and defines their roles.

```text
_id
businessId
userId
role
permissions
status
createdAt
updatedAt
```

A membership model supports multiple staff members and future multi-business access.

### 4. Product

Stores inventory information.

```text
_id
businessId
name
sku
barcode
categoryId
brand
description
unit
costPrice
sellingPrice
quantityOnHand
reorderLevel
isActive
createdAt
updatedAt
```

Additional fields can support manufacturer part numbers, vehicle compatibility, product variants, batch tracking, or unit conversions.

### 5. Category

Organizes products.

```text
_id
businessId
name
description
createdAt
updatedAt
```

### 6. Customer

Stores customer details.

```text
_id
businessId
name
phone
email
address
creditLimit
isActive
createdAt
updatedAt
```

### 7. Supplier

Stores supplier information.

```text
_id
businessId
name
phone
email
address
createdAt
updatedAt
```

### 8. Sale

Stores completed or otherwise explicitly tracked sales.

```text
_id
businessId
receiptNumber
customerId
cashierId
items
subtotal
discount
tax
total
amountPaid
balanceDue
status
paymentStatus
createdAt
updatedAt
```

Each sale item should preserve a snapshot of the product description, SKU, quantity, unit price, and relevant cost information at the time of the transaction.

### 9. Payment

Records payments independently of sales.

```text
_id
businessId
saleId
customerId
amount
method
reference
status
receivedBy
paidAt
createdAt
```

Separate payment records make it possible to support partial payments and multiple payments against a single sale.

### 10. Purchase

Tracks stock acquired from suppliers.

```text
_id
businessId
supplierId
invoiceNumber
items
subtotal
discount
tax
total
amountPaid
balanceDue
status
createdAt
updatedAt
```

### 11. Expense

Records business operating expenses.

```text
_id
businessId
category
description
amount
paymentMethod
reference
recordedBy
expenseDate
createdAt
updatedAt
```

### 12. Stock Movement

Maintains an audit trail of inventory changes.

```text
_id
businessId
productId
movementType
quantityChange
quantityBefore
quantityAfter
referenceType
referenceId
reason
performedBy
createdAt
```

Movement types may include purchase receipt, sale, return, damage, loss, correction, and opening balance.

### 13. Audit Log

Records important user actions.

```text
_id
businessId
userId
action
entityType
entityId
metadata
createdAt
```

Sensitive information, including passwords and authentication tokens, must never be stored in audit metadata.

### Database Design Rules

- Every business-owned record must be scoped to a business.
- Store monetary amounts using a consistent precision strategy.
- Validate quantities and prices on the server.
- Create appropriate indexes for frequent queries.
- Use unique indexes for business-scoped SKUs and receipt numbers where required.
- Use database transactions for operations that must update multiple records atomically.
- Preserve historical transaction details.
- Avoid deleting completed financial transactions as an ordinary editing operation.
- Use explicit reversals or adjustment records when correcting historical transactions.

---

## Application Modules

### Dashboard Module

The dashboard summarizes operational and financial activity.

It should provide:

- Sales summaries.
- Inventory statistics.
- Low-stock alerts.
- Recent transactions.
- Expense summaries.
- Customer balances.
- Sales charts.

Dashboard values should respect the current user's business permissions and selected reporting period.

### Inventory Module

The inventory module is responsible for product creation, editing, searching, categorization, and stock movement history.

Product quantities must not be changed arbitrarily through ordinary product editing. Stock-affecting changes should create appropriate movement records.

### Sales Module

The sales module handles checkout, discounts, payment collection, receipts, and transaction history.

The backend must calculate the final total rather than trusting amounts submitted by the frontend.

### Customer Module

The customer module stores contact information, sales history, payment records, and outstanding balances.

### Supplier and Purchasing Module

This module manages suppliers, purchase orders or purchase records, stock receipts, and amounts owed to suppliers.

### Expense Module

The expense module tracks operating costs and supports reporting by date, category, and payment method.

### Reporting Module

The reporting module aggregates sales, inventory, expenses, and payment information to provide business insights.

All reports must use clearly defined calculation rules and date boundaries.

### Settings Module

The settings module manages business details, currency, staff access, receipt preferences, and other business-specific options.

---

## API Design

Stockora should expose a versioned REST API.

Base URL:

```text
/api/v1
```

### Authentication Endpoints

| Method | Endpoint                | Purpose                               |
| ------ | ----------------------- | ------------------------------------- |
| POST   | `/auth/register`        | Register a user or business           |
| POST   | `/auth/login`           | Authenticate a user                   |
| POST   | `/auth/logout`          | End the authenticated session         |
| POST   | `/auth/refresh`         | Refresh authentication when supported |
| POST   | `/auth/forgot-password` | Request a password reset              |
| POST   | `/auth/reset-password`  | Complete a password reset             |
| GET    | `/auth/me`              | Get the current user's profile        |

### Product Endpoints

| Method | Endpoint        | Purpose                                            |
| ------ | --------------- | -------------------------------------------------- |
| GET    | `/products`     | List products                                      |
| GET    | `/products/:id` | Get product details                                |
| POST   | `/products`     | Create a product                                   |
| PATCH  | `/products/:id` | Update permitted product fields                    |
| DELETE | `/products/:id` | Archive a product or perform an authorized removal |

### Sales Endpoints

| Method | Endpoint              | Purpose                     |
| ------ | --------------------- | --------------------------- |
| GET    | `/sales`              | List sales                  |
| GET    | `/sales/:id`          | Get sale details            |
| POST   | `/sales`              | Create and finalize a sale  |
| POST   | `/sales/:id/payments` | Record a payment            |
| POST   | `/sales/:id/returns`  | Record an authorized return |
| GET    | `/sales/:id/receipt`  | Retrieve receipt data       |

### Customer Endpoints

| Method | Endpoint                      | Purpose                    |
| ------ | ----------------------------- | -------------------------- |
| GET    | `/customers`                  | List customers             |
| POST   | `/customers`                  | Create a customer          |
| GET    | `/customers/:id`              | Get customer details       |
| PATCH  | `/customers/:id`              | Update a customer          |
| GET    | `/customers/:id/transactions` | View customer transactions |

### Supplier and Purchase Endpoints

| Method | Endpoint                 | Purpose                  |
| ------ | ------------------------ | ------------------------ |
| GET    | `/suppliers`             | List suppliers           |
| POST   | `/suppliers`             | Create a supplier        |
| GET    | `/purchases`             | List purchases           |
| POST   | `/purchases`             | Create a purchase record |
| POST   | `/purchases/:id/receive` | Record received stock    |

### Expense and Reporting Endpoints

| Method | Endpoint             | Purpose                    |
| ------ | -------------------- | -------------------------- |
| GET    | `/expenses`          | List expenses              |
| POST   | `/expenses`          | Record an expense          |
| GET    | `/reports/sales`     | Retrieve sales reports     |
| GET    | `/reports/inventory` | Retrieve inventory reports |
| GET    | `/reports/expenses`  | Retrieve expense reports   |
| GET    | `/reports/profit`    | Retrieve profit reports    |

These endpoints are a proposed API contract. Implement only endpoints that have corresponding backend logic, validation, authorization, and tests.

### API Response Format

Successful responses should use a consistent structure.

```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Error responses should provide a useful message without exposing stack traces or sensitive internal information.

```json
{
  "success": false,
  "message": "The requested product could not be found",
  "code": "PRODUCT_NOT_FOUND"
}
```

Use pagination for large collections and validate filters, sorting parameters, and identifiers on the server.

---

## Authentication and Authorization

Stockora should use secure authentication and role-based authorization.

### Suggested Roles

**Owner**

- Full access to the business.
- Manage staff and business settings.
- View financial reports.
- Configure products, sales, purchases, and expenses.

**Manager**

- Manage day-to-day operations.
- View authorized reports.
- Manage products, suppliers, customers, and sales.

**Cashier**

- Process sales.
- Search for products.
- Receive permitted payments.
- Print receipts.
- Access only the records needed for assigned duties.

**Inventory Staff**

- View inventory.
- Record authorized stock receipts and adjustments.
- Review stock movement history.

Permissions should be configurable as the application evolves.

### Authorization Requirements

- Verify identity on protected requests.
- Verify business membership on every business-scoped operation.
- Enforce permissions on the backend.
- Do not rely on hidden frontend buttons for security.
- Prevent users from accessing another business's records by changing an identifier in a request.
- Protect sensitive authentication cookies.
- Apply rate limits to authentication endpoints.
- Support account deactivation and session revocation.

---

## Inventory and Stock Management

Inventory accuracy is one of Stockora's most important requirements.

### Stock Calculation

A simplified stock calculation is:

```text
Closing Stock =
Opening Stock
+ Stock Received
+ Valid Stock Returns
- Stock Sold
- Damaged or Lost Stock
+/- Approved Adjustments
```

Every stock-affecting operation must follow the same stock movement rules.

### Stock Management Requirements

1. Validate stock availability before completing a sale.
2. Prevent negative inventory unless the business explicitly enables an appropriate policy.
3. Update stock atomically when finalizing sales.
4. Record every stock movement.
5. Validate returns before restoring stock.
6. Prevent duplicate stock changes when a request is retried.
7. Track stock adjustments with a reason and responsible user.
8. Support different units of measurement.
9. Warn users when stock reaches its configured reorder level.
10. Maintain a clear distinction between available, reserved, and damaged stock if those concepts are implemented.

For building materials, unit conversion may be necessary. For spare parts, manufacturer part numbers and vehicle compatibility may be more important.

---

## Sales and Payment Processing

A sale should follow a controlled transaction workflow.

1. The cashier selects products and quantities.
2. The frontend submits product identifiers and requested quantities.
3. The backend loads current product information.
4. The backend validates prices, discounts, quantities, and permissions.
5. The backend calculates the final total.
6. The backend validates the payment amount and method.
7. The system records the sale, payment, and stock movements.
8. The system generates a unique receipt number.
9. The frontend displays the completed sale and receipt.

Steps that modify the sale, stock, and payment records should be executed atomically wherever possible.

### Payment Statuses

Suggested payment statuses:

- `unpaid`
- `partially_paid`
- `paid`
- `refunded`
- `partially_refunded`

Sale statuses and payment statuses should be modeled separately where necessary.

### Receipt Requirements

A receipt should contain:

- Business name and contact details.
- Receipt number.
- Date and time.
- Cashier information where appropriate.
- Product descriptions.
- Quantities and unit prices.
- Discounts and applicable taxes.
- Total amount.
- Amount paid.
- Outstanding balance where applicable.
- Payment method.
- Return or exchange policy when configured.

Receipts should be printable and readable on standard paper and supported thermal receipt printers.

---

## Business Intelligence and Reports

Stockora should provide useful information without confusing revenue, cash flow, and profit.

### Sales Revenue

Sales revenue should be calculated using a documented policy for discounts, taxes, cancellations, and returns.

### Gross Profit

A simplified formula is:

```text
Gross Profit = Net Sales Revenue - Cost of Goods Sold
```

Cost of goods sold should use a consistent inventory costing method, such as weighted average cost or FIFO, once that method has been selected and implemented.

### Net Profit

A simplified estimate is:

```text
Net Profit = Gross Profit - Operating Expenses
```

A complete accounting implementation may require additional adjustments for taxes, financing costs, depreciation, and other items.

### Outstanding Customer Balances

```text
Outstanding Balance =
Credit Amounts Due - Payments and Credits Applied
```

### Reporting Requirements

- Use consistent date ranges and timezone rules.
- Avoid counting pending or failed transactions as completed sales.
- Include appropriate returns and reversals.
- Apply business-level access controls.
- Clearly label estimates and financial totals.
- Ensure dashboard figures reconcile with detailed transaction records.

---

## User Interface and Branding

Stockora should use a consistent visual design across the dashboard, inventory screens, point of sale, receipts, and website.

### Color Palette

| Token          | Hex       | Usage                                |
| -------------- | --------- | ------------------------------------ |
| Primary        | `#12304A` | Navigation, headings, brand          |
| Accent         | `#22C58B` | Primary actions, positive indicators |
| Background     | `#F5F7FA` | Main application background          |
| Surface        | `#FFFFFF` | Cards, dialogs, tables               |
| Secondary text | `#64748B` | Labels and supporting information    |
| Warning        | `#F59E0B` | Low-stock alerts and warnings        |
| Danger         | `#DC2626` | Errors and critical alerts           |

### Design Principles

- Use Navy for navigation and important structural elements.
- Use Emerald for primary actions and positive states.
- Maintain readable text contrast.
- Use consistent spacing, typography, and border radii.
- Provide clear loading, empty, success, and error states.
- Support responsive layouts for desktops, tablets, and mobile devices.
- Offer light and dark themes.
- Ensure forms provide helpful validation messages.
- Use accessible labels and keyboard navigation.
- Do not rely on color alone to communicate warnings or statuses.

### Main Navigation

The recommended application navigation includes:

- Dashboard
- Sales / POS
- Inventory
- Purchases
- Suppliers
- Customers
- Expenses
- Credit and Payments
- Reports
- Staff and Permissions
- Settings

Navigation items should appear according to user permissions.

---

## Validation and Error Handling

Validation must be performed on both the frontend and backend.

### Frontend Validation

- Required fields.
- Valid email and phone formats.
- Positive quantities where required.
- Valid price formats.
- Clear confirmation messages for destructive actions.

### Backend Validation

- Validate request bodies, query parameters, and route identifiers.
- Reject malformed requests.
- Verify business ownership and permissions.
- Recalculate transaction totals.
- Validate available stock.
- Prevent duplicate submissions.
- Enforce business-specific rules.
- Return appropriate HTTP status codes.

### Error Handling

Suggested HTTP status codes:

| Status | Meaning                                        |
| ------ | ---------------------------------------------- |
| 200    | Request completed                              |
| 201    | Resource created                               |
| 400    | Invalid request                                |
| 401    | Authentication required                        |
| 403    | Permission denied                              |
| 404    | Resource not found                             |
| 409    | Conflict or duplicate operation                |
| 422    | Valid request format but invalid business data |
| 429    | Too many requests                              |
| 500    | Unexpected server error                        |

Production errors should be logged securely without exposing confidential information to users.

---

## Testing

Testing is required before features are considered complete.

### Unit Tests

Test individual business functions, including:

- Sales total calculations.
- Discount calculations.
- Stock quantity calculations.
- Payment balance calculations.
- Profit calculations.
- Input validation.

### Integration Tests

Test interactions between:

- API routes and database models.
- Authentication and authorization middleware.
- Sales and stock movement records.
- Purchases and inventory updates.
- Payments and outstanding balances.
- Returns and stock restoration.

### Frontend Tests

Test:

- Forms and validation.
- Dashboard loading states.
- Inventory search and filtering.
- Point-of-sale interactions.
- Permission-based navigation.
- Error messages.
- Responsive layouts.

### End-to-End Tests

A complete sales workflow should verify that:

1. An authorized user signs in.
2. The user creates or selects a product.
3. The user processes a sale.
4. Stock is updated correctly.
5. Payment records are saved.
6. The receipt is generated.
7. The transaction appears in the sales history.
8. Reports reflect the completed transaction.

### Test Commands

Use the scripts configured in each package.

```bash
npm test
```

This command must be configured in the relevant `package.json` before it can be used.

Run tests against a separate test database and never use real production records for destructive testing.

---

## Security Considerations

Security is essential because Stockora stores business and financial information.

The application should:

- Hash passwords with a modern password-hashing algorithm.
- Use HTTPS in production.
- Validate and sanitize user inputs.
- Protect against injection and common web vulnerabilities.
- Enforce server-side authorization.
- Use secure authentication cookies when applicable.
- Configure CORS with trusted origins.
- Rate-limit sensitive endpoints.
- Keep secrets out of source control.
- Restrict file uploads by type and size.
- Maintain audit logs for sensitive operations.
- Back up production data.
- Test database restoration procedures.
- Keep dependencies updated.
- Avoid exposing personal or financial information in application logs.
- Prevent unauthorized cross-business data access.
- Use idempotency controls for retryable financial operations.
- Apply database transactions to critical workflows.

Security-sensitive actions, including refunds, stock corrections, price overrides, and staff permission changes, should be restricted and audited.

---

## Deployment

Stockora can be deployed using separate frontend and backend services with a managed MongoDB database.

### Production Architecture

```text
Customer Browser
       |
       | HTTPS
       v
Frontend Hosting
       |
       | Secure API Requests
       v
Node.js / Express Hosting
       |
       | Database Connection
       v
Managed MongoDB
```

### Deployment Checklist

#### Frontend

- Build the production bundle.
- Configure the production API URL.
- Verify client-side routing.
- Test the responsive interface.
- Configure HTTPS.
- Verify environment variables.
- Avoid exposing server secrets.

#### Backend

- Configure production environment variables.
- Use a strong authentication secret.
- Configure CORS for the production frontend.
- Validate all API requests.
- Configure secure cookies and trusted proxy settings where required.
- Enable appropriate production logging.
- Configure a health-check endpoint.
- Set up monitoring and error reporting.
- Handle shutdown and database disconnection gracefully.

#### Database

- Use a managed or appropriately secured MongoDB deployment.
- Restrict database network access.
- Use a dedicated database user with least-privilege permissions.
- Configure backups and retention.
- Create required indexes.
- Verify database restoration procedures.

#### Final Verification

- Test registration and login.
- Test business data isolation.
- Test inventory operations.
- Test sales and payment workflows.
- Test stock adjustments and returns.
- Test receipt generation.
- Test reports against known transactions.
- Verify that secrets and private data are not exposed.
- Test recovery from failed requests.

---

## Development Roadmap

The following roadmap provides a recommended implementation order.

### Phase 1: Project Foundation

- [ ] Initialize the frontend and backend.
- [ ] Configure environment variables.
- [ ] Connect MongoDB.
- [ ] Establish API conventions.
- [ ] Implement global error handling.
- [ ] Build the initial application layout.
- [ ] Implement the Stockora design tokens.

### Phase 2: Authentication and Business Setup

- [ ] Implement registration and login.
- [ ] Implement password hashing.
- [ ] Add business creation.
- [ ] Add business membership and roles.
- [ ] Implement authorization middleware.
- [ ] Add user profile management.

### Phase 3: Inventory

- [ ] Implement product CRUD.
- [ ] Add product categories.
- [ ] Add SKU validation.
- [ ] Implement stock movements.
- [ ] Add inventory search and filters.
- [ ] Implement low-stock alerts.
- [ ] Add stock valuation.

### Phase 4: Sales and POS

- [ ] Build the point-of-sale interface.
- [ ] Implement server-side total calculations.
- [ ] Record sales and payments.
- [ ] Update inventory atomically.
- [ ] Generate receipt numbers.
- [ ] Implement receipt printing.
- [ ] Add sales history.
- [ ] Implement returns and refunds.

### Phase 5: Customers, Suppliers, and Expenses

- [ ] Implement customer management.
- [ ] Implement supplier management.
- [ ] Add purchase records.
- [ ] Record received stock.
- [ ] Implement expense tracking.
- [ ] Add customer payment tracking.
- [ ] Add supplier payment tracking.
- [ ] Add outstanding balance reports.

### Phase 6: Dashboard and Reporting

- [ ] Build dashboard summary cards.
- [ ] Add sales charts.
- [ ] Implement inventory reports.
- [ ] Implement expense reports.
- [ ] Implement profit calculations.
- [ ] Add report filtering.
- [ ] Add report exports.

### Phase 7: Quality and Security

- [ ] Add unit tests.
- [ ] Add API integration tests.
- [ ] Add frontend tests.
- [ ] Add end-to-end tests.
- [ ] Review authorization rules.
- [ ] Test business data isolation.
- [ ] Verify database backups.
- [ ] Test error recovery.

### Phase 8: Production Release

- [ ] Deploy the frontend.
- [ ] Deploy the backend.
- [ ] Configure the production database.
- [ ] Configure domains and HTTPS.
- [ ] Configure monitoring and backups.
- [ ] Perform production smoke tests.
- [ ] Publish user documentation.
- [ ] Establish a release and maintenance process.

---

## Contribution Guidelines

Contributions should improve Stockora's functionality, reliability, accessibility, or maintainability.

### Development Workflow

1. Create a feature branch.
2. Implement the change.
3. Add or update tests.
4. Run the relevant test suites.
5. Review the code for security and consistency.
6. Submit a pull request with a clear description.

### Branch Naming

Examples:

```text
feature/inventory-management
feature/point-of-sale
feature/customer-payments
fix/stock-calculation
fix/receipt-formatting
docs/api-documentation
```

### Commit Messages

Use descriptive commit messages.

Examples:

```text
feat: add product inventory management
feat: implement point of sale
fix: prevent duplicate stock deductions
fix: correct outstanding balance calculation
docs: update API documentation
test: add sales calculation tests
```

### Contribution Principles

- Keep changes focused.
- Follow established code conventions.
- Never commit credentials or secrets.
- Add tests for critical business logic.
- Document significant API or database changes.
- Preserve transaction and inventory accuracy.
- Do not bypass authentication or authorization to simplify implementation.

---

## License

Choose and add a license before publicly distributing Stockora.

If the project is proprietary, specify the applicable ownership and usage terms. If it is intended to be open source, select an appropriate open-source license and include its complete license text in a `LICENSE` file.

Until a license is selected, the project's distribution and reuse terms should be treated as not yet specified.

---

## Project Status

**Stockora is a small-business operating software project intended for inventory-driven retail businesses.**

The client currently provides an interactive local-data demo. The modules, architecture, API endpoints, and database fields described in this README otherwise define the proposed product scope; their presence in this document does not imply that they have been implemented.

Update this README as the project evolves so that installation instructions, available features, API documentation, and deployment procedures accurately reflect the current codebase.

---

## Product Philosophy

Stockora is built around three principles:

1. **Simplicity:** Make everyday business operations easy to understand and perform.
2. **Accuracy:** Maintain reliable inventory, sales, payment, and reporting records.
3. **Control:** Give business owners a clear view of their operations and performance.

**Stockora — Your Business. Under Control.**
