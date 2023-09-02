import { EOL } from 'node:os'

import {
  addDays,
  differenceInDays,
  differenceInHours,
  isSameDay,
  parseISO,
} from 'date-fns'

import type { ProgramOptions } from '#app/program'
import { copyTimeFromDate, getFirstDayOfMonth, getHumanReadableDateTime, getLastDayOfMonth } from '#app/date-utils'

interface ActionOptions {
  year: number
  month: number
  rate?: number
}

interface OnCallEntry {
  [key: string]: unknown
  start: string
  end: string
}

type OnCallCollection = OnCallEntry[]

type OnCallShifts = ReturnType<typeof getOnCallShifts>

interface OnCallShiftsOutput {
  onCallShifts: OnCallShifts
  meta: Record<string, any>
}

export function isValidShift(
  { start, end }: OnCallEntry,
  { firstDayOfMonth, lastDayOfMonth }: {
    firstDayOfMonth: Date
    lastDayOfMonth: Date
  },
) {
  const startDate = parseISO(start)
  const endDate = parseISO(end)

  if (
    startDate > endDate
      || isSameDay(endDate, firstDayOfMonth)
      || (startDate < firstDayOfMonth && endDate < firstDayOfMonth)
      || startDate > lastDayOfMonth
  )
    return false

  return true
}

export function getOnCallShifts(onCalls: OnCallCollection, { year, month, rate = 1 }: ActionOptions) {
  const firstDayOfMonth = getFirstDayOfMonth(year, month)
  const lastDayOfMonth = getLastDayOfMonth(year, month)

  const onCallShifts: {
    start: Date
    end: Date
    hoursInShift: number
    daysInShift: number
    shiftBill: number
  }[] = []

  let totalDays = 0
  let totalHours = 0
  let bill = 0

  onCalls
    .filter(onCallEntry => isValidShift(onCallEntry, { firstDayOfMonth, lastDayOfMonth }))
    .forEach(({ start, end }) => {
      let startDate = parseISO(start)
      let endDate = parseISO(end)

      if (startDate < firstDayOfMonth)
        startDate = copyTimeFromDate(firstDayOfMonth, endDate)

      if (endDate > lastDayOfMonth)
        endDate = addDays(copyTimeFromDate(lastDayOfMonth, endDate), 1)

      const hoursInShift = differenceInHours(endDate, startDate)
      const daysInShift = differenceInDays(endDate, startDate) || 1
      const shiftBill = hoursInShift * rate

      onCallShifts.push({
        start: startDate,
        end: endDate,
        hoursInShift,
        daysInShift,
        shiftBill,
      })

      totalHours += hoursInShift
      totalDays += daysInShift
      bill += shiftBill
    })

  return {
    totalDays,
    totalHours,
    bill,
    shifts: onCallShifts,
  }
}

export function prepareOnCallReport({ meta, onCallShifts }: OnCallShiftsOutput, options: ProgramOptions) {
  const { date, user, schedule, rate } = meta
  const { shifts, bill, totalDays, totalHours } = onCallShifts

  if (options.json) {
    return JSON.stringify({
      ...meta,
      shifts,
      bill,
      totalDays,
      totalHours,
    })
  }

  const reportDate = `${date.year}-${date.month.toString().padStart(2, '0')}`

  return `
Report for ${reportDate}
      User: ${user.name} [id: ${user.id}]
  Schedule: ${schedule.name} [id: ${schedule.id}]
            ${schedule.html_url}
------- ------- -------
     Shifts: ${shifts.length}
       Days: ${totalDays}
      Hours: ${totalHours}
------- ------- -------
       Rate: ${rate.toFixed(2)}
  Total sum: ${bill.toFixed(2)}
------- ------- -------

${shifts?.reduce((previousValue, shift) => {
  const shiftStart = getHumanReadableDateTime(shift.start)
  const shiftEnd = getHumanReadableDateTime(shift.end)
  const shiftDateRange = `${shiftStart} - ${shiftEnd}`

  const daysLabel = shift.daysInShift > 1 ? `${shift.daysInShift} days` : '1 day'
  const hoursLabel = shift.hoursInShift > 1 ? `${shift.hoursInShift} hours` : '1 hour'

  return previousValue.concat(`${shiftDateRange} (${daysLabel}, ${hoursLabel}) - ${shift.shiftBill.toFixed(2)}${EOL}`)
}, '') ?? ''}`.replace(/^\n/, '')
}
