import {
  addDays,
  endOfDay,
  endOfMonth,
  format,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns'

export function getFirstDayOfMonth(year, month) {
  return startOfDay(startOfMonth(new Date(year, month - 1)))
}
export function getLastDayOfMonth(year, month) {
  return endOfDay(endOfMonth(new Date(year, month - 1)))
}

export function getSinceDate(year, month) {
  return subDays(getFirstDayOfMonth(year, month), 1)
}
export function getUntilDate(year, month) {
  return addDays(getLastDayOfMonth(year, month), 1)
}

export function getHumanReadableDateTime(date, withTime = true) {
  const datePattern = 'dd/MM/yyyy'
  const timePattern = 'HH:mm'

  return format(date, `${datePattern}${withTime ? ` ${timePattern}` : ''}`)
}

export function parsePayrollDetailDates(rows, withTime) {
  return rows.map((row) => {
    for (const field in row) {
      const parsedField = parseISO(row[field])

      if (isValid(parsedField))
        row[field] = getHumanReadableDateTime(parsedField, withTime)
    }

    return row
  })
}
