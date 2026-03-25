# Quick Start - Invoice Fix Testing

## What Was Fixed

### Backend
✅ Added `organisation_id` to Invoice model
✅ Invoices now filtered by user's organisation
✅ Removed `org_email` query parameter requirement
✅ All invoice operations use JWT claims for organisation

### Frontend  
✅ Removed `org_email` from all invoice API calls
✅ Fixed endpoint inconsistencies
✅ Fixed axios configuration

## Steps to Test

### 1. Start Backend
```bash
cd finance-suite-professional-backend
cargo run
```

**Expected Output:**
```
✅ Connected to MongoDB successfully
🚀 Starting server at http://127.0.0.1:8082
```

### 2. Start Frontend
```bash
cd finance-suite-professional-frontend
npm run dev
```

### 3. Test Flow

#### A. Login
1. Go to http://localhost:5174
2. Login with your admin credentials
3. Check browser console - should see token stored

#### B. View Invoices
1. Navigate to Invoices page
2. Should fetch invoices without errors
3. Check Network tab - should see: `GET /api/v1/invoices` (NO org_email parameter)

#### C. Create Invoice
1. Click "Create Invoice"
2. Fill in details
3. Submit
4. Check Network tab - should see: `POST /api/v1/invoices` (NO org_email parameter)

## Troubleshooting

### Backend Won't Start
**Error:** "Failed to connect to MongoDB"
**Solution:** 
```bash
# Start MongoDB
mongod
```

### Frontend Can't Connect
**Error:** `ERR_CONNECTION_REFUSED`
**Solution:** Make sure backend is running on port 8082

### Token Issues
**Error:** "Missing claims" or "Unauthorized"
**Solution:**
1. Clear localStorage: `localStorage.clear()`
2. Login again
3. Check token exists: `localStorage.getItem('token')`

### No Invoices Showing
**Possible Causes:**
1. User has no `organisationId` - Check user document in MongoDB
2. Invoices have no `organisationId` - Need to run migration (see below)
3. Wrong organisation - Verify user's `organisationId` matches invoice's `organisationId`

## Database Migration (If Needed)

If you have existing invoices without `organisationId`, run this in MongoDB:

```javascript
// Connect to MongoDB
use customer_db

// Check invoices without organisationId
db.invoices.find({ organisationId: { $exists: false } }).count()

// Option 1: Set all invoices to a specific organisation
db.invoices.updateMany(
  { organisationId: { $exists: false } },
  { $set: { organisationId: ObjectId("YOUR_ORG_ID_HERE") } }
)

// Option 2: Match by company name
db.invoices.find({ organisationId: { $exists: false } }).forEach(invoice => {
  const org = db.organisations.findOne({ 
    companyName: invoice.company_name 
  });
  
  if (org) {
    db.invoices.updateOne(
      { _id: invoice._id },
      { $set: { organisationId: org._id } }
    );
  }
});
```

## Verify Everything Works

### Check 1: Backend Logs
Should see:
```
INFO  - Creating invoice for org_id: 507f1f77bcf86cd799439011
INFO  - Generated invoice number: INV-2024-001
INFO  - Invoice created successfully
```

### Check 2: Network Tab
```
Request URL: http://127.0.0.1:8082/api/v1/invoices
Request Method: GET
Status Code: 200 OK
Request Headers:
  Authorization: Bearer eyJhbGc...
```

### Check 3: Response Data
```json
[
  {
    "_id": "...",
    "invoice_number": "INV-2024-001",
    "organisationId": "507f1f77bcf86cd799439011",
    ...
  }
]
```

## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `ERR_CONNECTION_REFUSED` | Backend not running | Start backend with `cargo run` |
| `401 Unauthorized` | No token or invalid token | Login again |
| `403 Forbidden` | No permission | Check user permissions in DB |
| `404 Not Found` | Wrong endpoint | Verify using `/invoices` (plural) |
| `500 Internal Server Error` | Backend error | Check backend logs |
| Empty invoice list | No `organisationId` on invoices | Run migration script |

## Success Indicators

✅ Backend starts without errors
✅ Frontend connects to backend
✅ Login works and stores token
✅ Invoices page loads without errors
✅ Network tab shows clean requests (no org_email)
✅ Can create new invoices
✅ Can view invoice list
✅ Can edit/delete invoices

## Next Steps After Testing

Once invoices work:
1. Apply same fix to Purchase Orders
2. Apply same fix to Expenses (if needed)
3. Update any other modules using org_email
4. Run migration for existing data
5. Update API documentation
