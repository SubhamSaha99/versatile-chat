# Socket Load Testing And Scale Plan

This project uses NestJS + `socket.io` in [`src/chat/chat.gateway.ts`](E:\projects\versatile-chat\src\chat\chat.gateway.ts). A client:

- authenticates during the websocket handshake with a JWT
- joins a room named after `userId`
- emits `send_message`
- receives `receive_message`
- writes every message to Kafka before it is persisted to MongoDB

## 1. What To Measure

Before talking about "one million", define the target clearly:

- concurrent websocket connections
- messages per second
- p95 / p99 ack latency for `send_message`
- message delivery latency for `receive_message`
- Kafka producer latency
- MongoDB insert throughput
- CPU, memory, event-loop lag, and open file descriptors per instance

For this app, the useful first milestone is:

1. 1,000 concurrent sockets
2. 10,000 concurrent sockets
3. 50,000 concurrent sockets
4. sustained messages/sec under those connection counts

Do not jump directly to one million. The current architecture will bottleneck much earlier.

## 2. Current Scale Limitations In This Codebase

### A. Cross-instance socket delivery is not configured

[`src/chat/chat.gateway.ts`](E:\projects\versatile-chat\src\chat\chat.gateway.ts) emits with:

```ts
this.server.to(receiverId).emit('receive_message', data);
```

That only reaches sockets connected to the same Node.js instance unless you add a shared Socket.IO adapter such as Redis.

Right now `docker-compose.yml` starts `app1`, `app2`, and `app3`, but there is no Redis adapter. So horizontal scale is incomplete for real-time delivery.

### B. A load balancer with sticky sessions is required

Websocket upgrades must consistently route a connected client to the same backend. Without sticky sessions, reconnect and room behavior become unstable.

### C. Kafka is only used for persistence, not socket fanout

Kafka currently helps decouple writes to MongoDB, but it does not solve multi-instance websocket delivery.

### D. Logging in hot paths will hurt throughput

[`src/chat/chat.gateway.ts`](E:\projects\versatile-chat\src\chat\chat.gateway.ts) logs on connect and disconnect. At high connection churn, synchronous console logging becomes expensive.

### E. JWT verification happens on every connection

That is normal, but at very high churn it becomes measurable. Handshake auth cost needs to be included in the test.

## 3. Recommended Load Test Progression

Use two kinds of tests.

### Test 1: Connection storm

Goal: find max stable concurrent sockets and reconnect behavior.

Traffic shape:

- ramp from 0 to N sockets over 2-5 minutes
- keep sockets idle for 10-15 minutes
- record connection failures, disconnects, CPU, memory

### Test 2: Messaging throughput

Goal: measure end-to-end send and delivery performance.

Traffic shape:

- establish stable sockets first
- each client emits `send_message` every X seconds
- measure:
  - ack success rate
  - ack latency
  - delivered messages/sec
  - Kafka lag
  - MongoDB write latency

### Test 3: Failure test

Goal: verify cluster behavior during restarts and broker/database stress.

Traffic shape:

- keep background socket traffic running
- restart one app instance
- throttle MongoDB or Kafka
- verify reconnect and backlog behavior

## 4. Tools

Recommended tools:

- `Artillery` for Socket.IO load
- `k6` if you move to raw WebSocket or HTTP-heavy testing
- `Grafana` + `Prometheus` for metrics
- `kafka-exporter` or broker metrics for Kafka lag
- MongoDB monitoring for insert latency and lock pressure

For this gateway, `Artillery` is the most direct choice because it supports Socket.IO semantics.

## 5. Example Artillery Scenario

Create a file like `loadtest/socket.artillery.yml` locally:

```yaml
config:
  target: "http://localhost:4001"
  phases:
    - duration: 120
      arrivalRate: 20
      rampTo: 200
      name: warmup
    - duration: 300
      arrivalRate: 200
      name: sustain
  engines:
    socketio-v3: {}
  processor: "./socket.processor.js"

scenarios:
  - name: socket send_message
    engine: socketio-v3
    flow:
      - function: "setAuth"
      - emit:
          channel: "send_message"
          data:
            receiverId: "{{ receiverId }}"
            message: "load-test-message"
      - think: 1
```

And a processor like:

```js
module.exports = {
  setAuth(context, events, done) {
    context.vars.receiverId = process.env.RECEIVER_ID || "load-test-receiver";
    context.socketio = {
      auth: {
        token: process.env.JWT_TOKEN
      }
    };
    return done();
  }
};
```

Run:

```bash
npx artillery run loadtest/socket.artillery.yml
```

Notes for this repo:

- you need a valid JWT from `POST /api/auth/login`
- if you want to measure real fanout, connect receiver clients using tokens for actual receiver users
- test a single instance first, then test behind a load balancer

## 6. Metrics That Matter

Capture these for every run:

- socket connect success rate
- connected clients
- `send_message` ack rate
- p50 / p95 / p99 ack latency
- `receive_message` delivery delay
- Node.js CPU and RSS memory per instance
- event loop lag
- Kafka producer request latency
- Kafka consumer lag
- MongoDB insert latency and write errors

If you do not capture these, "it handled X users" is not a meaningful result.

## 7. What Must Change Before Targeting Very Large Scale

### Priority 1: Add a shared Socket.IO adapter

For multi-instance real-time delivery, add Redis and configure the Socket.IO Redis adapter. Without this, a user connected to `app2` will not reliably receive a room emit issued on `app1`.

### Priority 2: Put the app behind a real load balancer

Use:

- NGINX, HAProxy, AWS ALB, or Kubernetes ingress
- websocket upgrade support
- sticky sessions
- connection and idle timeout tuning

### Priority 3: Add observability

Expose and track:

- websocket connection count
- messages/sec
- failed auth count
- Kafka produce/consume timings
- Mongo bulk insert timings

### Priority 4: Reduce hot-path overhead

Improve these areas in the gateway:

- remove or sample connect/disconnect logs
- validate payloads cheaply
- avoid unnecessary JSON parse branches when the client contract is fixed
- consider backpressure and rate limiting for message bursts

### Priority 5: Separate concerns by service

At very large scale, split responsibilities:

- websocket edge service for connections and fanout
- async pipeline for persistence and analytics
- presence/session service if needed

## 8. Reality Check On "One Million"

"One million requests" and "one million sockets" are very different.

- 1,000,000 total messages/day is easy with the right infra
- 1,000,000 concurrent websocket connections is a serious distributed-systems problem

For one million concurrent sockets, plan for:

- many websocket nodes, not 3
- Redis adapter or another shared fanout layer
- tuned OS limits (`ulimit`, open files, TCP backlog, ephemeral ports)
- multiple load balancers
- autoscaling
- careful heartbeat / ping tuning
- regional sharding if global

Do not promise one million concurrent sockets from a single NestJS process. That is not realistic.

## 9. Recommended Next Implementation Steps For This Repo

1. Add Redis and the Socket.IO Redis adapter.
2. Add metrics for connection count, message rate, ack latency, Kafka latency, and Mongo batch flush time.
3. Add a `loadtest/` folder with Artillery scenarios and token setup instructions.
4. Run tests against one instance only.
5. Put the 3 app containers behind a load balancer and repeat the same tests.
6. Increase Kafka partitions and verify consumer behavior under load.
7. Tune MongoDB indexes and batch sizes based on measured write pressure.

## 10. Immediate Practical Target

A realistic first production target for this codebase is:

- 10k to 50k concurrent sockets total
- measured and stable
- with Redis adapter, sticky load balancing, and observability in place

Only after that should you push toward six-figure concurrent connections.
