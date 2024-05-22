---
title: Go test tricks
description: Testing unexported identifiers and avoiding circular dependencies
pubDate: 2024-05-23
---

## Friends in Go

A best practice when writing tests is to put them in a separate `_test` package.
This forces you to use your API as a consumer and ensures that your tests aren't coupled to your implementation details[^1].
It is a great way to avoid [test-induced design damage](https://www.tedinski.com/2018/10/09/relationship-induction-and-tests.html) like overmocking.

[^1]: Tests that you have to change every time you change the internals of a package are tech debt.

That said, whitebox testing has its place.
Sometimes when writing these kinds of tests, it's nice to be able to peer inside a package and inspect things you wouldn't want to expose to consumers.

A neat trick is using `export_test.go` to redeclare the identifiers you want to export, kind of like the `friend` keyword in C++.
This works as test files are excluded from regular package builds but included when the `go test` command is run.

```go
package foo

var Foo = foo
var FooType fooType
```

This pattern can be seen in the [`math`](https://github.com/golang/go/blob/master/src/math/export_test.go) and [`net/http`](https://github.com/golang/go/blob/master/src/net/http/export_test.go) packages from the Go standard library.
By convention, the file that exposes internals to tests is named `export_test.go`.

```go
package math

// Export internal functions for testing.
var ExpGo = exp
var Exp2Go = exp2
var HypotGo = hypot
var SqrtGo = sqrt
var TrigReduce = trigReduce

const ReduceThreshold = reduceThreshold
```

<br>

```go
package http

var (
	DefaultUserAgent                  = defaultUserAgent
	NewLoggingConn                    = newLoggingConn
	ExportAppendTime                  = appendTime
	ExportRefererForURL               = refererForURL
	ExportServerNewConn               = (*Server).newConn
	ExportCloseWriteAndWait           = (*conn).closeWriteAndWait
	ExportErrRequestCanceled          = errRequestCanceled
	ExportErrRequestCanceledConn      = errRequestCanceledConn
	ExportErrServerClosedIdle         = errServerClosedIdle
	ExportServeFile                   = serveFile
	ExportScanETag                    = scanETag
	ExportHttp2ConfigureServer        = http2ConfigureServer
	Export_shouldCopyHeaderOnRedirect = shouldCopyHeaderOnRedirect
	Export_writeStatusLine            = writeStatusLine
	Export_is408Message               = is408Message
)

...

func init() {
	// We only want to pay for this cost during testing.
	// When not under test, these values are always nil
	// and never assigned to.
	testHookMu = new(sync.Mutex)

	testHookClientDoResult = func(res *Response, err error) {
		if err != nil {
			if _, ok := err.(*url.Error); !ok {
				panic(fmt.Sprintf("unexpected Client.Do error of type %T; want *url.Error", err))
			}
		} else {
			if res == nil {
				panic("Client.Do returned nil, nil")
			}
			if res.Body == nil {
				panic("Client.Do returned nil res.Body and no error")
			}
		}
	}
}

...

func init() {
	// Set the default rstAvoidanceDelay to the minimum possible value to shake
	// out tests that unexpectedly depend on it. Such tests should use
	// runTimeSensitiveTest and SetRSTAvoidanceDelay to explicitly raise the delay
	// if needed.
	rstAvoidanceDelay = 1 * time.Nanosecond
}
```

An aside, it turns out [Go lets you can have as many `init` functions as you want](https://go.dev/ref/spec#Package_initialization)!

> A package is initialised by assigning initial values to all its package-level variables followed by calling all `init` functions in the order they appear in the source, possibly in multiple files, as presented to the compiler.

## Circular dependencies

You may be familiar with the `import .` syntax, which pulls all of a package's exported identifiers into the current namespace.
This is handy when you're writing a test that cannot be made part of the package due to circular dependencies.

```go
package foo_test

import (
    "bar/testutil" // also imports "foo"
    . "foo"
)
```

This is used in [`net/http/serve_test.go`](https://cs.opensource.google/go/go/+/master:src/net/http/serve_test.go) to be able to use various subpackages.

```go
package http_test

import (
    ...
    . "net/http"
    "net/http/httptest"
    "net/http/httptrace"
    "net/http/httputil"
    "net/http/internal"
    "net/http/internal/testcert"
    ...
)

...
```

According to the [Go Code Review Comments](https://go.dev/wiki/CodeReviewComments#import-dot), this is the **only** time you should use `import .`! You should avoid using it otherwise:

> It makes programs much harder to read because it is unclear whether a name like Quux is a top-level identifier in the current package or in an imported package.
