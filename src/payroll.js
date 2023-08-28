import process from 'node:process'

import {
  differenceInCalendarDays,
  differenceInHours,
  eachDayOfInterval,
  formatISO,
  isSameDay,
  isSameMonth,
  isWeekend,
  max,
  min,
  parseISO,
} from 'date-fns'
import { parsePayrollDetailDates } from '#app/date-utils'

export function getDaysOfOnCall(onCalls, firstDayInMonth) {
  const days = new Set()

  onCalls.forEach(({ start, end }) => {
    const startDate = parseISO(start)
    const endDate = parseISO(end)

    const daysInInterval = eachDayOfInterval({
      start: startDate,
      end: endDate,
    })

    daysInInterval
      .filter((day) => {
        if (daysInInterval.length > 1 && isSameDay(day, endDate))
          return false

        return isSameMonth(day, firstDayInMonth)
      })
      .forEach((day) => {
        const formattedDay = formatISO(day)
        const weekend = isWeekend(day)

        days.add({
          date: formattedDay,
          weekend,
        })
      })
  })

  return Array.from(days)
}

export function getSimplePayroll(onCalls, { firstDayOfMonth, rate }) {
  const daysOnCall = getDaysOfOnCall(onCalls, firstDayOfMonth)

  const weekDays = daysOnCall.filter(({ weekend }) => !weekend)
  const weekEnds = daysOnCall.filter(({ weekend }) => weekend)

  const weekDaysLength = weekDays.length
  const weekEndsLength = weekEnds.length

  const detail = {
    weekDays: {
      days: weekDaysLength,
      hours: weekDaysLength * 16,
      total: weekDaysLength * 16 * rate,
    },
    weekEnds: {
      days: weekEndsLength,
      hours: weekEndsLength * 24,
      total: weekEndsLength * 24 * rate,
    },
  }

  return {
    days: detail.weekDays.days + detail.weekEnds.days,
    hours: detail.weekDays.hours + detail.weekEnds.hours,
    total: detail.weekDays.total + detail.weekEnds.total,
    detail,
    detailRows: daysOnCall,
  }
}

export function getDetailedPayroll(
  onCalls,
  { firstDayOfMonth, lastDayOfMonth, rate },
) {
  const data = {
    total: 0,
    days: 0,
    hours: 0,
    detailRows: [],
  }

  onCalls
    .filter(({ start, end }) => {
      return (
        isSameMonth(parseISO(start), firstDayOfMonth)
        || isSameMonth(parseISO(end), firstDayOfMonth)
      )
    })
    .forEach(({ start, end }, index, arr) => {
      const isLastIteration = index === arr.length - 1

      const startDate = max([parseISO(start), firstDayOfMonth])
      const endDate = min([parseISO(end), lastDayOfMonth])

      const hours = differenceInHours(endDate, startDate)
      const days
        = differenceInCalendarDays(endDate, startDate)
        || (isLastIteration ? 1 : 0)

      data.total += hours * rate
      data.days += days
      data.hours += hours

      data.detailRows.push({
        start: formatISO(startDate),
        end: formatISO(endDate),
        hours,
        days,
      })
    })

  return data
}

export function generatePayroll(onCalls, options) {
  const {
    firstDayOfMonth,
    lastDayOfMonth,
    rate,
    detailed: isDetailed,
  } = options

  if (isDetailed) {
    return getDetailedPayroll(onCalls, {
      firstDayOfMonth,
      lastDayOfMonth,
      rate,
    })
  }

  return getSimplePayroll(onCalls, { firstDayOfMonth, rate })
}

export function printOncallReport({ meta, payroll, options }) {
  const { json: isJSONOutput, detailed: isDetailedReport } = options

  if (isJSONOutput) {
    process.stdout.write(
      JSON.stringify({
        meta,
        payroll,
      }),
    )
    process.exit(0)
  }

  const { date, user, schedule, rate } = meta

  const { detail, detailRows, ...restPayroll } = payroll

  const SEPARATOR = '------- ------- -------'

  /* eslint-disable no-console */
  console.log(
    `Report for ${date.year}-${date.month.toString().padStart(2, '0')}`,
  )
  console.log(`User: ${user.name} [id: ${user.id}]`)
  console.log(`Schedule: ${schedule.name} [id: ${schedule.id}]`)
  console.log(`          ${schedule.html_url}`)
  console.log(SEPARATOR)
  console.log(`     Rate: ${rate.toFixed(2)}`)
  console.log(`Total sum: ${restPayroll.total.toFixed(2)}`)
  console.log(SEPARATOR)

  console.table(restPayroll)

  if (detail)
    console.table(detail)

  if (detailRows)
    console.table(parsePayrollDetailDates(detailRows, isDetailedReport))
}
