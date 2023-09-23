import process from 'node:process'

// @ts-expect-error moduleResolution:nodenext issue 54523
import { cancel, isCancel, password, select, text } from '@clack/prompts'

interface PromptChoicesOptions {
  required?: boolean
}

type PromptChoiceReturnType<T, O> = O extends { required: true } ?
  T :
  T | null

export async function promptForToken() {
  const token = await promptForSimpleValue(
    'Please enter your PagerDuty token',
    {
      isSecret: true,
    },
  )

  return token
}

export async function promptChoice<T extends string | number, O extends PromptChoicesOptions>(
  message: string,
  choices: [value: T, label: string][],
  options: O = {} as O,
): Promise<PromptChoiceReturnType<T, O>> {
  const { required = false } = options

  const value = await select({
    message,
    options: choices.map(([value, label]) => ({
      value,
      label,
    })),
  })

  if (isCancel(value)) {
    cancel()

    if (required === true) {
      process.exit(1)
    }

    return null as PromptChoiceReturnType<T, O>
  }

  return value as T
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
      if (valueType === 'number' && Number.isNaN(value)) {
        return 'Please enter a number'
      }

      if (required && !value) {
        return 'Value is required'
      }
    },
  })

  if (isCancel(value)) {
    cancel()

    if (required) {
      process.exit(1)
    }

    return
  }

  if (valueType === 'number') {
    return Number.parseInt(value) as T
  }

  return value as T
}
