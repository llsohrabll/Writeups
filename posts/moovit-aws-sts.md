---
title: "Moovit mobile backend exposed temporary AWS credentials"
description: "An unauthenticated response issued temporary production-role credentials, and CDN caching could share them between callers."
date: "2026-09-27"
category: "Cloud"
icon: "../images/moovit/icon.svg"
tags: [aws, sts, credential_exposure, unauthenticated]
author: "Sohrab Kaghazian"
---

## The short version

I found that a Moovit mobile-backend service would return temporary AWS credentials to a visitor who had not signed in. The response contained the full set needed for an AWS STS session: an access key, a secret key, a session token, and an expiration time. Two production hosts and two development-host variants showed this behavior.

Temporary credentials expire, but they still grant whatever permissions their IAM role has until that happens. The production responses authenticated as roles in production AWS accounts. I confirmed the identity of those roles; I did **not** access application data or demonstrate broader AWS permissions.

![Illustration of an anonymous request receiving temporary credentials from a mobile backend, with a CDN cache between callers and the response.](../images/moovit/credential-flow.svg)

## What happened

An anonymous HTTP request to the affected mobile-backend endpoints returned `200 OK` and a JSON object with four credential fields. No Moovit account, session cookie, API key, signed request, or mobile-app attestation was required. I am leaving out the hostnames and request paths because they would make the exposed service easier to target; the response shape is enough to explain the flaw.

The production credentials worked for the limited AWS STS identity check `GetCallerIdentity`. That check identified production IAM role sessions in two separate AWS accounts. The development-host variants also issued sessions in those production accounts, raising an environment-separation concern.

The illustration below shows the evidence format. It is a **redacted reconstruction**, not a screenshot of the original response. Every credential and identifying value has been removed.

![Redacted reconstruction of an HTTP 200 JSON credential response; AccessKeyId, SecretAccessKey, SessionToken, and Expiration values are covered by black bars.](../images/moovit/redacted-response.svg)

## Why the cache mattered

One production response was served through CloudFront with cache settings that allowed a response to remain fresh for up to five minutes in a browser and one minute in a shared cache. I also observed a cache hit. A credential response should be private to its intended recipient; shared caching could let another caller receive the same temporary session during the cache window.

## The impact I could verify

The confirmed issue was **anonymous issuance of valid temporary credentials for production roles**. I validated that the credentials could identify themselves to AWS STS. Basic attempts to list common resources returned `AccessDenied`, and I did not read resource contents. The report therefore does not claim access to stored data, administrative control, or account takeover.

## How to fix it

Credential issuance needs server-side authentication and authorization tied to a specific trusted consumer. Mobile-app or device attestation can add a signal, but it should not be the only control. Credential responses should use `Cache-Control: no-store`, and the CDN should never cache credential-vending routes; any cached responses should be invalidated. The issued IAM roles should have the smallest possible permissions, while monitoring and rate limits should flag unusual issuance. Development endpoints should not issue production-account credentials unless there is a strict, justified access path.

_The original report was validated on September 16 and rechecked on September 18, 2026. Endpoint names, account and role identifiers, and credential values are intentionally omitted here._
