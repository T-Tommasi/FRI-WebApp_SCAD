class SheetWriter {
  /**
   * Writes the processed client invoices data to the target sheet.
   * It uses the schema from Config.gs to dynamically build headers and map data to the correct columns.
   * @param {object} clientInvoiceMap The map of client objects from the ETL process.
   * @param {string} targetSheetName The name of the sheet to write to (e.g., 'ClientInvoices').
   */

  static writeToInvoiceDb(targetSheet, originSheet) {
    if (!targetSheet) {
      throw new Error(
        errorMessages("SheetWriter.writeToInvoiceDb").MISSING_SHEET_ID.IT_TEXT
      );
    }

    const RAW_MAP = retrieveClientInvoicesErp(originSheet);

    const scheme = getClientDbHeaders();
    const HEADER_SCHEME = getClientDbHeaders();
    const HEADERS = this._headerSorter(scheme);
    const ROWS = this._generate2dArray(RAW_MAP,HEADER_SCHEME)

    const INFO_OBJECT = {
      SKIPPED_INVOICES: RAW_MAP.skippedInvoices,
      NEW_CLIENTS: RAW_MAP.registeredNewClients,
      REGISTERED_INVOICES: RAW_MAP.registeredNewInvoices,
    };

    let writerData = [HEADERS, ...ROWS];

    if (writerData.length > 1) {
        //TODO: Complete this function writing script
        //TODO: Create cleanContent logic
        //TODO: Create function to read and save notes that have been saved into memory from external interface
    }
  }

  /**
   * Sorts and maps a schema object to a 1D array of header strings.
   * (Internal helper method)
   * @param {object} headerObject The schema object from Config.gs.
   * @return {string[]} A sorted array of header texts.
   */

  static _headerSorter(headerObject) {
    let sortedHeaders = Object.values(headerObject)
      .sort((a, b) => a.COLUMN - b.COLUMN)
      .map((col) => col.TEXT);

    return sortedHeaders;
  }

  static _generate2dArray(clientInvoiceRawMap,headerSchema) {
    let writingArray = [];

    for (let client of Object.values(clientInvoiceRawMap)) {
      for (let invoice of clientInvoiceRawMap.invoices) {
        let invoiceRow = new Array(Object.keys(headerSchema).length);

        invoiceRow[headerSchema.CLIENT_UUID.COLUMN - 1] = client.uuid;
        invoiceRow[headerSchema.CLIENT_NAME.COLUMN - 1] = client.name;
        invoiceRow[headerSchema.CLIENT_AGENT.COLUMN - 1] = client.agent;
        invoiceRow[headerSchema.INVOICE_UUID.COLUMN - 1] = invoice.uuid;
        invoiceRow[headerSchema.INVOICE_DATE.COLUMN - 1] = invoice.date;
        invoiceRow[headerSchema.INVOICE_DUE_DATE.COLUMN - 1] = invoice.dueDate;
        invoiceRow[headerSchema.INVOICE_AMOUNT.COLUMN - 1] = invoice.amount;
        invoiceRow[headerSchema.INVOICE_PAID.COLUMN - 1] = invoice.paid;
        invoiceRow[headerSchema.INVOICE_LEFT_PAY.COLUMN - 1] =
          invoice.leftToPay;
        invoiceRow[headerSchema.INVOICE_TYPE.COLUMN - 1] = invoice.type.IT_TEXT;
        invoiceRow[headerSchema.INVOICE_STATUS.COLUMN - 1] = invoice.status;
        invoiceRow[headerSchema.INVOICE_ISOVERDUE.COLUMN - 1] =
          invoice.isOverdue ? "Si" : "No";

        writingArray.push(invoiceRow);
      }
    }

    return writingArray;
  }
}
