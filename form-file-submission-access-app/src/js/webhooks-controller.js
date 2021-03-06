const debug = require('debug')('filesubmit:webhooks')

const crypto = require('crypto')
const express = require('express')

const filesHandler = require('./files-handler')
const websocketController = require('./websocket-controller')
const router = new express.Router()

const SIGNATURE_HEADER = 'X-HubSpot-Signature'

exports.getRouter = () => {
  router.post('/', async (req, res) => {
    const webhooksEvents = req.body
    debug('receive events: %O', webhooksEvents)
    const result = await filesHandler(req.hubspot, webhooksEvents)
    debug('updated contact: ', result)
    result && websocketController.update()
    res.sendStatus(200)
  })
  return router
}

exports.getWebhookVerification = () => {
  return (req, res, buf, encoding) => {
    try {
      if (req.originalUrl === '/webhooks') {
        const rawBody = buf.toString(encoding)
        const signature = req.header(SIGNATURE_HEADER)

        const secret = process.env.HUBSPOT_CLIENT_SECRET
        const hash = crypto
          .createHash('sha256')
          .update(secret + rawBody)
          .digest('hex')

        if (signature === hash) return
      }
    } catch (e) {
      debug(e)
    }

    throw new Error('Unauthorized webhook event or error with request processing!')
  }
}
