import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { parseISO } from 'date-fns'

import { getOnCallShifts, isValidShift } from '#app/oncalls'

const factoryDate = (date: string) => parseISO(date)

function factoryShiftInput(startDate: string,
  endDate: string) {
  return {
    start: startDate,
    end: endDate,
  }
}

describe('isValidShift', () => {
  const year = 2022
  const month = 0

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month, 31, 23, 59, 59)

  test.each([
    {
      input: factoryShiftInput('2022-01-01 09:00', '2022-01-02 17:00'),
      result: true,
    },
    {
      input: factoryShiftInput('2022-01-01 00:00', '2022-01-31 23:59:59'),
      result: true,
    },
    {
      input: factoryShiftInput('2021-12-31 17:00', '2022-01-02 17:00'),
      result: true,
    },
    {
      input: factoryShiftInput('2022-01-31 09:00', '2022-02-01 09:00'),
      result: true,
    },
    {
      input: factoryShiftInput('2021-12-31 20:00', '2022-01-01 09:00'),
      result: false,
    },
    {
      input: factoryShiftInput('2021-12-30 09:00', '2021-12-31 22:00'),
      result: false,
    },
    {
      input: factoryShiftInput('2022-02-01 09:00', '2022-02-02 21:00'),
      result: false,
    },
  ])('[case %#] passing range $input.start - $input.end should return $result', ({ input, result }) => {
    expect(isValidShift(input, { firstDayOfMonth, lastDayOfMonth })).toBe(result)
  })
})

describe('getOnCallShifts', () => {
  const year = 2022
  const month = 1
  const rate = 17

  const factoryShiftOutput = (
    startDate: string,
    endDate: string,
    daysInShift: number,
    hoursInShift: number,
  ) => ({
    start: factoryDate(startDate),
    end: factoryDate(endDate),
    daysInShift,
    hoursInShift,
    shiftBill: hoursInShift * rate,
  })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2022, 0, 15, 0, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test.each([
    {
      descriptor: 'one shift',
      input: [
        factoryShiftInput('2021-12-28 17:00', '2021-12-31 09:00'),
        factoryShiftInput('2022-01-02 17:00', '2022-01-03 09:00'),
      ],
      output: {
        days: 1,
        hours: 16,
        shifts: [
          factoryShiftOutput('2022-01-02 17:00', '2022-01-03 09:00', 1, 16),
        ],
      },
    },
    {
      descriptor: 'one shift [no DST]',
      currentTime: new Date(2023, 9, 15, 0, 0, 0),
      input: [
        factoryShiftInput('2023-10-27 17:00', '2023-10-28 09:00'),
      ],
      output: {
        days: 1,
        hours: 16,
        shifts: [
          factoryShiftOutput('2023-10-27 17:00', '2023-10-28 09:00', 1, 16),
        ],
      },
    },
    {
      descriptor: 'one shift [DST off]',
      currentTime: new Date(2023, 9, 15, 0, 0, 0),
      input: [
        factoryShiftInput('2023-10-28 17:00', '2023-10-29 09:00'),
      ],
      output: {
        days: 1,
        hours: 17,
        shifts: [
          factoryShiftOutput('2023-10-28 17:00', '2023-10-29 09:00', 1, 17),
        ],
      },
    },
    {
      descriptor: 'one shift [DST on]',
      currentTime: new Date(2023, 2, 15, 0, 0, 0),
      input: [
        factoryShiftInput('2023-03-25 17:00', '2023-03-26 09:00'),
      ],
      output: {
        days: 1,
        hours: 15,
        shifts: [
          factoryShiftOutput('2023-03-25 17:00', '2023-03-26 09:00', 1, 15),
        ],
      },
    },
    {
      descriptor: 'one shift with overlap from previous month\'s shift',
      input: [
        factoryShiftInput('2021-12-30 17:00', '2022-01-02 09:00'),
      ],
      output: {
        days: 1,
        hours: 24,
        shifts: [
          factoryShiftOutput('2022-01-01 09:00', '2022-01-02 09:00', 1, 24),
        ],
      },
    },
    {
      descriptor: 'one shift ending in next month',
      input: [
        factoryShiftInput('2022-01-31 15:00', '2022-02-03 08:00'),
      ],
      output: {
        days: 1,
        hours: 17,
        shifts: [
          factoryShiftOutput('2022-01-31 15:00', '2022-02-01 08:00', 1, 17),
        ],
      },
    },
    {
      descriptor: 'two shift overlapping adjacent months',
      input: [
        factoryShiftInput('2021-12-29 17:00', '2022-01-02 09:00'),
        factoryShiftInput('2022-01-31 17:00', '2022-02-03 09:00'),
      ],
      output: {
        days: 2,
        hours: 40,
        shifts: [
          factoryShiftOutput('2022-01-01 09:00', '2022-01-02 09:00', 1, 24),
          factoryShiftOutput('2022-01-31 17:00', '2022-02-01 09:00', 1, 16),
        ],
      },
    },
    {
      descriptor: 'no shifts',
      input: [],
      output: {
        days: 0,
        hours: 0,
        shifts: [],
      },
    },
  ])('[case %#] should return $descriptor', ({ input, output, currentTime }) => {
    let yearToSet = year
    let monthToSet = month

    if (currentTime) {
      vi.setSystemTime(currentTime)

      yearToSet = currentTime.getFullYear()
      monthToSet = currentTime.getMonth() + 1
    }

    const shifts = getOnCallShifts(input, { month: monthToSet, year: yearToSet, rate })

    expect(shifts.totalDays).toEqual(output.days)
    expect(shifts.totalHours).toEqual(output.hours)
    expect(shifts.shifts).toEqual(output.shifts)
  })
})
