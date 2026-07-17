import { createServer } from './server.js'

const port = Number(process.env.PORT ?? 3001)

createServer()
  .then((app) => app.listen({ host: '0.0.0.0', port }))
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
