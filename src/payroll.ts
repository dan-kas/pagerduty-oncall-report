import process from 'node:process'

import {
  eachDayOfInterval,
  formatISO,
  isSameDay,
  isSameMonth,
  isWeekend,
  parseISO,
} from 'date-fns'

import type { ProgramOptions } from '#app/program'
import { parsePayrollDetailDates } from '#app/date-utils'

interface ActionOptions {
  firstDayOfMonth?: Date
  lastDayOfMonth?: Date
  rate?: number
}

export function getDaysOfOnCall(onCalls: any[], firstDayInMonth?: Date) {
  const days: { date: string; weekend: boolean }[] = []

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

        return firstDayInMonth instanceof Date && isSameMonth(day, firstDayInMonth)
      })
      .forEach((day) => {
        const formattedDay = formatISO(day)
        const weekend = isWeekend(day)

        days.push({
          date: formattedDay,
          weekend,
        })
      })
  })

  return days
}

export function getSimplePayroll(onCalls: any[], { firstDayOfMonth, rate = 1 }: ActionOptions) {
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

export function generatePayroll(onCalls: any[], options: ActionOptions) {
  const {
    firstDayOfMonth,
    rate,
  } = options

  return getSimplePayroll(onCalls, { firstDayOfMonth, rate })
}

export function printOncallReport({ meta, payroll }: any, options: ProgramOptions) {
  const { json: isJSONOutput } = options

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
    console.table(parsePayrollDetailDates(detailRows))
}
