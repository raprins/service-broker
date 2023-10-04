
import { Request, Response, Router } from "express";
import { CreateProvisioning, Operation, OsbService, ProvisionRequest, Provision, UpdateProvisioning, Binding, BindingRequest, CreateBinding, OperationRequest } from "../lib/service.js";

class DateUtilService extends OsbService {

    async provision(request: ProvisionRequest<CreateProvisioning>): Promise<Provision> {
        return {
            dashboard_url: 'http://localhost:3000'
        }
    }

    deprovision(request: ProvisionRequest<Record<string, any>>): void {
        
    }

    fetchInstance(request: ProvisionRequest<Record<string, any>>): Provision {
        return {
            dashboard_url: 'http://localhost:3000'
        }
    }

    updateInstance(request: ProvisionRequest<UpdateProvisioning>): Promise<Provision> {
        throw new Error("Method not implemented.");
    }

    getInstanceLastOperation(request: ProvisionRequest<OperationRequest>): Promise<Operation> {
        throw new Error("Method not implemented.");
    }

    async bindInstance(request: BindingRequest<CreateBinding>): Promise<Binding> {

        const { bind_resource } = request
        
        return {
            credentials : {

            }
        }
    }

    unbindInstance(request: BindingRequest<Record<string, any>>): Promise<void> {
        throw new Error("Method not implemented.");
    }

    async fetchBinding(request: BindingRequest<Record<string, any>>): Promise<Binding<Record<string, any>>> {
        return {
            credentials : {

            }
        }
    }

    getBindingLastOperation(request: BindingRequest<OperationRequest>): Promise<Operation> {
        throw new Error("Method not implemented.");
    }

    

}

export const dateUtilService = new DateUtilService({
    name: "date-util",
    id: "fbb89e27-8b39-4aa4-b00a-415326185ea9",
    description: "Service permettant de formatter des Dates",
    tags: ["date", "utilities"],
    requires: ["route_forwarding"],
    bindable: true,
    instances_retrievable: false,
    bindings_retrievable: true,
    allow_context_updates: true,
    metadata: {
        displayName: "Date Utilities",
        longDescription: "Service permettant de formatter des Dates"
    },
    plan_updateable: true,
    plans: [{
        name: "free",
        id: "d226e953-dcd6-4bf8-aa63-12ba196b7fb1",
        description: "Free date fromatter plan",
        free: true,
        maintenance_info: {
            version: "0.0.1",
            description: "Utilities first of its name"
        },
        schemas: {
            service_instance: {
                create: {
                    parameters: {
                        "$schema": "http://json-schema.org/draft-04/schema#",
                        "type": "object",
                        "properties": {
                            "locale": {
                                "type": "string",
                                "description": "Locale to be used"
                            }
                        },
                        "required": ["locale"]
                    }
                }
            }
        }
    }]
})


export const router = Router()
router.get("/", (request: Request, response: Response) => {
    response.send(new Intl.DateTimeFormat(undefined, { timeStyle : 'short', dateStyle: 'short'}).format(new Date()))
})

