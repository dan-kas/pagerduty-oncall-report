# pagerduty-oncall-report

[![NPM version](https://img.shields.io/npm/v/@dan-kas/pd-oncall?color=374151&label=@dan-kas/pd-oncall)](https://github.com/dan-kas/pagerduty-oncall-report) 
[![code style](https://antfu.me/badge-code-style.svg)](https://github.com/antfu/eslint-config)

Generate PagerDuty payroll for current month or specified date.

## Features:

- Generate report for PagerDuty oncall in a single month
- Enter custom flat rate
- Interactive configuration
- Output to json

## Installation

```sh
npm install -g @dan-kas/pd-oncall
```

## Usage: 

By default you will be prompted for PagerDuty token, which is required for API calls. Provided token is then stored in config file in your homedir. If you prefer not to store this token in homedir, you can pass token each time like this: `PAGERDUTY_TOKEN=<token> pd-oncall` or set env `PAGERDUTY_TOKEN` globally

---

Generate report for current month with interactive prompts:

```bash
pd-oncall
```

To generate report for different month provide argument with desired date:

```bash
# just month
pd-oncall 5

# or with year
pd-oncall 5/2022
```

Using `--json` flag disables interactivity and requires all arguments to be passed, unless previously set through interactive mode. Every consecutive usage uses previous configuration by default.

---

#### `--help` output
```
Usage: pd-oncall [options] [customDate]

Generate PagerDuty payroll for current or chosen month

Arguments:
  customDate                 Custom date in YYYY-MM format. If not provided, current month is used.

Options:
  -c, --clear [field]        Clear config field or entire file (default: false, preset: true)
  -s, --schedule <schedule>  Schedule ID [1]
  --schedule-query <query>   Schedule query, e.g. "FE"
  -r, --rate <rate>          Flat rate [1]
  --json                     Raw JSON output
  -i, --interactive          Interactive mode (default: true)
  -h, --help                 display help for command

___

[1] Provided value will be persisted as default for future usage.
```