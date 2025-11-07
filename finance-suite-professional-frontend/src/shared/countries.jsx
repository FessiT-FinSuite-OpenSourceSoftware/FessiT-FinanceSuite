export const countries = [
    {
      cid:"IN",
      cname:"India",
      phone: /^[6-9]\d{9}$/,
      tax_id: /^[0-9A-Z]{15}$/,
      tax_label: "GSTIN",
      code: "+91",
    },
    {
      cid:"US",
      cname:"USA",

      phone: /^\d{10}$/,
      tax_id: /^\d{2}-\d{7}$/,
      tax_label: "EIN",
      code: "+1",
    },
    {
      cid:"UK",
      cname:"UK",

      phone: /^(\d{10,11})$/,
      tax_id: /^GB\d{9}$/,
      tax_label: "VAT Number",
      code: "+44",
    },
    {
      cid:"AU",
      phone: /^(\d{9})$/,
      tax_id: /^\d{11}$/,
      tax_label: "ABN",
      code: "+61",
      cname:"Australia",

    },
]