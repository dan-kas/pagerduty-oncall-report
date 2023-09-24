import { EOL } from 'node:os'
import process from 'node:process'

import { green } from 'kolorist'

import pkgObj, { appVersion } from '#app/package'
import { getLatestPackageVersion } from '#app/api/npm-registry'

function semVersionCompare(a: string, b: string): string | null {
  const [aMajor, aMinor, aPatch] = a.split('.')
  const [bMajor, bMinor, bPatch] = b.split('.')

  if (aMajor !== bMajor) {
    return 'major'
  }

  if (aMinor !== bMinor) {
    return 'minor'
  }

  if (aPatch !== bPatch) {
    return 'patch'
  }

  return null
}

export async function checkVersion() {
  const latestVersion = await getLatestPackageVersion()

  if (!latestVersion) {
    return
  }

  const isLatest = semVersionCompare(latestVersion, appVersion) === null

  if (isLatest) {
    return
  }

  const packageUrl = `https://www.npmjs.com/package/${pkgObj.name}`
  const githubRepositoryUrl = pkgObj.repository.url.replace(/^git\+|\.git$/g, '')
  const githubRepositoryReleasesUrl = `${githubRepositoryUrl}/releases`

  process.stdout.write(`| 🆕 New version available${EOL}`)
  process.stdout.write(`| ${appVersion} ==> ${green(latestVersion)}${EOL}`)
  process.stdout.write(`| @see ${packageUrl}${EOL}`)
  process.stdout.write(`| @see ${githubRepositoryReleasesUrl}${EOL}`)
  process.stdout.write(EOL)
}
