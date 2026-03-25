# Invoice Fetching Issue - Complete Fix

## Root Cause
The invoice system was trying to fetch invoices using `org_email` (admin's email) to look up the organisation, but:
1. Organisation has its own `email` field (organisation email)
2. Admin user has a separate `email` field (admin's email)
3. These two emails are different
4. Invoices had no `organisation_id` field to filter by organisation

## Changes Made

### Backend Changes

#### 1. Invoice Model (`src/models/invoice.rs`)
- **Added**: `organisation_id` field to link invoices to organisations
```rust
#[serde(rename = "organisationId", skip_serializing_if = "Option::is_none")]
pub organisation_id: Option<ObjectId>,
```

#### 2. Invoice Repository (`src/repository/invoice_repository.rs`)
- **Added**: `get_invoices_by_organisation()` method to filter invoices by organisation_id
```rust
pub async fn get_invoices_by_organisation(&self, org_id: &ObjectId) -> Result<Vec<Invoice>, MongoError>
```

#### 3. Invoice Service (`src/services/invoice_service.rs`)
- **Changed**: `create_invoice()` to accept `org_id` instead of `org_email`
- **Changed**: `generate_invoice_number()` to use `org_id` instead of `org_email`
- **Changed**: `peek_next_invoice_number()` to use `org_id` instead of `org_email`
- **Added**: `get_invoices_by_organisation()` method
- **Added**: Sets `organisation_id` on invoice during creation

#### 4. Invoice Handler (`src/handlers/invoice_handler.rs`)
- **Changed**: `create_invoice()` - Removed `org_email` query parameter, now gets org_id from user's JWT claims
- **Changed**: `list_invoices()` - Now filters invoices by user's organisation_id from JWT claims
- **Changed**: `get_next_invoice_number()` - Removed `org_email` query parameter, uses user's org_id from JWT

#### 5. Organisation Repository (`src/repository/organisation_repository.rs`)
- **Added**: `get_organisation_by_id()` method
- **Added**: `get_next_invoice_sequence_by_id()` method
- **Added**: `peek_next_invoice_sequence_by_id()` method

### Frontend Changes

#### 1. Invoice Redux (`src/ReduxApi/invoice.jsx`)
- **Removed**: `org_email` query parameter from `createInvoice()`
- **Removed**: `org_email` query parameter from `fetchNextInvoiceNumber()`
- **Fixed**: Changed `/invoice/{id}` to `/invoices/{id}` (plural) to match backend
- **Fixed**: Changed PUT `/invoice/{id}` to `/invoices/{id}` (plural)

#### 2. Axios Instance (`src/utils/axiosInstance.js`)
- **Removed**: `withCredentials: false` that was conflicting with CORS
- **Removed**: `timeout: 10000` that might cause premature failures

## How It Works Now

### Invoice Creation Flow
1. User creates invoice in frontend
2. Frontend sends POST `/api/v1/invoices` with invoice data (no org_email)
3. Backend JWT middleware extracts user from token
4. Handler gets user's `organisation_id` from JWT claims
5. Service sets `organisation_id` on invoice
6. Service generates invoice number using organisation's settings
7. Invoice saved with `organisation_id` field

### Invoice Fetching Flow
1. User requests invoices list
2. Frontend sends GET `/api/v1/invoices` (no parameters)
3. Backend JWT middleware extracts user from token
4. Handler gets user's `organisation_id` from JWT claims
5. Service filters invoices by `organisation_id`
6. Returns only invoices belonging to user's organisation

### Invoice Number Generation Flow
1. Frontend requests next invoice number
2. Backend gets user's `organisation_id` from JWT
3. Looks up organisation by ID (not email)
4. Increments organisation's `lastInvoiceSequence`
5. Generates number using organisation's prefix and sequence

## Benefits

1. **Security**: Users can only see invoices from their organisation
2. **Scalability**: No need to pass org_email in every request
3. **Consistency**: All data filtered by organisation_id from JWT
4. **Simplicity**: Frontend doesn't need to manage org_email
5. **Correctness**: Uses proper organisation reference instead of email lookup

## API Changes

### Before
```
POST /api/v1/invoices?org_email=admin@example.com
GET /api/v1/invoices/next-number?org_email=admin@example.com
GET /api/v1/invoices (returned ALL invoices)
```

### After
```
POST /api/v1/invoices (org_id from JWT)
GET /api/v1/invoices/next-number (org_id from JWT)
GET /api/v1/invoices (filtered by user's org_id from JWT)
```

## Database Schema

### Invoice Document
```javascript
{
  _id: ObjectId("..."),
  invoice_number: "INV-2024-001",
  company_name: "...",
  // ... other fields ...
  organisationId: ObjectId("..."),  // NEW FIELD
  status: "Paid"
}
```

### Organisation Document
```javascript
{
  _id: ObjectId("..."),
  organizationName: "My Company",
  email: "company@example.com",  // Organisation email
  lastInvoiceSequence: 5,
  // ... other fields ...
}
```

### User Document
```javascript
{
  _id: ObjectId("..."),
  name: "Admin User",
  email: "admin@example.com",  // Admin's email (different from org email)
  organisationId: ObjectId("..."),  // Links to organisation
  is_admin: true,
  // ... other fields ...
}
```

## Testing

1. **Login** with admin credentials
2. **Create Invoice** - Should work without org_email parameter
3. **List Invoices** - Should only show invoices from your organisation
4. **Get Next Number** - Should generate correct invoice number

## Migration Notes

### For Existing Invoices
Existing invoices in the database don't have `organisation_id`. You may need to run a migration script to:
1. Find all invoices
2. Match them to organisations (by company_name or other fields)
3. Set the `organisation_id` field

### Migration Script (Pseudo-code)
```javascript
// For each invoice without organisationId
db.invoices.find({ organisationId: { $exists: false } }).forEach(invoice => {
  // Find matching organisation
  const org = db.organisations.findOne({ 
    companyName: invoice.company_name 
  });
  
  if (org) {
    // Update invoice with organisation_id
    db.invoices.updateOne(
      { _id: invoice._id },
      { $set: { organisationId: org._id } }
    );
  }
});
```

## Troubleshooting

### Issue: "User has no organisation"
**Solution**: Ensure user has `organisationId` field set when created

### Issue: "Organisation not found"
**Solution**: Verify organisation exists and user's `organisationId` is correct

### Issue: Still seeing all invoices
**Solution**: 
- Check if invoices have `organisationId` field
- Run migration script for existing invoices
- Verify JWT contains correct user information

### Issue: Invoice number generation fails
**Solution**: Ensure organisation has `invoice_prefix` and `starting_invoice_no` fields set
