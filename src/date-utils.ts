import {
  addDays,
  endOfDay,
  endOfMonth,
  format,
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
  let formatPattern = 'dd/MM/yyyy'
  if (withTime)
    formatPattern = `${formatPattern} HH:mm`

  return format(date, formatPattern)
}
