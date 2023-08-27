import process from "node:process";

import { program, InvalidArgumentError, Argument, Option } from "commander";
import { formatISO, getMonth, getYear } from "date-fns";
import { spinner } from "@clack/prompts";

import logger from "#app/logger";
import { setup, packageBin, updateConfigField } from "#app/setup";
import { getUser, getOnCalls, findSchedule, getSchedule } from "#app/api";
import {
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getSinceDate,
  getUntilDate,
} from "#app/date-utils";
import { generatePayroll, printOncallReport } from "#app/payroll";

function dateArgParser(value) {
  const pattern = /(?<month>\d{1,2})(?:[-/](?<year>\d{4}))?/;

  const match = value.match(pattern);

  if (!match) {
    throw new InvalidArgumentError(
      `\nInvalid date format.\nMust match pattern: ${pattern}`
    );
  }

  const { year, month } = match.groups;

  return {
    year: year ? parseInt(year, 10) : null,
    month: month ? parseInt(month, 10) || 1 : null,
  };
}

program
  .name(packageBin)
  .description("Generate PagerDuty payroll for current or chosen month")
  .addHelpText("afterAll", "___")
  .addHelpText(
    "afterAll",
    "[1] Provided value will be persisted as default for future usage."
  )
  .addArgument(
    new Argument(
      "<customDate>",
      "Custom date in YYYY-MM format. If not provided, current month is used."
    )
      .argOptional()
      .argParser(dateArgParser)
  )
  .addOption(
    new Option("-c, --clear [field]", "Clear config field or entire file")
      .default(false)
      .preset(true)
  )
  .addOption(
    new Option("-s, --schedule <schedule>", "Schedule ID [1]").conflicts(
      "schedule-query"
    )
  )
  .addOption(
    new Option(
      "--schedule-query <query>",
      'Schedule query, e.g. "FE"'
    ).conflicts("schedule")
  )
  .option("-r, --rate <rate>", "Flat rate [1]", parseFloat)
  .option(
    "--detailed",
    "Hourly payroll that counts every hour of being on-call in a schedule [unofficial]",
    false
  )
  .option("--json", "Raw JSON output", false)
  .addOption(
    new Option("--json", "Raw JSON output", false).implies({
      interactive: false,
    })
  )
  .option("-i, --interactive", "Interactive mode", true)
  .action(async (customDate, options) => {
    await setup(options);

    const { interactive: isInteractive } = options;

    if (!options.rate) {
      program.error("Provide your hourly flat rate");
    }

    if (!options.schedule && !options.scheduleQuery) {
      program.error("Provide either schedule ID or schedule query");
    }

    let spinnerInstance = null;

    if (isInteractive) {
      spinnerInstance = spinner();
      spinnerInstance.start();
    }

    const now = new Date();

    const year = customDate?.year ?? getYear(now);
    const month = customDate?.month ?? getMonth(now);

    const sinceDate = getSinceDate(year, month);
    const untilDate = getUntilDate(year, month);

    const firstDayOfMonth = getFirstDayOfMonth(year, month);
    const lastDayOfMonth = getLastDayOfMonth(year, month);

    spinnerInstance?.message("Fetching user");

    let user = null;

    try {
      user = await getUser();
    } catch (err) {
      if (isInteractive) {
        spinnerInstance?.stop(err.message, 2);
        process.exit(1);
      }

      program.error(err.message);
    }

    spinnerInstance?.message("Fetching schedule");

    let schedule = null;

    try {
      if (options.scheduleQuery) {
        const schedules = await findSchedule({
          query: options.scheduleQuery,
        });

        if (!schedules.length) {
          throw new Error(
            `No schedules found for query "${options.scheduleQuery}"`
          );
        }

        schedule = schedules[0];

        updateConfigField("schedule", schedule.id);
      } else if (options.schedule) {
        schedule = await getSchedule({
          scheduleId: options.schedule,
        });
      }
    } catch (err) {
      if (isInteractive) {
        spinnerInstance?.stop(err.message, 2);
        process.exit(1);
      }

      program.error(err.message);
    }

    spinnerInstance?.message("Fetching on-calls");

    const onCalls = await getOnCalls({
      user,
      since: formatISO(sinceDate),
      until: formatISO(untilDate),
      scheduleId: schedule.id,
    });

    if (!onCalls.length) {
      const failMessage = `No on-calls found for schedule ${
        schedule.id
      } for date ${year}-${month.toString().padStart(2, "0")}`;

      if (isInteractive) {
        spinnerInstance.stop(failMessage, 2);
        process.exit(1);
      }

      program.error(failMessage);
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
    };

    const payroll = generatePayroll(onCalls, {
      firstDayOfMonth,
      lastDayOfMonth,
      rate: options.rate,
    });

    spinnerInstance?.stop("Report generated");

    printOncallReport({
      meta,
      payroll,
      options,
    });
  });

program.configureOutput({
  writeOut: (str) => {
    const options = program.opts();

    if (options.json) {
      process.stdout.write(str);
      return;
    }

    logger.info(str);
  },
  writeErr: (str) => {
    const options = program.opts();

    if (options.json) {
      process.stderr.write(JSON.stringify({ error: str }));
      process.exit(1);
    }

    logger.error(str.replace(/^error: /i, ""))
  },
});

try {
  await program.parseAsync(process.argv);
} catch (err) {
  const opts = program.opts();

  if (opts.json) {
    process.stderr.write(JSON.stringify({ error: err.message }));
    process.exit(1);
  }

  program.error(err.message);
}
