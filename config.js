function getInternalClientInvoiceMap() {
  return {
    UUID_CLIENT: { INDEX: 1, TEXT_IT: 'Codice cliente' },
    NAME_CLIENT: { INDEX: 2, TEXT_IT: 'Nominativo' },
    INVOICE_NUMBER: { INDEX: 3, TEXT_IT: 'ID Fattura' },
    INVOICE_DATE: { INDEX: 4, TEXT_IT: 'Data emissione' },
    INVOICE_OVERDUE_DATE: { INDEX: 5, TEXT_IT: 'Scadenza' },
    INVOICE_TOTAL_AMOUNT: { INDEX: 6, TEXT_IT: 'Totale da ricevere' },
    INVOICE_TOTAL_PAID: { INDEX: 7, TEXT_IT: 'Pagamento ricevuto' },
    INVOICE_TYPE: { INDEX: 8, TEXT_IT: 'Tipologia fattura' },
    PAYMENT_METHOD: { INDEX: 9, TEXT_IT: 'Metodo di pagamento' },
    INVOICE_NOTE: { INDEX: 10, TEXT_IT: 'Note fattura' }, //CLIENT_NOTES e VENDOR_NOTES are memorized in a specific sheet\DB for ease of access and usage
  }
}

function invoiceType() {
  return {
    CREDIT_NOTE: { DEBT: false, IT_TEXT: 'Nota di credito' },
    INVOICE: { DEBT: true, IT_TEXT: 'Fattura' },
    ERROR: { DEBT: false, IT_TEXT: 'Errore nel definire la tipologia del documento!' }
  }
}

function defineInvoiceType(amount) {
  let invoiceDefinition = null;

  if (amount > 0) {
    invoiceDefinition = invoiceType().INVOICE
  } else if (amount < 0) {
    invoiceDefinition = invoiceType().CREDIT_NOTE
  } else {
    invoiceDefinition = invoiceType().ERROR;
    throw new Error(invoiceType().ERROR.IT_TEXT);
  };

  return invoiceDefinition;
}

function errorMessages(origin) {
  if (!origin) {
    origin = 'unknown - missing origin parameter'
  }
  return {
    NO_NUMBER: {
      VALUE: null,
      INTERNAL_ERROR: true,
      IT_TEXT: 'Nessun numero registrato',
      ORIGIN: origin,
    },

    NO_LOCATION: {
      VALUE: null,
      INTERNAL_ERROR: true,
      IT_TEXT: 'Nessun indirizzo registrato',
      ORIGIN: origin,
    },

    NO_MAIL: {
      VALUE: null,
      INTERNAL_ERROR: true,
      IT_TEXT: 'Nessun indirizzo email registrato',
      ORIGIN: origin,
    },

    INVALID_NOTE_ENTITY: {
      VALUE: null,
      INTERNAL_ERROR: true,
      IT_TEXT: 'ID correlato non valido',
      ORIGIN: origin,
    },

    NO_VALID_UUID: {
      VALUE: null,
      INTERNAL_ERROR: true,
      IT_TEXT: 'Codice univoco assente o non valido',
      ORIGIN: origin,
    },

    WRONG_VALUE_TYPE: {
      VALUE: null,
      INTERNAL_ERROR: false,
      IT_TEXT: 'Valore non idoneo',
      ORIGIN: origin,
    }, //INTERNAL_ERROR: false since this error is due to G2 import being fussy, if it happens

    INVALID_DATE: {
      VALUE: null,
      INTERNAL_ERROR: false,
      IT_TEXT: 'Data in formato sconosciuto',
      ORIGIN: origin,
    },

    IS_NAN_OR_INFINITE: {
      VALUE: NaN,
      INTERNAL_ERROR: true,
      IT_TEXT: 'value is either NAN or INFINITE',
      ORIGIN: origin,
    },
  }
}

function getInternalVendorInvoiceMap() {
  return {
    UUID_VENDOR: { INDEX: 1, TEXT_IT: 'Codice fornitore' },
    NAME_VENDOR: { INDEX: 2, TEXT_IT: 'Nominativo' },
    INVOICE_NUMBER: { INDEX: 3, TEXT_IT: 'ID Fattura' },
    INVOICE_DATE: { INDEX: 4, TEXT_IT: 'Data emissione' },
    INVOICE_OVERDUE_DATE: { INDEX: 5, TEXT_IT: 'Scadenza' },
    INVOICE_TOTAL_AMOUNT: { INDEX: 6, TEXT_IT: 'Totale dovuto' },
    INVOICE_TOTAL_PAID: { INDEX: 7, TEXT_IT: 'Pagato' },
    INVOICE_TYPE: { INDEX: 8, TEXT_IT: 'Tipologia fattura' },
    PAYMENT_METHOD: { INDEX: 9, TEXT_IT: 'Metodo di pagamento' },
    INVOICE_NOTE: { INDEX: 10, TEXT_IT: 'Note fattura' }, //This serves the mere purpose of adding very short notes for a specific invoice, to then be displayed (if any) in the UI.
    //CLIENT_NOTES e VENDOR_NOTES are memorized in a specific sheet\DB for ease of access and usage
  }
}

function getInternalNoteMap() {
  return {
    NOTE_UUID: { INDEX: 1, TEXT_IT: 'ID nota' }, //This wont be displayed to the end-user
    VENDOR_UUID: { INDEX: 2, TEXT_IT: 'Codice venditore' },
    CLIENT_UUID: { INDEX: 3, TEXT_IT: 'Codice cliente' }, //A single client might be both a vendor or a client, so we store both - if one is empty we will simply ignore it
    NOTE_CREATION_DATE: { INDEX: 4, TEXT_IT: 'Data creazione nota' },
    NOTE_CREATION_USER: { INDEX: 5, TEXT_IT: 'Utente che ha creato la nota' },
    NOTE_CONTENT: { INDEX: 6, TEXT_IT: 'Contenuto nota' },
    UI_DISPLAY_ACTIVE: { INDEX: 7, STATE: true },
    UI_DISPLAY_INACTIVE: { INDEX: 8, STATE: false }, //Defines if the note should be displayed for the end-user or was either removed or hidden by him
  }
}

function getFinancialSnapshotMap() {
  return {
    CLIENT_UUID: { INDEX: 1, TEXT_IT: 'Id cliente' },
    CLIENT_NAME: { INDEX: 2, TEXT_IT: 'Nominativo' },
    MONTHLY_EARNING: { INDEX: 3, TEXT_IT: 'Incasso mese' },
    MONTHLY_COSTS: { INDEX: 4, TEXT_IT: 'Spese mese' }, //If any, and if applicable
    DATE_OF_SNAPSHOT: { INDEX: 5, TEXT_IT: 'Mese e anno dello snapshot' }, //We dont need precise to-the-day tracking - unless someone proposes it, at least
    PERCENTAGE_CHANGE_TO_LAST_YEAR: { INDEX: 6, TEXT_IT: "Cambio percentile all'anno precedente" }, //If we have previous-year data.
  }
}

function INVOKE_SHEET() {
  const _SHEET = SpreadsheetApp.getActiveSpreadsheet();

  return {
    CLIENTS: _SHEET.getSheetByName('ClientInvoices'),
    VENDORS: _SHEET.getSheetByName('FornitoriInvoices'),
    NOTES: _SHEET.getSheetByName('RegistroNote'),
    CLIENTS_ETL: _SHEET.getSheetByName('uploadSheetClients'),
  }
}

//Column identifiers for ETLservice

function clientImporterColumn() {
  return {
    OVERDUE_DATE_COL: { SHEET: 1, JS: 0 }, //-- includes 'totale ordine lettura' on the same column, must be sanitized
    CLIENT_UUID: { SHEET: 2, JS: 1 }, //-- includes invoice total amount (same as INVOICE_AMOUNT), needs to be sanitized
    CLIENT_NAME: { SHEET: 3, JS: 2 },
    INVOICE_DATE: { SHEET: 4, JS: 3 },
    INVOICE_UUID: { SHEET: 5, JS: 4 },
    INVOICE_PAYMENT_TYPE: { SHEET: 6, JS: 5 },
    INVOICE_AMOUNT: { SHEET: 7, JS: 6 },
    INVOICE_PAID_AMOUNT: { SHEET: 8, JS: 7 },
    //INVOICE_EARLY_PAYMENT: {SHEET: 9, JS: 8} //-- NOT IN USE, no clue what this does in the ERP or what it means, besides it's always 'S'
    INVOICE_NOTE: { SHEET: 10, JS: 9 }, //-- Always empty when parsed by ERP
    //INVOICE_STATUS: {SHEET:11, JS: 10}, //-- Commented out - status will be dinamically calculated,
  }
};

//Utility classes

class Vendor {
  constructor(uuid, name, notes, invoices, phoneNumber, mail, location) {
    this.uuid = uuid;
    this.name = name;
    this.noteArray = notes || []; //This is an array that contains objects created by the class Note
    this.invoices = invoices || []; //This is an array that will contain objects created by the class Invoice
    this.phoneNumber = phoneNumber || errorMessages('Vendor.phoneNumber').NO_NUMBER;
    this.mail = mail || errorMessages('Vendor.mail').NO_MAIL;
    this.location = location || errorMessages('Vendor.location').NO_LOCATION;
  }
}

class Client {
  constructor(uuid, name, notes, invoices, phoneNumber, mail, location) {
    this.uuid = uuid;
    this.name = name;
    this.notes = notes || []; //This is an array that contains objects created by the class Note
    this.invoices = invoices || []; //This is an array that will contain objects created by the class Invoice
    this.phoneNumber = phoneNumber || errorMessages('Client.phoneNumber').NO_NUMBER;
    this.mail = mail || errorMessages('Client.mail').NO_MAIL;
    this.location = location || errorMessages('Client.location').NO_LOCATION;
  }

  totalLeftToPay() {
    let toPay = 0;
    for (let invoice of this.invoices) {
      toPay += invoice.amount - invoice.paid;
    }
    return toPay
  }
}

class Note {
  constructor(title, content, author, vendorUuid, clientUuid) {
    this.title = title;
    this.content = content;
    this.author = author;
    if (vendorUuid && !clientUuid) {
      this.entityId = vendorUuid;
    } else if (clientUuid && !vendorUuid) {
      this.entityId = clientUuid;
    } else {
      throw new Error('Invalid entityId for Note: ' + errorMessages('Note.entityId').INVALID_NOTE_ENTITY.IT_TEXT)
    }
  }
}

class Invoice {
  constructor(invoiceNumber, invoiceEntity, amount, date, dueDate, paid, type) {
    this.uuid = invoiceNumber;
    this.entity = invoiceEntity;
    this.amount = amount;
    this.date = date;
    this.dueDate = dueDate;
    this.paid = paid || 0;
    this.leftToPay = this.amount - this.paid;
    this.type = type || invoiceType().ERROR;
  };
}

class Product {
  constructor(uuid, description, quantity, weightType, notes, vendors) {
    this.uuid = uuid;
    if (!uuid) {
      throw new Error(errorMessages('Product.uuid').NO_VALID_UUID) //critical error, a product cannot have a missing UUID
    };
    this.description = description;
    if (!quantity) {
      this.quantity = 0;
      Logger.log(`Product with UUID ${this.uuid} has no quantity. set it to 0`)
    } else {
      if (typeof quantity === 'number') {
        this.quantity = quantity;
      } else {
        throw new Error(errorMessages(`wrong quantity value in product ${this.uuid}`).WRONG_VALUE_TYPE); //Critical error, a product quantity cant be a letter or other value
      };
    };
    this.weightType = weightType || errorMessages(`wrong weight type value in product ${this.uuid}`).WRONG_VALUE_TYPE.VALUE; //If there is no weight type we can display it blank to be fixed later on
    this.notes = notes || []; //Will be populated by the class Notes
    this.vendors = vendors || []; //to be set later on based on who sells what
  }

}