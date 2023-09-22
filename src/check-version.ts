import { EOL } from 'node:os'
import process from 'node:process'

import { green, red } from 'kolorist'
import fetch from 'cross-fetch'

async function tryUpdateNotifier(pkgObj: any) {
  try {
    const { default: updateNotifier } = await import('update-notifier')

    updateNotifier({ pkg: pkgObj }).notify({ defer: false })

    return true
  }
  catch {}

  return false
}

async function tryGitHubReleaseApi(pkgObj: any) {
  try {
    const repositoryUrlMatch = (<string>pkgObj.repository.url).match(/(?<protocol>https:\/\/)(?<domain>github\.com)\/(?<repository>[^\/]+\/[^\.\/]+)/)

    if (!repositoryUrlMatch) {
      return
    }

    const { protocol, domain, repository } = repositoryUrlMatch.groups ?? {}

    const apiUrl = `${protocol}api.${domain}/repos/${repository}/releases/latest`

    const response = await fetch(apiUrl, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    })
    const release = await response.json()

    if (!release) {
      return
    }

    const versionMatch = (<string>release.name).match(/^v(\d+\.\d+\.\d+)$/)

    if (!versionMatch) {
      return
    }

    const packageVersion = pkgObj.version
    const releaseVersion = versionMatch[1]
    const isLatest = releaseVersion === packageVersion

    if (!isLatest) {
      process.stdout.write(`| 🆕 New version available${EOL}`)
      process.stdout.write(`| ${red(packageVersion)} ==> ${green(releaseVersion)}${EOL}`)
      process.stdout.write(`| @see ${release.html_url}${EOL}`)
      process.stdout.write(EOL)
    }
  }
  catch {}
}

export default async function checkVersion(pkgObj: any) {
  const isUpdateNotifierAvailable = await tryUpdateNotifier(pkgObj)

  if (isUpdateNotifierAvailable) {
    return
  }

  await tryGitHubReleaseApi(pkgObj)
}
