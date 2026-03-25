# Expense Fix Summary

## Issue
Expenses were not creating/fetching because frontend was sending `org_email` parameter, but backend already uses JWT claims to get the user's organisation.

## Root Cause
Frontend was adding `org_email` to:
1. FormData when creating expenses
2. Query parameters when fetching expenses
3. FormData when updating expenses

Backend doesn't need this because:
- Expense handler already extracts user from JWT claims
- Gets `organisation_id` from user
- Filters expenses by organisation automatically

## Changes Made

### Frontend (`src/ReduxApi/expense.jsx`)

#### 1. Create Expense
**Before:**
```javascript
const orgEmail = localStorage.getItem('email')
if (expenseData instanceof FormData) {
  expenseData.append('org_email', orgEmail)
}
const { data } = await axiosInstance.post('/expenses', expenseData)
```

**After:**
```javascript
const { data } = await axiosInstance.post('/expenses', expenseData)
```

#### 2. Fetch Expenses
**Before:**
```javascript
const orgEmail = localStorage.getItem('email')
const { data } = await axiosInstance.get(`/expenses?org_email=${orgEmail}`)
```

**After:**
```javascript
const { data } = await axiosInstance.get('/expenses')
```

#### 3. Update Expense
**Before:**
```javascript
const orgEmail = localStorage.getItem('email')
if (expenseData instanceof FormData) {
  expenseData.append('org_email', orgEmail)
}
const { data } = await axiosInstance.put(`/expenses/${expenseID}`, expenseData)
```

**After:**
```javascript
const { data } = await axiosInstance.put(`/expenses/${expenseID}`, expenseData)
```

## Backend (Already Correct)

The backend expense handler already:
✅ Extracts user from JWT claims
✅ Gets user's `organisation_id`
✅ Filters expenses by organisation
✅ Sets `organisation_id` on new expenses

### Example from `expense_handler.rs`:
```rust
// Get user from JWT claims
let claims = http_req.extensions().get::<Claims>().cloned()?;
let user = service.get_user_permissions(&claims.sub).await?;

// Get organisation_id from user
let org_id = user.organisation_id.ok_or_else(|| 
    actix_web::error::ErrorBadRequest("User has no organisation")
)?;

// Filter expenses by organisation
let expenses = service.get_expenses_by_organisation(&org_id, page, limit).await?;
```

## How It Works Now

### Create Expense Flow
1. User fills expense form with receipt uploads
2. Frontend sends FormData to POST `/api/v1/expenses`
3. Backend JWT middleware extracts user from token
4. Handler gets user's `organisation_id` from JWT claims
5. Sets `organisation_id` on expense
6. Saves expense to database

### Fetch Expenses Flow
1. User navigates to expenses page
2. Frontend sends GET `/api/v1/expenses`
3. Backend JWT middleware extracts user from token
4. Handler gets user's `organisation_id` from JWT claims
5. Filters expenses by `organisation_id`
6. Returns only expenses from user's organisation

### Update Expense Flow
1. User edits expense
2. Frontend sends FormData to PUT `/api/v1/expenses/{id}`
3. Backend JWT middleware extracts user from token
4. Handler verifies expense exists
5. Updates expense (keeps original `organisation_id`)

## Testing

### 1. Create Expense
- Go to Expenses page
- Click "Create Expense"
- Fill in details and upload receipt
- Submit
- Should create successfully without errors

### 2. View Expenses
- Navigate to Expenses page
- Should see list of expenses from your organisation
- Check Network tab: `GET /api/v1/expenses` (NO org_email parameter)

### 3. Update Expense
- Click edit on an expense
- Modify details
- Submit
- Should update successfully

### 4. Delete Expense
- Click delete on an expense
- Confirm deletion
- Should delete successfully

## Expected Behavior

✅ Expenses create without org_email parameter
✅ Expenses fetch filtered by user's organisation
✅ Expenses update without org_email parameter
✅ Users only see expenses from their organisation
✅ Receipt uploads work correctly
✅ No CORS or connection errors

## Common Issues

### Issue: "User has no organisation"
**Solution:** User's `organisationId` field is not set in database

### Issue: No expenses showing
**Possible Causes:**
1. Expenses have no `organisationId` field
2. User's `organisationId` doesn't match expense's `organisationId`
3. No expenses exist for this organisation

### Issue: Receipt upload fails
**Solution:** Ensure `uploads/expenses` directory exists in backend

## Database Schema

### Expense Document
```javascript
{
  _id: ObjectId("..."),
  expense_title: "Travel Expenses",
  project_cost_center: "Project A",
  items: [
    {
      expense_category: "Transportation",
      amount: 500.00,
      receipt_file: "uuid.pdf",
      original_filename: "receipt.pdf"
    }
  ],
  total_amount: 500.00,
  status: "Draft",
  organisation_id: ObjectId("..."),  // Links to organisation
  created_at: ISODate("..."),
  updated_at: ISODate("...")
}
```

## Migration Notes

If you have existing expenses without `organisation_id`:

```javascript
// Connect to MongoDB
use customer_db

// Check expenses without organisationId
db.expenses.find({ organisation_id: { $exists: false } }).count()

// Set all expenses to a specific organisation
db.expenses.updateMany(
  { organisation_id: { $exists: false } },
  { $set: { organisation_id: ObjectId("YOUR_ORG_ID_HERE") } }
)
```

## Summary

✅ **Frontend Fixed** - Removed all `org_email` parameters
✅ **Backend Already Correct** - Uses JWT claims for organisation filtering
✅ **Security Improved** - Users can only access their organisation's expenses
✅ **Simpler Code** - No need to pass org_email around

The expense system now works the same way as invoices - using JWT claims for organisation filtering!
