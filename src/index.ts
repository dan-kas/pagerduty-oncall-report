import process from 'node:process'
import { EOL } from 'node:os'

import { formatISO, getMonth, getYear } from 'date-fns'
import { spinner } from '@clack/prompts'
import { setup, updateConfigField } from '#app/setup'
import { findSchedule, getOnCalls, getSchedule, getUser } from '#app/api'
import {
  getSinceDate,
  getUntilDate,
} from '#app/date-utils'
import { getOnCallShifts, prepareOnCallReport } from '#app/oncalls'

import { program } from '#app/program'

program
  .action(async (customDate, options) => {
    await setup(options)

    const { interactive: isInteractive } = options

    if (!options.rate)
      program.error('Provide your hourly flat rate')

    if (!options.schedule && !options.scheduleQuery)
      program.error('Provide either schedule ID or schedule query')

    let spinnerInstance = null

    if (isInteractive) {
      spinnerInstance = spinner()
      spinnerInstance.start()
    }

    const now = new Date()

    const year = customDate?.year ?? getYear(now)
    const month = customDate?.month ?? getMonth(now) + 1

    const sinceDate = getSinceDate(year, month)
    const untilDate = getUntilDate(year, month)

    spinnerInstance?.message('Fetching user')

    let user = null

    try {
      user = await getUser()
    }
    catch (err) {
      if (err instanceof Error) {
        if (isInteractive) {
          spinnerInstance!.stop(err.message, 2)
          process.exit(1)
        }

        program.error(err.message)
      }

      throw err
    }

    spinnerInstance?.message('Fetching schedule')

    let schedule = null

    try {
      if (options.scheduleQuery) {
        const schedules = await findSchedule(options.scheduleQuery)

        if (!schedules.length) {
          throw new Error(
            `No schedules found for query "${options.scheduleQuery}"`,
          )
        }

        schedule = schedules[0]

        updateConfigField('schedule', schedule.id)
      }
      else if (options.schedule) {
        schedule = await getSchedule(options.schedule)
      }
    }
    catch (err) {
      if (err instanceof Error) {
        if (isInteractive) {
          spinnerInstance!.stop(err.message, 2)
          process.exit(1)
        }

        program.error(err.message)
      }

      throw err
    }

    spinnerInstance?.message('Fetching on-calls')

    const onCalls = await getOnCalls({
      user,
      since: formatISO(sinceDate),
      until: formatISO(untilDate),
      scheduleId: schedule.id,
    })

    if (!onCalls.length) {
      const failMessage = `No on-calls found for schedule ${
        schedule.id
      } for date ${year}-${month.toString().padStart(2, '0')}`

      if (isInteractive) {
        spinnerInstance!.stop(failMessage, 2)
        process.exit(1)
      }

      program.error(failMessage)
    }

    const meta = {
      date: {
        year,
        month,
      },
      user: {
        id: user.id,
        name: user.summary,
      },
      schedule: {
        id: schedule.id,
        name: schedule.summary,
        html_url: schedule.html_url,
      },
      rate: options.rate,
    }

    const onCallShifts = getOnCallShifts(onCalls, {
      year,
      month,
      rate: options.rate,
    })

    const report = prepareOnCallReport({ meta, onCallShifts }, options)

    spinnerInstance?.stop('Report generated')

    process.stdout.write(report + EOL)
    process.exit(0)
  })

try {
  await program.parseAsync(process.argv)
}
catch (err) {
  const opts = program.opts()

  let message = err as string

  if (err instanceof Error)
    message = err.message

  if (opts.json) {
    process.stderr.write(JSON.stringify({ error: message }))
    process.exit(1)
  }

  program.error(message)
}
