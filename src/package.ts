import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const pkgObj = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'))

export const packageBinName = Object.entries(pkgObj.bin)[0][0]
export const configName = pkgObj.name.split('/')[1]
export const appVersion = pkgObj.version

export default pkgObj
