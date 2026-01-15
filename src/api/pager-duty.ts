import process from 'node:process'

import { simpleFetch } from '#app/api/fetch'

type QueryParameterValue = string | number

interface RequestOptions {
  queryParameters?: Record<string, QueryParameterValue | QueryParameterValue[]>
}

async function getData(endpoint: string, options?: RequestOptions): Promise<Record<string, unknown>> {
  const apiUrl = new URL('https://api.pagerduty.com')

  if (options?.queryParameters) {
    apiUrl.search = Object.entries(options.queryParameters)
      .map(([key, value]) => `${key}=${value}`)
      .join('&')
  }

  apiUrl.pathname = endpoint

  const headers = {
    'Accept': 'application/vnd.pagerduty+json;version=2',
    'Content-Type': 'application/json',
    'Authorization': `Token token=${process.env.PAGERDUTY_TOKEN}`,
  }

  const data = await simpleFetch<Record<string, unknown>>(apiUrl, {
    headers,
  })

  return data
}

function handleErrorInData(data: any, ...args: string[]): void {
  const { error } = data
  if (error) {
    const reasons = error.errors?.join(', ')
    const reasonsMessage = reasons ? ` [ ${reasons} ]` : ''

    const argsStr = args.length ? ` (args: [ ${args.join(', ')} ])` : ''

    throw new Error(
      `[PD:${error.code}]${reasonsMessage} ${error.message}${argsStr}`,
    )
  }
}

function handlePagerDutyError(err: unknown, message: string): never {
  if (err instanceof Response) {
    throw new TypeError(`${message}: [${err.status}] ${err.statusText}`)
  }

  throw err
}

/**
 * @TODO improve type
 */
export async function getUser(): Promise<Record<string, any>> {
  try {
    const data = await getData('/users/me')

    handleErrorInData(data)

    return data.user as Record<string, any>
  }
  catch (err) {
    handlePagerDutyError(err, 'Error fetching user')
  }
}

/**
 * @TODO improve type
 */
export async function getSchedule(scheduleId: string): Promise<Record<string, any>> {
  try {
    const data = await getData(`/schedules/${scheduleId}`)

    handleErrorInData(data, `scheduleId: ${scheduleId}`)

    return data.schedule as Record<string, any>
  }
  catch (err) {
    handlePagerDutyError(err, 'Error fetching schedule')
  }
}

/**
 * @TODO improve type
 */
export async function findSchedule(query: string): Promise<Record<string, any>[]> {
  try {
    const data = await getData('/schedules', {
      queryParameters: {
        query,
      },
    })

    handleErrorInData(data, `query: ${query}`)

    return data.schedules as Record<string, any>[]
  }
  catch (err) {
    handlePagerDutyError(err, 'Error fetching schedules')
  }
}

export async function getOnCalls({ user, since, until, scheduleId }: {
  user: Record<string, any>
  since: string
  until: string
  scheduleId?: string
}): Promise<Record<string, any>[]> {
  try {
    const data = await getData('/oncalls', {
      queryParameters: {
        'user_ids[]': [user.id],
        since,
        until,
        ...(scheduleId ? { 'schedule_ids[]': [scheduleId] } : {}),
        'limit': '50',
      },
    })

    handleErrorInData(
      data,
      `user: ${user.id}`,
      `since: ${since}`,
      `until: ${until}`,
      `schedule: ${scheduleId}`,
    )

    return data.oncalls as Record<string, any>[]
  }
  catch (err) {
    handlePagerDutyError(err, 'Error fetching on-calls')
  }
}
