import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import process from 'node:process'

// @ts-expect-error moduleResolution:nodenext issue 54523
import { intro } from '@clack/prompts'
import { options as koloristOptions } from 'kolorist'

import type { ProgramOptions } from '#app/program'
import { promptChoice, promptForSimpleValue, promptForToken } from '#app/prompts'
import checkVersion from '#app/check-version'

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

export const pkgObj = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf-8'))

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
  await fsPromises.mkdir(configDir, { recursive: true })
  await fsPromises.writeFile(configFilePath, JSON.stringify({}))
}

async function getConfigData(): Promise<Config> {
  try {
    await fsPromises.access(configFilePath)
  }
  catch {
    await createEmptyConfigFile()

    return {}
  }

  const configData = await fsPromises.readFile(configFilePath, 'utf-8')
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

  await fsPromises.writeFile(configFilePath, JSON.stringify(newConfig))
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
  if (!options.interactive) {
    return
  }

  if (!options.rate) {
    options.rate = await promptForSimpleValue<number>('How much do you make an hour for being on-call', {
      placeholder: '10',
      valueType: 'number',
    })

    await updateConfigField('rate', options.rate)
  }

  if (!options.schedule && !options.scheduleQuery) {
    const fetchMethod = await promptChoice('How would you like to fetch schedule?', [
      ['id', 'I know schedule ID'],
      ['query', 'I want to search by schedule name'],
    ])

    if (fetchMethod === 'id') {
      const scheduleId = await promptForSimpleValue(
        'Enter schedule ID',
        {
          placeholder: 'P123456',
        },
      )

      if (scheduleId) {
        options.schedule = scheduleId
        await updateConfigField('schedule', scheduleId)
      }
    }
    else if (fetchMethod === 'query') {
      const scheduleQuery = await promptForSimpleValue(
        'Enter query to search for schedule by name',
        {
          placeholder: 'My team\'s amazing schedule name',
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
  if (ENV_PAGERDUTY_TOKEN) {
    return null
  }

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

  if (options.cleanReport) {
    koloristOptions.enabled = false
  }

  if (isInteractive) {
    await checkVersion(pkgObj)

    intro(`${packageName}@${appVersion}`)
  }

  if (clearValue === true) {
    await fsPromises.rm(configFilePath).catch(() => {})
  }

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

    if (typeof clearValue === 'string' && (<ExtendableOptions>optionsMap)[clearValue]) {
      configStoredData[(<ExtendableOptions>optionsMap)[clearValue]] = null
    }

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
    if (err instanceof Error) {
      throw new TypeError(err.message, { cause: err })
    }

    throw err
  }
}
