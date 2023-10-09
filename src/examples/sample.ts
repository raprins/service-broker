import express from "express"
import { OsbApiBroker as Broker, OsbService } from "../index.js"


const broker = Broker.create({
  withAuthentication: 'Basic someauthentication',
  services: [new OsbService({
    id: 'fbb89e27-8b39-4aa4-b00a-415326185ea9',
    name: 'date-utilities',
    description: "Date",
    instances_retrievable: true,
    bindable: true,
    plans: [{
      id: 'd226e953-dcd6-4bf8-aa63-12ba196b7fb1',
      name: 'free-plan',
      description: 'A free plan',
      free: true,
      schemas: {
        service_instance: {
          create: {
            parameters: {
              "$schema": "http://json-schema.org/draft-04/schema#",
              "type": "object",
              "properties": {
                "topics": {
                  "type": "array",
                  "items": {
                    "type": "string"
                  }
                }
              },
              "required": ["topics"],
              "additionalProperties": false
            }
          }
        }
      }
    }]
  })]
})
const PORT = Number(process.env.PORT || '3000')
const app = express()


app
  .use('/broker', broker.handler)
  .listen(PORT, () => console.log(`Server is runing on ${PORT}`))





