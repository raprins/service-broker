import { Binding, BindingRequest, CreateBinding, CreateProvisioning, Operation, OperationRequest, OsbApiBroker, OsbService, OsbServiceConfiguration, PromiseOrNot, Provision, ProvisionRequest, UpdateProvisioning } from "../index.js"
import express from "express"
import DefaultServiceAdapter from "../lib/default-adapter.js";
import BrokerError from "../lib/error.js";

const PORT = Number(process.env.PORT || '3000')
const app = express()

class DateService extends OsbService {


  async provision(request: ProvisionRequest<CreateProvisioning<{ firstname: string }>>): Promise<Provision> {
    throw new Error("Method not implemented.");
  }
  
  deprovision(request: ProvisionRequest<Record<string, any>>): PromiseOrNot<void> {
    throw new Error("Method not implemented.");
  }
  fetchInstance(request: ProvisionRequest<Record<string, any>>): PromiseOrNot<Provision> {
    throw new Error("Method not implemented.");
  }
  updateInstance(request: ProvisionRequest<UpdateProvisioning>): PromiseOrNot<Provision> {
    throw new Error("Method not implemented.");
  }
  getInstanceLastOperation(request: ProvisionRequest<OperationRequest>): PromiseOrNot<Operation> {
    throw new Error("Method not implemented.");
  }
  bindInstance(request: BindingRequest<CreateBinding<Record<string, any>>>): PromiseOrNot<Binding<Record<string, any>>> {
    throw new Error("Method not implemented.");
  }
  unbindInstance(request: BindingRequest<Record<string, any>>): PromiseOrNot<void> {
    throw new Error("Method not implemented.");
  }
  fetchBinding(request: BindingRequest<Record<string, any>>): PromiseOrNot<Binding<Record<string, any>>> {
    throw new Error("Method not implemented.");
  }
  getBindingLastOperation(request: BindingRequest<OperationRequest>): PromiseOrNot<Operation> {
    throw new Error("Method not implemented.");
  }
}




export const dateService = new DateService({
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
})


const broker = OsbApiBroker.create(dateService)


app
  .use('/broker', broker.handler)
  .listen(PORT, () => console.log(`Server is runing on ${PORT}`))