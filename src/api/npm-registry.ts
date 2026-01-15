import pkgObj from '#app/package'
import { simpleFetch } from '#app/api/fetch'

export async function getLatestPackageVersion(): Promise<string | null> {
  try {
    const data = await simpleFetch<Record<string, unknown>>(`https://registry.npmjs.com/${pkgObj.name}/latest`)

    return `${data.version}`
  }
  catch {}

  return null
}
