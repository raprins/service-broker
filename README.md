# Service Broker

## Initialize a Service broker

```ts
const broker = Broker.create(new OsbService({
  id: 'fbb89e27-8b39-4aa4-b00a-415326185ea9',
  name: 'date-utilities',
  description: "Date",
  bindable: true,
  plans: [{
    id: 'd226e953-dcd6-4bf8-aa63-12ba196b7fb1',
    name: 'free-plan',
    description: 'A free plan',
    free: true
  }]
}))

const PORT = Number(process.env.PORT || '3000')
const app = express()

app
  .use('/broker', broker.handler)
  .listen(PORT)

```

## Intercept call
For this case, extends the class __OsbService__ 

```ts
class DateService extends OsbService {
  
  // Handle Provision request
  provision(request: ProvisionRequest<CreateProvisioning<Record<string, any>>>): Provision {
    return {
      dashboard_url : 'http://localhost:3000/dashboard'
    }
  }
}


const dateService = new DateService({ /** Your configuration here */})
```




