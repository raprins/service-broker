# Service Broker

## Initialize a Service broker

```ts
// Instantiate a Class of OsbService
const dateService = new OsbService({
  id: '123345',
  name: 'date-utilities',
  description: "Date",
  bindable: true,
  plans: [{
    id: '678901',
    name: 'free-plan',
    description: 'A free plan',
    free: true
  }]
})

// Create a Broker with this Service 
const broker = OsbApiBroker.create(dateService)
```




