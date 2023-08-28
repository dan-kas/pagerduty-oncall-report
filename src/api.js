import process from 'node:process'

import { api } from '@pagerduty/pdjs'

let pdInst = null

function pd() {
  if (pdInst === null) {
    pdInst = api({
      token: process.env.PAGERDUTY_TOKEN,
      tokenType: 'token',
    })
  }

  return pdInst
}

function handleErrorInData(data, ...args) {
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

function handlePagerDutyError(err, message) {
  if (err.status && err.statusText)
    throw new Error(`${message}: [${err.status}] ${err.statusText}`)

  throw new Error(err)
}

export async function getUser() {
  try {
    const { data } = await pd().get('/users/me')

    handleErrorInData(data)

    return data.user
  }
  catch (err) {
    handlePagerDutyError(err, 'Error fetching user')
  }
}

export async function getSchedule({ scheduleId }) {
  try {
    const { data } = await pd().get(`/schedules/${scheduleId}`)

    handleErrorInData(data, `scheduleId: ${scheduleId}`)

    return data.schedule
  }
  catch (err) {
    handlePagerDutyError(err, 'Error fetching schedule')
  }
}

export async function findSchedule({ query }) {
  try {
    const { data } = await pd().get('/schedules', {
      queryParameters: {
        query,
      },
    })

    handleErrorInData(data, `query: ${query}`)

    return data.schedules
  }
  catch (err) {
    handlePagerDutyError(err, 'Error fetching schedules')
  }
}

export async function getOnCalls({ user, since, until, scheduleId }) {
  try {
    const { data } = await pd().get('/oncalls', {
      queryParameters: {
        'user_ids[]': [user.id],
        since,
        until,
        ...(scheduleId ? { 'schedule_ids[]': [scheduleId] } : {}),
        'limit': 50,
      },
    })

    handleErrorInData(
      data,
      `user: ${user.id}`,
      `since: ${since}`,
      `until: ${until}`,
      `schedule: ${scheduleId}`,
    )

    return data.oncalls
  }
  catch (err) {
    handlePagerDutyError(err, 'Error fetching on-calls')
  }
}
