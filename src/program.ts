import process from 'node:process'

import { Argument, Command, InvalidArgumentError, Option } from '@commander-js/extra-typings'

import logger from '#app/logger'
import { appVersion, packageBin } from '#app/setup'

function dateArgParser(value: string) {
  const pattern = /(?<month>\d{1,2})(?:[-/](?<year>\d{4}))?/

  const match = value.match(pattern)

  if (!match) {
    throw new InvalidArgumentError(
      `\nInvalid date format.\nMust match pattern: ${pattern}`,
    )
  }

  const { year, month } = match.groups ?? {}

  return {
    year: year ? Number.parseInt(year, 10) : null,
    month: month ? Number.parseInt(month, 10) || 1 : null,
  }
}

export const program = new Command()
  .name(packageBin)
  .version(appVersion)
  .description('Generate PagerDuty payroll for current or chosen month')
  .addHelpText('afterAll', '___')
  .addHelpText(
    'afterAll',
    '[1] Provided value will be persisted as default for future usage.',
  )
  .addArgument(
    new Argument(
      '<customDate>',
      'Custom date in YYYY-MM format. If not provided, current month is used.',
    )
      .argOptional()
      .argParser(dateArgParser),
  )
  .addOption(
    new Option('-c, --clear [field]', 'Clear config field or entire file')
      .default(false)
      .preset(true),
  )
  .addOption(
    new Option('-s, --schedule <schedule>', 'Schedule ID [1]').conflicts(
      'schedule-query',
    ),
  )
  .addOption(
    new Option(
      '--schedule-query <query>',
      'Schedule query, e.g. "FE"',
    ).conflicts('schedule'),
  )
  .addOption(new Option('-r, --rate <rate>', 'Flat rate [1]').argParser(Number.parseFloat))
  .addOption(
    new Option('--json', 'Raw JSON output').default(false).implies({
      interactive: false,
    }),
  )
  .addOption(new Option('-i, --interactive', 'Interactive mode').default(true))
  .addOption(new Option('--clean-report', 'Print report without colors'))

program.configureOutput({
  writeOut: (str) => {
    const options = program.opts()

    if (options.json) {
      process.stdout.write(str)
      return
    }

    logger.log(str)
  },
  writeErr: (str) => {
    const options = program.opts()

    if (options.json) {
      process.stderr.write(JSON.stringify({ error: str }))
      process.exit(1)
    }

    logger.error(str.replace(/^error: /i, ''))
  },
})

export type ProgramOptions = ReturnType<typeof program['opts']>
