import { request } from 'node:https'

interface RequestOptions {
  method?: 'GET'
  headers?: Record<string, string>
}

export function simpleFetch<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { headers, method } = options

  return new Promise((resolve, reject) => {
    const fetchUrl = new URL(url)

    const _request = request({
      method: method || 'GET',
      hostname: fetchUrl.hostname,
      path: fetchUrl.href,
      headers,
    }, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data)

          resolve(parsedData as T)
        }
        catch (err) {
          reject(err)
        }
      })
    })

    _request.on('error', (err) => {
      reject(err)
    })

    _request.end()
  })
}
