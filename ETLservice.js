/**
 * Retrieves and processes client invoices from the ERP export sheet (IMPORT_AREA).
 * Organizes invoices by client, sanitizes date fields, and skips rows deemed
 * to be summary/junk data or individual invoices with unparseable dates.
 * @return {object} Contains clientInvoicesMap, an array of invoice UUIDs with
 * problematic dates, and various processing statistics.
 */
function retrieveClientInvoicesErp() {
  const COLUMN = clientImporterColumn();
  const CLIENT_DB = INVOKE_SHEET().CLIENTS; // Reserved for future database write operations
  const IMPORT_AREA = INVOKE_SHEET().CLIENTS_ETL;
  const HEADER_ROWS = 1;

  let skippedInvoices = 0;
  let skippedWrongRows = 0;
  let registeredNewInvoices = 0;
  let registeredNewClients = 0;
  let missingDataInvoiceArray = [];

  // Fetches the block of data to be processed.
  // Assumes OVERDUE_DATE_COL is the first relevant column in the ERP sheet.
  let DATA_RAW = IMPORT_AREA.getRange(
    HEADER_ROWS + 1,
    COLUMN.OVERDUE_DATE_COL.SHEET,
    IMPORT_AREA.getLastRow() - HEADER_ROWS,
    IMPORT_AREA.getLastColumn() - COLUMN.OVERDUE_DATE_COL.SHEET + 1
  ).getValues();

  let clientInvoicesMap = {}; // Stores processed Client objects, keyed by clientID

  // Inner helper to centralize date sanitization attempts, logging, and error tracking for this ETL.
  // Returns a Date object on success, or 'missingDate' sentinel string on failure.
  function etlDateSanitizerLogger(rawDateString, invoiceUUID) {
    if (!invoiceUUID) {
      invoiceUUID = "missing_invoice_uuid_in_row"; // Default if UUID itself is problematic from row
    }
    try {
      return SanitizationServices.sanitizeDate(rawDateString);
    } catch (error) {
      Logger.log(
        errorMessages("RetrieveClientInvoicesErp.etlDateSanitizerLogger")
          .INVALID_DATE.IT_TEXT +
          ' Invoice UUID: "' +
          invoiceUUID +
          '"' +
          '. Original Date Value: "' +
          rawDateString +
          '"' +
          ". Error: " +
          error.message
      );
      missingDataInvoiceArray.push(invoiceUUID);
      skippedInvoices += 1;
      return "missingDate";
    }
  }

  function etlClientVendorIdSanitizerLogger(uuid) {
    try {
      return SanitizationServices.sanitizeClientVendorId(uuid);
    } catch (error) {
      let result = errorCatcher(uuid, missingDataInvoiceArray);
      Logger.log(
        `Failed to sanitize ClientVendorID. UUID: "${uuid}", Error: ${error.message}`
      );
      skippedInvoices += 1;
      return result;
    }
  }

  function etlInvoiceIdSanitizerLogger(invoiceId) {
    try {
      return SanitizationServices.sanitizeInvoiceId(invoiceId);
    } catch (error) {
      let result = errorCatcher(invoiceId, missingDataInvoiceArray);
      Logger.log(
        `Failed to sanitize invoiceId. UUID: "${invoiceId}", Error: ${error.message}`
      );
      skippedInvoices += 1;
      return result;
    }
  }

  function etlAmountSanitizerLogger(rawAmount, uuid) {
    if (!uuid) {
      uuid = "missing_invoice_uuid_in_row";
    }
    try {
      return SanitizationServices.sanitizeMoney(rawAmount, uuid);
    } catch (error) {
      Logger.log(
        errorMessages("RetrieveClientInvoicesErp.etlAmountSanitizerLogger")
          .WRONG_VALUE_TYPE.IT_TEXT +
          ' Invoice UUID: "' +
          invoiceUUID +
          '"' +
          '. Original Date Value: "' +
          rawAmount +
          '"' +
          ". Error: " +
          error.message
      );
      missingDataInvoiceArray.push(uuid);
      skippedInvoices += 1;
      return "missingData";
    }
  }

  for (let row of DATA_RAW) {
    // TODO: Sanitize clientID (e.g., extract from complex string, validate format) before use as map key.
    let clientID = etlClientVendorIdSanitizerLogger(row[COLUMN.CLIENT_UUID.JS]);
    let invoiceID = etlInvoiceIdSanitizerLogger(row[COLUMN.INVOICE_UUID.JS]);

    let sanitizedInvoiceDate = etlDateSanitizerLogger(
      row[COLUMN.INVOICE_DATE.JS],
      invoiceID
    );
    let sanitizedInvoiceOverdueDate = etlDateSanitizerLogger(
      row[COLUMN.OVERDUE_DATE_COL.JS],
      invoiceID
    );
    let sanitizedAmount = etlAmountSanitizerLogger(
      row[COLUMN.INVOICE_AMOUNT.JS],
      invoiceID
    );
    let sanitizedPaid = etlAmountSanitizerLogger(
      row[COLUMN.INVOICE_PAID_AMOUNT.JS],
      invoiceID
    );
    let invoiceDefinition = defineInvoiceType(sanitizedAmount);

    // Skips rows deemed to be summary/junk based on unparseable OVERDUE_DATE_COL.
    if (
      sanitizedInvoiceOverdueDate === "missingDate" ||
      sanitizedInvoiceDate === "missingDate" ||
      sanitizedAmount === "missingData" ||
      invoiceID === "missingData" ||
      clientID === "missingData"
    ) {
      skippedWrongRows += 1;
      continue;
    }

    if (sanitizedPaid === "missingData") {
      sanitizedPaid = 0;
    }

    if (!clientInvoicesMap[clientID]) {
      // New client
      let client = new Client(
        clientID,
        row[COLUMN.CLIENT_NAME.JS] // Cant sanitize names, too many random variables
      );

      let clientInvoice = new Invoice(
        invoiceID,
        clientID,
        sanitizedAmount,
        sanitizedInvoiceDate,
        sanitizedInvoiceOverdueDate,
        sanitizedPaid,
        invoiceDefinition
      );

      client.invoices.push(clientInvoice);
      clientInvoicesMap[clientID] = client;
      registeredNewInvoices += 1;
      registeredNewClients += 1;
    } else {
      // Existing client
      // invoiceID is already defined from the top of the loop
      if (
        !clientInvoicesMap[clientID].invoices.find(
          (invoiceCheck) => invoiceCheck.uuid === invoiceID
        )
      ) {
        let invoice = new Invoice(
          invoiceID,
          clientID,
          sanitizedAmount,
          sanitizedInvoiceDate,
          sanitizedInvoiceOverdueDate,
          sanitizedPaid,
          invoiceDefinition
        );
        clientInvoicesMap[clientID].invoices.push(invoice);
        registeredNewInvoices += 1;
      } else {
        Logger.log(
          `Invoice ${invoiceID} for client ${clientID} already processed/duplicate, skipping.`
        );
        skippedInvoices += 1;
        continue;
      }
    }
  }

  return {
    clientInvoicesMap,
    missingDataInvoiceArray,
    registeredNewClients,
    registeredNewInvoices,
    skippedInvoices,
    skippedWrongRows,
  };
}

function writeClientToSheet(clientInvoiceMap, targetSheets) {
  let clientsCollection = clientInvoiceMap;
  let client2dMap = [];
  for (let client of Object.values(clientsCollection)) {
    for (let invoice of client.invoices) {
      let clientDbArray = [
        client.uuid,
        client.name,
        invoice.amount,
        invoice.isOverdue ? "OVERDUE" : "",
        invoice.date,
        invoice.uuid,
        invoice.invoiceNote,
        client.agent,
      ];
      client2dMap.push(clientDbArray);
    }
  }
}
