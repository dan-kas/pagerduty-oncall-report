import process from 'node:process'

import { cancel, isCancel, password, text } from '@clack/prompts'

export async function promptForToken() {
  const token = await promptForSimpleValue(
    'Please enter your PagerDuty token',
    {
      isSecret: true,
    },
  )

  return token
}

export async function promptForSimpleValue<T = string>(
  message: string,
  { placeholder = '', isSecret = false, valueType = 'string', required = true } = {},
) {
  const prompt = isSecret ? password : text

  const value = await prompt({
    message,
    placeholder,
    validate: (value) => {
      if (valueType === 'number' && Number.isNaN(value))
        return 'Please enter a number'

      if (required && !value)
        return 'Value is required'
    },
  })

  if (isCancel(value)) {
    cancel()

    if (required)
      process.exit(1)

    return
  }

  if (valueType === 'number')
    return Number.parseInt(value) as T

  return value as T
}