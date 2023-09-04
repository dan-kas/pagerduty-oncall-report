import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'
import process from 'node:process'

import updateNotifier from 'update-notifier'
import { intro } from '@clack/prompts'
import { options as koloristOptions } from 'kolorist'

import type { ProgramOptions } from '#app/program'
import { promptForSimpleValue, promptForToken } from '#app/prompts'

const ENV_PAGERDUTY_TOKEN = process.env.PAGERDUTY_TOKEN

type ExtendableRecord<T, P = unknown> = {
  [K in keyof T]: T[K]
} & {
  [K in string]: P
}

type Config = ExtendableRecord<{
  token?: string | null
  defaultRate?: number | null
  defaultSchedule?: string | null
}>

export const pkgObj = JSON.parse(
  await fs.readFile(new URL('../package.json', import.meta.url), 'utf-8'),
)

export const packageBin = Object.entries(pkgObj.bin)[0][0]
export const packageName = pkgObj.name.split('/')[1]
export const appVersion = pkgObj.version

export const configDir = path.join(os.homedir(), '.config', packageName)
export const configFilePath = path.join(configDir, 'config.json')

const optionsMap = {
  rate: 'defaultRate',
  schedule: 'defaultSchedule',
} satisfies Record<string, string>

type ExtendableOptions = ExtendableRecord<{
  [K in keyof typeof optionsMap]: typeof optionsMap[K]
}, string>

function isDefinedAndNotNull<T>(value: T): value is T {
  return typeof value !== 'undefined' && value !== null
}

async function createEmptyConfigFile() {
  await fs.mkdir(configDir, { recursive: true })
  await fs.writeFile(configFilePath, JSON.stringify({}))
}

async function getConfigData(): Promise<Config> {
  try {
    await fs.access(configFilePath)
  }
  catch {
    await createEmptyConfigFile()

    return {}
  }

  const configData = await fs.readFile(configFilePath, 'utf-8')
  const configJson = JSON.parse(configData)

  return configJson
}

function mergeConfig(config: Config, newConfig: Config) {
  return {
    ...config,
    ...newConfig,
  }
}

async function updateConfigFile(configValue = {}) {
  const config = await getConfigData()
  const newConfig = mergeConfig(config, configValue)

  await fs.writeFile(configFilePath, JSON.stringify(newConfig))
}

export async function updateConfigField(field: keyof typeof optionsMap, value: unknown) {
  const fieldName = optionsMap[field]

  const validValueTypes = ['string', 'number', 'boolean']
  const isValueValid = validValueTypes.includes(typeof value) || value === null

  if (fieldName && isValueValid) {
    await updateConfigFile({
      [fieldName]: value,
    })
  }
}

async function handleInteractiveOptionsPrompts(options: ProgramOptions) {
  if (!options.interactive)
    return

  if (!options.rate) {
    options.rate = await promptForSimpleValue<number>('Provide your hourly flat rate', {
      placeholder: '10',
      valueType: 'number',
    })

    await updateConfigField('rate', options.rate)
  }

  if (!options.schedule && !options.scheduleQuery) {
    const scheduleId = await promptForSimpleValue(
      'Provide schedule ID. If no value provided in next step you will be asked for query to search for schedule',
      {
        placeholder: 'P123456',
        required: false,
      },
    )

    if (scheduleId) {
      options.schedule = scheduleId
      await updateConfigField('schedule', scheduleId)
    }
    else {
      const scheduleQuery = await promptForSimpleValue(
        'Provide schedule query, e.g. "FE"',
        {
          placeholder: 'FE',
        },
      )

      options.scheduleQuery = scheduleQuery
    }
  }
}

function saveTokenToEnv(token: string) {
  process.env.PAGERDUTY_TOKEN = token
}

async function prepareToken(storedTokenValue: unknown, { clear, interactive }: Partial<ProgramOptions>) {
  if (ENV_PAGERDUTY_TOKEN)
    return null

  if (storedTokenValue && typeof storedTokenValue === 'string' && clear !== 'token') {
    saveTokenToEnv(storedTokenValue)

    return storedTokenValue
  }

  if (interactive) {
    const token = await promptForToken()
    saveTokenToEnv(token as string)

    return token
  }

  throw new Error('PagerDuty access token is required')
}

export async function setup(options: ExtendableRecord<ProgramOptions>) {
  const { clear: clearValue, interactive: isInteractive } = options

  if (options.cleanReport)
    koloristOptions.enabled = false

  if (isInteractive) {
    updateNotifier({ pkg: pkgObj }).notify({ defer: false })

    intro(`${packageName}@${appVersion}`)
  }

  if (clearValue === true)
    await fs.rm(configFilePath).catch(() => {})

  const config: Config = {
    token: null,
    defaultSchedule: null,
    defaultRate: null,
  }

  try {
    const configStoredData = await getConfigData()

    config.token = await prepareToken(configStoredData.token, {
      clear: clearValue,
      interactive: isInteractive,
    })

    if (typeof clearValue === 'string' && (<ExtendableOptions>optionsMap)[clearValue])
      configStoredData[(<ExtendableOptions>optionsMap)[clearValue]] = null

    for (const [option, configKey] of Object.entries(optionsMap)) {
      const configValue = configStoredData[configKey]
      const optionValue = options[option]

      if (typeof optionValue !== 'undefined') {
        config[configKey] = optionValue
      }
      else if (isDefinedAndNotNull(configValue)) {
        config[configKey] = configValue
        options[option] = configValue
      }
    }

    await updateConfigFile(config)

    await handleInteractiveOptionsPrompts(options)
  }
  catch (err) {
    if (err instanceof Error)
      throw new Error(err.message, { cause: err })

    throw err
  }
}
