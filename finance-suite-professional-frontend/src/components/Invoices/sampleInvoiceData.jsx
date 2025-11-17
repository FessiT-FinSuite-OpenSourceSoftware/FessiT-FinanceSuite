import Logo from '../../assets/FessitLogoTrans.png'
export const sampleData ={
  "company_logo":Logo,
  "company_name": "FessiT Solutions Private Limited",
  "gstIN": "Test1234E",
  "company_address": " No 2, 5th Cross, First Floor,\n Muninagappa Layout Kavalbyrasandra,\n Bangalore Karnataka 560032\n India",
  "company_email": "test@gmail.com",
  "company_phone": "6309640774",

  "billcustomer_name": "TEST customer",
  "billcustomer_gstin": "TESTC4321",
  "billcustomer_address": " No 2, 5th Cross, First Floor,\n Muninagappa Layout Kavalbyrasandra,\n Bangalore Karnataka 560032\n India",

  "shipcustomer_name": "TEST customer",
  "shipcustomer_gstin": "TESTC4321",
  "shipcustomer_address": " No 2, 5th Cross, First Floor,\n Muninagappa Layout Kavalbyrasandra,\n Bangalore Karnataka 560032\n India",

  "invoice_number": "Test",
  "invoice_date": "2025-12-12",
  "invoice_dueDate": "2026-01-12",
  "invoice_terms": "Due on receipt",
  "subject": " The invoice has been raised for 20% of the total payment amount",
  "po_number": "ASDET",
  "place_of_supply": "Bagalore",
  "notes": "Looking forward for your business",

  "items": [
    {
      "description": "item1",
      "hours": "6",
      "rate": "2000",
      "cgst": { "cgstPercent": "9", "cgstAmount": "1080.00" },
      "sgst": { "sgstPercent": "9", "sgstAmount": "1080.00" },
      "itemTotal": "14160.00"
    },
    {
      "description": "item2",
      "hours": "6",
      "rate": "20000",
      "cgst": { "cgstPercent": "9", "cgstAmount": "10800.00" },
      "sgst": { "sgstPercent": "9", "sgstAmount": "10800.00" },
      "itemTotal": "141600.00"
    },
    {
      "description": "item 3",
      "hours": "6",
      "rate": "200",
      "cgst": { "cgstPercent": "9", "cgstAmount": "108.00" },
      "sgst": { "sgstPercent": "9", "sgstAmount": "108.00" },
      "itemTotal": "1416.00"
    }
  ],

  "subTotal": "157176.00",
  "totalcgst": "11988.00",
  "totalsgst": "11988.00",
  "total": "181152.00"
}


export const bankDetails = {
  title: "Bank Details",
  fields: [
    { label: "Account Name", value: "M/s Fessit Solutions Private Limited" },
    { label: "Account Number", value: "50200111090190" },
    { label: "Account Type", value: "Current Account" },
    { label: "IFSC Code", value: "HDFC0001208" },
    { label: "Banker", value: "HDFC Bank" },
    { label: "Branch", value: "Millers Road" }
  ]
};


export const terms = [
    "The hourly rate of solution architect is ₹2,500 INR inclusive of GST. This rate is applicable only for this scope.",
    "GST will be charged at the applicable rate at the time of invoicing.",
    `Payment should be made within 7 days from the date of invoice.`,
  ];
