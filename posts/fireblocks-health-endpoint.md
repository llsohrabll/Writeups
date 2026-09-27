---
title: "Fireblocks: A health check revealed backend topology"
description: "An unauthenticated sandbox mobile API health check returned detailed cloud and service status."
date: "2026-09-27"
author: "Sohrab Kaghazian"
category: "API"
icon: "../images/fireblocks/icon.svg"
tags: [api, data_exposure, cloud]
---

A health check usually needs to answer one question: is the service available? During a review of Fireblocks' sandbox mobile API, I found that its `/health` endpoint answered much more.

![A public health request returning internal service details](../images/fireblocks/health-endpoint-flow.svg)

*Illustration of the observed response flow; it is not the original screenshot.*

## What I observed

On September 15, 2026, a single unauthenticated `GET /health` request returned JSON with the status of several backend components. No token, cookie, or API key was needed. The response exposed the structure of AWS resources and application services, including an AWS account identifier, SNS topics, SQS queues, an S3 bucket, RabbitMQ component names, and live JVM memory telemetry.

Here is a shortened example of the response shape. The identifying resource names and values are masked:

```json
{
  "details": {
    "s3": {"status": "up", "details": {"[bucket redacted]": {"healthy": true}}},
    "database": {"status": "up"},
    "redis": {"status": "up"},
    "sns": {"status": "up", "details": {"[topic ARN redacted]": {"healthy": true}}},
    "sqs": {"status": "up", "details": {"[queue URL redacted]": {"healthy": true}}},
    "rabbitMq": {"status": "up", "details": {"[component redacted]": {"healthy": true}}},
    "heapMemory": {"status": "up", "details": {"used": "[value redacted]"}},
    "rssMemory": {"status": "up", "details": {"used": "[value redacted]"}}
  }
}
```

The original response also repeated detailed component information under `info`. I have omitted the exact host, AWS account number, resource names, queue URLs, topic ARNs, component names, and live memory values.

## Why it matters

An outsider could use this information to map service relationships and naming conventions, identify the cloud account and region, and monitor runtime state. That makes later reconnaissance more precise. The evidence supports **information disclosure**, not access to the disclosed AWS resources. I did not demonstrate a leaked credential or unauthorized resource access.

I assessed the finding as a low-severity configuration issue (P4) based on that scope.

## Safer health checks

Detailed diagnostics should be restricted to an internal network or authenticated operators. If a public health check is needed, it can return an aggregate result such as `{"status":"ok"}` without resource identifiers or runtime telemetry. Related debug and status endpoints should be reviewed for the same pattern.

This post describes what was observed on September 15, 2026; it does not claim the endpoint is still exposed today.
