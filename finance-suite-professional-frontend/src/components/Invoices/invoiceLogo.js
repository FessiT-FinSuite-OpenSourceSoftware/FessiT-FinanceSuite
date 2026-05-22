export function getInvoiceReportLogoFilename(invoiceData, orgData) {
  const status = (invoiceData?.status || "New").toLowerCase();

  if (status === "new") {
    return (
      orgData?.logo ||
      invoiceData?.org_logo ||
      invoiceData?.orgLogo ||
      invoiceData?.organisationLogo ||
      invoiceData?.organizationLogo ||
      ""
    );
  }

  return invoiceData?.linkedLogo || "";
}
