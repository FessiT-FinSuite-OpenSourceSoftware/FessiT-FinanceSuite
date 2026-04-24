# Multi-Organization Ledger Implementation

## Overview
This implementation provides separate ledger transactions and balance management for different organizations in your finance suite. Each organization maintains completely isolated financial data with proper double-entry bookkeeping.

## Key Features Implemented

### 1. Organization-Level Data Isolation
- **Ledger Entries**: All ledger entries are scoped by `organisation_id`
- **Account Balances**: Each organization has separate account balances
- **Chart of Accounts**: Each organization gets its own chart of accounts
- **Financial Reporting**: All reports are organization-specific

### 2. Account-Based Ledger System
- **Account Types**: Asset, Liability, Equity, Revenue, Expense
- **Account Categories**: Sub-classifications for better organization
- **Default Accounts**: Automatic creation of standard accounts for new organizations
- **Balance Tracking**: Real-time balance updates for all accounts

### 3. Double-Entry Bookkeeping
- **Invoice Issuance**: 
  - Debit: Accounts Receivable (Asset ↑)
  - Credit: Sales Revenue (Revenue ↑)
- **Payment Receipt**:
  - Debit: Cash (Asset ↑)
  - Credit: Accounts Receivable (Asset ↓)

## New Models

### Account Model (`src/models/account.rs`)
```rust
pub struct Account {
    pub organisation_id: ObjectId,  // Organization isolation
    pub account_code: String,       // e.g., "1001", "4001"
    pub account_name: String,       // e.g., "Cash", "Sales Revenue"
    pub account_type: AccountType,  // Asset, Liability, etc.
    pub balance: i64,              // Current balance in paise
    // ... other fields
}
```

### Organization Balance (`src/models/account.rs`)
```rust
pub struct OrganizationBalance {
    pub organisation_id: ObjectId,
    pub total_assets: i64,
    pub total_liabilities: i64,
    pub total_equity: i64,
    pub total_revenue: i64,
    pub total_expenses: i64,
    pub net_income: i64,
}
```

## New Services

### AccountService (`src/services/account_service.rs`)
- `initialize_organization_accounts()` - Creates default chart of accounts
- `get_organization_balance()` - Gets organization-wide balance summary
- `get_financial_summary()` - Complete financial overview

### Enhanced LedgerService (`src/services/ledger_service.rs`)
- `update_account_balances_for_invoice()` - Updates accounts when invoice issued
- `update_account_balances_for_payment()` - Updates accounts when payment received
- `get_organization_balance_summary()` - Organization balance via ledger service

## New API Endpoints

### Account Management
- `GET /api/v1/accounts` - Get all accounts for organization
- `POST /api/v1/accounts` - Create new account
- `POST /api/v1/accounts/initialize` - Initialize default accounts

### Balance & Reporting
- `GET /api/v1/accounts/balances?accountType=asset` - Get balances by type
- `GET /api/v1/accounts/organization-balance` - Organization balance summary
- `GET /api/v1/accounts/financial-summary` - Complete financial overview

## Default Chart of Accounts

Each new organization gets these default accounts:

| Code | Name | Type | Category |
|------|------|------|----------|
| 1001 | Cash | Asset | Current Assets |
| 1002 | Accounts Receivable | Asset | Current Assets |
| 2001 | Accounts Payable | Liability | Current Liabilities |
| 4001 | Sales Revenue | Revenue | Operating Revenue |
| 5001 | Operating Expenses | Expense | Operating Expenses |

## Data Flow

### Invoice Creation
1. Invoice created in invoice system
2. Ledger entry recorded for customer
3. Account balances updated:
   - Accounts Receivable (1002) ↑
   - Sales Revenue (4001) ↑

### Payment Receipt
1. Invoice status changed to "Paid"
2. Payment ledger entry recorded
3. Account balances updated:
   - Cash (1001) ↑
   - Accounts Receivable (1002) ↓

## Organization Isolation Guarantees

### Database Level
- All queries filter by `organisation_id`
- Unique indexes include organization scope
- No cross-organization data leakage possible

### API Level
- User authentication provides organization context
- All endpoints validate organization membership
- Permission checks ensure proper access control

### Balance Calculations
- Account balances calculated per organization
- Financial reports scoped to organization
- No mixing of financial data between organizations

## Usage Examples

### Initialize Accounts for New Organization
```bash
POST /api/v1/accounts/initialize
Authorization: Bearer <token>
```

### Get Organization Balance Summary
```bash
GET /api/v1/accounts/organization-balance
Authorization: Bearer <token>
```

### Get Asset Balances
```bash
GET /api/v1/accounts/balances?accountType=asset
Authorization: Bearer <token>
```

## Integration with Existing Code

### No Breaking Changes
- Existing ledger functionality preserved
- Invoice handler unchanged (just enhanced)
- All existing APIs continue to work

### Enhanced Features
- Ledger entries now update account balances
- Organization-level reporting available
- Multi-currency support maintained

## Security & Compliance

### Multi-Tenant Security
- Complete data isolation between organizations
- No shared financial data
- Audit trails per organization

### Accounting Standards
- Double-entry bookkeeping enforced
- Balance sheet equation maintained (Assets = Liabilities + Equity)
- Proper revenue recognition

This implementation ensures that each organization in your system has completely separate and isolated financial ledgers while maintaining proper accounting principles and providing comprehensive reporting capabilities.