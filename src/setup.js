import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'
import process from 'node:process'

import { intro } from '@clack/prompts'
import { promptForSimpleValue, promptForToken } from '#app/prompts'

const ENV_PAGERDUTY_TOKEN = process.env.PAGERDUTY_TOKEN

export const pkgObj = JSON.parse(
  await fs.readFile(new URL('../package.json', import.meta.url)),
)

export const packageBin = Object.entries(pkgObj.bin)[0][0]
export const packageName = pkgObj.name

export const configDir = path.join(os.homedir(), '.config', packageName)
export const configFilePath = path.join(configDir, 'config.json')

const optionsMap = {
  rate: 'defaultRate',
  schedule: 'defaultSchedule',
}

function isDefinedAndNotNull(value) {
  return typeof value !== 'undefined' && value !== null
}

async function createEmptyConfigFile() {
  await fs.mkdir(configDir, { recursive: true })
  await fs.writeFile(configFilePath, JSON.stringify({}))
}

async function getConfigData() {
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

function mergeConfig(config, newConfig) {
  for (const [key, value] of Object.entries(newConfig))
    config[key] = value

  return config
}

async function updateConfigFile(configValue = {}) {
  const config = await getConfigData()
  const newConfig = mergeConfig(config, configValue)

  await fs.writeFile(configFilePath, JSON.stringify(newConfig))
}

export async function updateConfigField(field, value) {
  const fieldName = optionsMap[field]

  const validValueTypes = ['string', 'number', 'boolean']
  const isValueValid = validValueTypes.includes(typeof value) || value === null

  if (fieldName && isValueValid) {
    await updateConfigFile({
      [fieldName]: value,
    })
  }
}

async function handleInteractiveOptionsPrompts(options) {
  if (!options.interactive)
    return

  if (!options.rate) {
    options.rate = await promptForSimpleValue('Provide your hourly flat rate', {
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

function saveTokenToEnv(token) {
  process.env.PAGERDUTY_TOKEN = token
}

async function prepareToken(storedTokenValue, { clearValue, isInteractive }) {
  if (ENV_PAGERDUTY_TOKEN)
    return null

  if (storedTokenValue && clearValue !== 'token') {
    saveTokenToEnv(storedTokenValue)

    return storedTokenValue
  }

  if (isInteractive) {
    const token = await promptForToken()
    saveTokenToEnv(token)

    return token
  }

  throw new Error('PagerDuty access token is required')
}

export async function setup(options) {
  const { clear: clearValue, interactive: isInteractive } = options

  if (isInteractive)
    intro(packageName)

  if (clearValue === true)
    await fs.rm(configFilePath).catch(() => {})

  const config = {
    token: null,
    defaultSchedule: null,
    defaultRate: null,
  }

  try {
    const configStoredData = await getConfigData()

    config.token = await prepareToken(configStoredData.token, {
      clearValue,
      isInteractive,
    })

    if (typeof clearValue === 'string' && optionsMap[clearValue])
      configStoredData[optionsMap[clearValue]] = null

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
    throw new Error(err?.message || 'Unknown error in setup', { cause: err })
  }
}
