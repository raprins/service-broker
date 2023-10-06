import express from "express"
import { OsbApiBroker as Broker, CreateProvisioning, OsbService, Provision, ProvisionRequest } from "../index.js"


class DateService extends OsbService {
    
    provision(request: ProvisionRequest<CreateProvisioning>): Provision {
        return {
            dashboard_url : 'http://localhost:3000/dashboard'
        }
    }
}

const broker = Broker.create(new DateService({
    "name": "fake-service",
    "id": "fbb89e27-8b39-4aa4-b00a-415326185ea9",
    "description": "A fake service.",
    "tags": ["no-sql", "relational"],
    "requires": ["route_forwarding"],
    "bindable": true,
    "instances_retrievable": true,
    "bindings_retrievable": true,
    "allow_context_updates": true,
    "plan_updateable": true,
    "plans": [{
      "name": "fake-plan-1",
      "id": "d226e953-dcd6-4bf8-aa63-12ba196b7fb1",
      "description": "Shared fake Server, 5tb persistent disk, 40 max concurrent connections.",
      "free": false,
      "schemas": {
        "service_instance": {
          "create": {
            "parameters": {
              "$schema": "http://json-schema.org/draft-04/schema#",
              "type": "object",
              "properties": {
                "billing-account": {
                  "description": "Billing account number used to charge use of shared fake server.",
                  "type": "string"
                }
              },
              "required": ["billing-account"],
              "additionalProperties": false
            }
          },
          "update": {
            "parameters": {
              "$schema": "http://json-schema.org/draft-04/schema#",
              "type": "object",
              "properties": {
                "billing-account": {
                  "description": "Billing account number used to charge use of shared fake server.",
                  "type": "string"
                }
              }
            }
          }
        },
        "service_binding": {
          "create": {
            "parameters": {
              "$schema": "http://json-schema.org/draft-04/schema#",
              "type": "object",
              "properties": {
                "billing-account": {
                  "description": "Billing account number used to charge use of shared fake server.",
                  "type": "string"
                }
              }
            }
          }
        }
      },
      "maintenance_info": {
        "version": "0.0.1",
        "description": "OS image update.\nExpect downtime."
      }
    }]
  }))


const PORT = Number(process.env.PORT || '3000')
const app = express()

app
  .use('/broker', broker.handler)
  .listen(PORT, () => console.log(`Server is runing on ${PORT}`))






  