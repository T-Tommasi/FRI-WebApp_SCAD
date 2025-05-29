class SanitizationServices {
  static sanitizeDate(date) {
    let _dateArray = null
    if (!date) {
      throw new Error(errorMessages('SanitizationServices.sanitizeDate').WRONG_VALUE_TYPE.IT_TEXT)
    };
    if (date instanceof Date) {
      if (date.getFullYear() > 2030 ||
        date.getMonth() > 11 ||
        date.getDate() > 31 || date.getDate() < 1) {
        throw new Error(errorMessages('SanitizationServices.sanitizeDate').INVALID_DATE.IT_TEXT)
      }

      return date      
    }

    if (typeof date != "string") {
      Logger.log(errorMessages('SanitizationServices.sanitizeDate').WRONG_VALUE_TYPE.IT_TEXT);
      let _dateString = date.toString();
      _dateArray = _dateString.split('/');
    } else {
      _dateArray = date.split('/')
    }

    if (_dateArray.length != 3) {
      throw new Error(errorMessages('SanitizationServices.sanitizeDate._dateArray').WRONG_VALUE_TYPE.IT_TEXT)
    }

    let year = parseInt(_dateArray[2], 10);
    let month = parseInt(_dateArray[1], 10);
    let day = parseInt(_dateArray[0], 10);

    let sanitizedDate = new Date(year, month -1, day);
    if (isNaN(sanitizedDate.getTime())) {
      throw new Error('CRITICAL ERROR - SANITIZER FAILED FOR NO REASON WHATSOEVER')
    } else {
      if (
        sanitizedDate.getFullYear() === year &&
        sanitizedDate.getDate() === day &&
        sanitizedDate.getMonth() === (month-1)
      ) {
      return sanitizedDate;
      } else {
        throw new Error(errorMessages('SanitizationServices.sanitizeData.sanitizedDate').INVALID_DATE.IT_TEXT)
      }
    }
  }

  static sanitizeMoney(amount, uuid) {
    if (typeof amount === "number" && isFinite(amount)) {
      Logger.log('----');
      Logger.log(`import ${amount} from invoice ${uuid} already a number, returning`);
      Logger.log('----');
      return amount;
    }

    if (amount === null || amount == '') {
      Logger.log(`SanitizeMoney (for UUID: ${uuid}): Received empty/null value. Returning 0.`);
      return 0;
    }

    if (typeof amount != "string") {
      throw new Error(errorMessages(`SanitizeMoney for UUID: ${uuid}is NOT_STRING`).WRONG_VALUE_TYPE.IT_TEXT)
    }

    let rawAmount = amount.replace(/\./g, '');
    let trimmedAmount = rawAmount.replace(',','.');
    let sanitizedAmount = parseFloat(trimmedAmount);

    if (isNaN(sanitizedAmount) || !isFinite(sanitizedAmount)) {
      Logger.log(`SanitizeMoney (for UUID: ${uuid}): Failed to parse string to number. Original: "${rawAmount}", Cleaned attempt: "${sanitizedAmount}"`)
      throw new Error(errorMessages('SanitationServices.sanitizeMoney').IS_NAN_OR_INFINITE.IT_TEXT);
    }

    return sanitizedAmount
  }
}