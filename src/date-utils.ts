import {
  addDays,
  endOfDay,
  endOfMonth,
  format,
  isValid,
  parseISO,
  set,
  startOfDay,
  startOfMonth,
  subDays,
} from 'date-fns'

export function getFirstDayOfMonth(year: number, month: number) {
  return startOfDay(startOfMonth(new Date(year, month - 1)))
}
export function getLastDayOfMonth(year: number, month: number) {
  return endOfDay(endOfMonth(new Date(year, month - 1)))
}

export function getSinceDate(year: number, month: number) {
  return subDays(getFirstDayOfMonth(year, month), 1)
}
export function getUntilDate(year: number, month: number) {
  return addDays(getLastDayOfMonth(year, month), 1)
}

export function copyTimeFromDate(date: Date, referenceDate: Date) {
  return set(date, {
    hours: referenceDate.getHours(),
    minutes: referenceDate.getMinutes(),
    seconds: referenceDate.getSeconds(),
    milliseconds: referenceDate.getMilliseconds(),
  })
}

export function getHumanReadableDateTime(date: Date, withTime = true) {
  const datePattern = 'dd/MM/yyyy'
  const timePattern = 'HH:mm'

  return format(date, `${datePattern}${withTime ? ` ${timePattern}` : ''}`)
}

export function parsePayrollDetailDates(rows: any[]) {
  return rows.map((row) => {
    for (const field in row) {
      const parsedField = parseISO(row[field])

      if (isValid(parsedField))
        row[field] = getHumanReadableDateTime(parsedField)
    }

    return row
  })
}
