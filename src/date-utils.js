import {
  addDays,
  endOfDay,
  endOfMonth,
  format,
  isDate,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns";

export const getFirstDayOfMonth = (year, month) =>
  startOfDay(startOfMonth(new Date(year, month - 1)));
export const getLastDayOfMonth = (year, month) =>
  endOfDay(endOfMonth(new Date(year, month - 1)));

export const getSinceDate = (year, month) =>
  subDays(getFirstDayOfMonth(year, month), 1);
export const getUntilDate = (year, month) =>
  addDays(getLastDayOfMonth(year, month), 1);

export const getHumanReadableDateTime = (date, withTime = true) => {
  const datePattern = 'dd/MM/yyyy'
  const timePattern = 'HH:mm'

  return format(date, `${datePattern}${withTime ? ` ${timePattern}` : ''}`);
}

export const parsePayrollDetailDates = (rows, withTime) => {
  return rows.map((row) => {
    for (const field in row) {
      const parsedField = parseISO(row[field]);

      if (isValid(parsedField)) {
        row[field] = getHumanReadableDateTime(parsedField, withTime);
      }
    }

    return row;
  });
};
