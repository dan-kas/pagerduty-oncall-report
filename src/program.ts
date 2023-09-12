import process from 'node:process'
import { EOL } from 'node:os'

import { Argument, Command, InvalidArgumentError, Option } from '@commander-js/extra-typings'

import { bgRed, bold, red, stripColors, white } from 'kolorist'
import { appVersion, packageBin } from '#app/setup'

function numberOrNull(value: string) {
  if (!value) {
    return null
  }

  return Number.parseInt(value, 10)
}

function dateArgParser(value: string) {
  const pattern = /(?<month>\d{1,2})(?:[-/](?<year>\d{4}))?/

  const match = value.match(pattern)

  if (!match) {
    throw new InvalidArgumentError(
      red(`Invalid date format. Must match pattern: ${pattern}`),
    )
  }

  const matchGroups = match.groups || {}

  const month = numberOrNull(matchGroups.month)
  const year = numberOrNull(matchGroups.year)

  if (typeof month === 'number' && (month < 1 || month > 12)) {
    throw new InvalidArgumentError(red('Month must be between 1 and 12'))
  }

  return {
    year,
    month,
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
  writeErr: (str) => {
    const options = program.opts()
    const pattern = new RegExp(`(^error: |${EOL}$)`, 'ig')
    const normalizedStr = str.replace(pattern, '')

    if (options.json) {
      process.stderr.write(JSON.stringify({ error: stripColors(normalizedStr) }))
      process.exit(1)
    }

    if (options.interactive) {
      const errorLabel = bgRed(white(bold(' >> Error << ')))
      process.stderr.write(`${errorLabel}${EOL.repeat(2)}`)
    }

    process.stderr.write(`${normalizedStr}${EOL}`)
    process.exit(1)
  },
})

export type ProgramOptions = ReturnType<typeof program['opts']>
