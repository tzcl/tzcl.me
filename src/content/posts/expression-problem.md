---
title: Solving the Expression Problem in Go
description: Solving the Expression Problem in Go
pubDate: 2023-08-09
---

## What is the Expression Problem?

The expression problem is a classic problem in computer science. It dates back to a post by Philip Wadler on the [Java-Genericity mailing list](https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt) in the late 1990s.

<pre>
The Expression Problem is a new name for an old problem.  The goal is
to define a datatype by cases, where one can add new cases to the
datatype and new functions over the datatype, without recompiling
existing code, and while retaining static type safety (e.g., no
casts).
</pre>

Fundamentally, it is a question of how expressive languages are when it comes to creating user-defined types.
OOP languages make it easy for users to create new types but defining new operations is hard.
Conversely, functional languages make it easy to define operations but hard to define new types.
The goal is to express a design that allows extensibility in both dimensions.

### Defining the problem

In [Extensibility for the Masses](https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf), Oliveira and Cook state five requirements that a solution must satisfy:

1. **Extensibility in both dimensions**: A solution must allow the addition of new data variants and new operations and support extending existing operations.
2. **Strong static type safety**: A solution must prevent applying an operation to a data variant which it cannot handle using static checks.
3. **No modification or duplication**: Existing code must not be modified nor duplicated.
4. **Separate compilation and type-checking**: Safety checks or compilation steps must not be deferred until link or runtime.
5. **Independent extensibility**: It should be possible to combine independently developed extensions so that they can be used jointly.[^1]

[^1]: This was first specified in [Independently Extensible Solutions to the Expression Problem](https://homepages.inf.ed.ac.uk/wadler/fool/program/final/10/10_Paper.pdf).

The fifth constraint wasn't a part of Wadler's initial version of the problem. However, a solution that doesn't allow independent modules to compose almost defeats the point of the exercise – what's the point of having all this extensibility if the end-user has to reimplement everything themselves?

### Solutions to the problem

As of today, there are a whole bunch of ways to solve the Expression Problem.
[Wikipedia](https://en.wikipedia.org/wiki/Expression_problem) suggests you try one of

- Multiple dispatch
- Open classes
- Coproducts of functors
- Type classes
- Tagless-final / object algebras
- Polymorphic variants

Perhaps the simplest solution is monkey patching. In dynamic languages like Ruby, Python and JavaScript, you can override methods of an externally-defined object, so new code just yeets any existing code. The problem with this is that it breaks modularity, as now the behaviour of your program can subtly change each time you import a module[^2].

[^2]: Instead of being able to reason about your program locally, you have to consider the program as a whole to validate it.

In languages like Julia and Clojure, you can use multimethods to gain the flexibility required to solve the problem.
[However, the magic sauce is open methods, not multiple dispatch](https://eli.thegreenplace.net/2016/the-expression-problem-and-its-solutions#is-multiple-dispatch-necessary-to-cleanly-solve-the-expression-problem). A key part of any solution is retroactively implementing interfaces.

I don't know much about functional programming, so I can't comment much on the other approaches. From what I've read though, it doesn't seem like type classes are a valid solution, [the problem being that type classes are not actually types](https://eli.thegreenplace.net/2018/more-thoughts-on-the-expression-problem-in-haskell/)[^3].

[^3]: There are ways around this, using type constructors to unify expression types.

Finally, the most 'practical' solution may be object algebras. I say that because this approach doesn't require any wacky language extensions or complex type machinery, it is relatively simple to implement in most mainstream languages. From what I understand, object algebras are like the abstract factory pattern – they work by building a tree of constructors and then injecting concrete implementations later[^4].

[^4]: There's some deep connection here to some of the other solutions, with object algebras being the OOP version of tagless-final encoding.

## A solution with Go interfaces

Finally, let's get to some code. The classic example is building a basic expression language that has two types, constants and addition, and supports evaluation. From there, we'll extend it by adding another operation, printing expressions, and another type, multiplication.

To model types, a natural approach in Go[^5] is something like[^6]

[^5]: This implementation is heavily inspired by Eli Bendersky's article on [The Expression Problem in Go](https://eli.thegreenplace.net/2018/the-expression-problem-in-go/).
[^6]: You can find the full code [here](https://gist.github.com/tzcl/def0c829bb00ef7dff74116c1d7e5d8b).

```go
type Expr interface{}

type Constant struct {
	value float64
}

type BinaryPlus struct {
	left  Expr
	right Expr
}
```

We want to be able to evaluate expressions, so let's add an interface and implement it for our types.

```go
type Evaluator interface {
	Eval() float64
}

func (c *Constant) Eval() float64 {
	return c.value
}

func (bp *BinaryPlus) Eval() float64 {
	return bp.left.(Evaluator).Eval() + bp.right.(Evaluator).Eval()
}
```

Adding another operation is easy, we just define another interface and add more methods to our types.

```go
type Printer interface {
    Print() string
}

func (c *Constant) Print() string {
	return strconv.FormatFloat(c.value, 'f', -1, 64)
}

func (bp *BinaryPlus) Print() string {
	ls := bp.left.(Printer)
	rs := bp.right.(Printer)
	return fmt.Sprintf("(%s + %s)", ls.Print(), rs.Print())
}
```

Note, if this was defined in a separate package, there is slightly more we have to do since Go doesn't allow adding methods to types from another package.

```go
package printer

// Assume Expr/Eval are defined in a package called base
import base

type Printer interface {
    Print() string
}

type Constant struct {
    base.Constant // Reuse implementation of Eval()
}

func (c *Constant) Print() string {
    return fmt.Sprint(c.value)
}

type BinaryPlus struct {
    base.BinaryPlus // Reuse implementation of Eval()
}

func (bp *BinaryPlus) Print() string {
    ls := bp.left.(Printer)
    rs := bp.right.(Printer)
	return fmt.Sprintf("(%s + %s)", ls.Print(), rs.Print())
}
```

To keep things concise, assume the rest of the code is in one package, but remember it's possible to split all of these samples out.

Lastly, let's implement multiplication expressions.

```go
type BinaryMul struct {
	left  Expr
	right Expr
}

func (bm *BinaryMul) Eval() float64 {
	return bm.left.(Evaluator).Eval() * bm.right.(Evaluator).Eval()
}

func (bm *BinaryMul) Print() string {
	ls := bm.left.(fmt.Stringer)
	rs := bm.right.(fmt.Stringer)
	return fmt.Sprintf("(%s * %s)", ls.Print(), rs.Print())
}
```

Noice. We've managed to build our expression language and it was all pretty straightforward! Let's make an expression and run it.

```go
func CreateNewExpr() Expr {
	c11 := Constant{value: 1.1}
	c22 := Constant{value: 2.2}
	c33 := Constant{value: 3.3}
	bp := &BinaryMul{left: &BinaryPlus{left: &c11, right: &c22}, right: &c33}
	return &bp
}

func main() {
	expr := CreateNewExpr()
	fmt.Println(expr.(Evaluator).Eval()) // 10.89
	fmt.Println(expr.(Printer).Print()) // ((1.1 + 2.2) * 3.3)
}
```

It works! Job done, right?

Well, not quite. We've almost got a full solution except for the casting from `Expr` to `Evaluator` and `Printer`. This means that we can't catch type errors until runtime.

```go
expr := &BinaryPlus{left: "abc", right: &Constant{value: 1.23}}
fmt.Println(expr.(Evaluator).Eval()) // Uh oh, panic
```

The question is, is there a way for us to get static type safety? 🤔

## Object algebras in Go

As mentioned previously, we can use object algebras to get a full solution to the expression problem. In my opinion, [the paper](https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf) is actually pretty readable and the authors do a good job motivating and explaining the relevant ideas as they build up to solving the expression problem (and extensions of the problem).

Other great resources on object algebras are:

- [This Stack Overflow post](https://stackoverflow.com/questions/67818254/how-to-implement-exp-in-bool-or-iff-from-the-paper-extensibility-for-the-masses) on implementing object algebras which was answered by Oliveira himself (and clarifies a typo in the paper).
- Tijs van der Storm's talk, [Who's Afraid of Object Algebras](https://www.infoq.com/presentations/object-algebras/), which walks through an implementation of object algebras in Dart. Watching this made it all 'click' for me.

To get started, let's define an object algebra, which is somewhat like an abstract factory for creating expressions. The two methods here are constructors for our two initial expressions, constants and addition.

```go
type ExprAlg[Op any] interface {
	Constant(value float64) Op
	BinaryPlus(lhs, rhs Op) Op
}
```

Like before, we can define an operation over these expressions using an interface.

```go
type Evaluator interface {
	Eval() float64
}
```

However, unlike before, instead of adding methods to structs, we need to create a concrete factory that implements the `ExprAlg` interface.
Because we have a single-method interface, a neat Go trick we can use is implementing the `Eval` interface on a function (like `http.HandlerFunc`). `EvalFunc` works like an adapter and lets us create a closure that satisfies `Eval`.

```go
type EvalFunc func() float64

// EvalFunc implements Evaluator
func (fn EvalFunc) Eval() float64 {
	return fn()
}

// EvalExpr implements ExprAlg[Evaluator]
type EvalExpr struct{}

func (EvalExpr) Constant(value float64) Evaluator {
	return EvalFunc(func() float64 {
		return value
	})
}

func (EvalExpr) BinaryPlus(lhs, rhs Evaluator) Evaluator {
	return EvalFunc(func() float64 {
		return lhs.Eval() + rhs.Eval()
	})
}
```

Checking that this works, we can define expressions using the object algebra and inject the concrete factory.

```go
func NewExpr[A any](alg ExprAlg[A]) A {
	return alg.Add(alg.Constant(1.1), alg.Constant(2.2))
}

func main() {
	// expr is inferred to be ExprAlg[Evaluator]
	expr := NewExpr(EvalExpr{})
	fmt.Println(expr.Eval()) // 3.3
}
```

Now, adding another operation is easy, we just need to define another interface and create another concrete implementation of `ExprAlg`.

```go
type Printer interface {
	Print() string
}

// PrintFunc implements Printer
type PrintFunc func() string

func (fn PrintFunc) Print() string {
	return fn()
}

// PrintExpr implements ExprAlg[Printer]
type PrintExpr struct{}

func (PrintExpr) Constant(value float64) Printer {
	return PrintFunc(func() string {
		return strconv.FormatFloat(value, 'f', -1, 64)
	})
}

func (PrintExpr) BinaryPlus(lhs, rhs Printer) Printer {
	return PrintFunc(func() string {
		return fmt.Sprintf("(%s + %s)", lhs.Print(), rhs.Print())
	})
}

func main() {
	expr := NewExpr(PrintExpr{})
	fmt.Println(expr.Print()) // (1.1 + 2.2)
}
```

Adding another expression is slightly more complex but still allows us to reuse all existing code. It's a good example of the power of embedding. To add multiplication, we need to extend `ExprAlg` and add a new constructor method. Then, we need to make more concrete factories.

```go
type ExprMulAlg[A any] interface {
	ExprAlg[A]
	Mul(lhs, rhs A) A
}

type EvalMulExpr struct {
	EvalExpr
}

func (EvalMulExpr) Mul(lhs, rhs Evaluator) Evaluator {
	return EvalFunc(func() float64 {
		return lhs.Eval() * rhs.Eval()
	})
}

type PrintMulExpr struct {
	PrintExpr
}

func (PrintMulExpr) Mul(lhs, rhs Printer) Printer {
	return PrinterFunc(func() Print {
		return fmt.Sprintf("(%s * %s)", lhs.Print(), rhs.Print())
	})
}
```

Note, this actually allows us to build up more complex expressions using simpler expressions because they have different types[^7].

[^7]: Oliveira and Cook state that this is one of the advantages of this solution over something like open classes. With open classes, you keep extending the same expression type so there's no distinction between more complex expressions.

```go
func NewMulExpr[A any](alg ExprMulAlg[A]) A {
	// We can use NewExpr because ExprMulAlg[A] implements ExprAlg[A]!
	return alg.Mul(NewExpr(alg), alg.Lit(3.3))
}

func main() {
	// Note, these have different types
	evalExpr := NewMulExpr(EvalMulExpr{})
	printExpr := NewMulExpr(PrintMulExpr{})

	fmt.Println(evalExpr.Eval()) // 10.89
	fmt.Println(printExpr.Print()) // ((1.1 + 2.2) * 3.3)
}
```

Finally, if we try to create an invalid expression, the Go type checker will catch it for us! 🎉

```go
func NewMulExpr[A any](alg ExprMulAlg[A]) A {
	return alg.Mul("abc", alg.Lit(3.3))
	// cannot use "abc" (untyped string constant) as A value in argument to arg.Mul
}
```

## Is it worth it?

In [The one ring problem: abstraction and our quest for power](https://www.tedinski.com/2018/01/30/the-one-ring-problem-abstraction-and-power.html), Ted Kaminski talks about the mistake of biasing towards power.

<pre>
While looking over [academic papers on programming languages], I 
realized there was an unfortunate common theme:

Quite a lot of papers would come up with something they wanted to do, 
show that existing designs were incapable of doing it, then design 
some more powerful system where they could.

I believe this thought process is a common failing among programmers.
</pre>

Abstractions cut both ways. There are always trade-offs when choosing one abstraction over another.

<pre>
You cannot make an abstraction more powerful without sacrificing some 
properties that you used to know about it. Necessarily. 
You cannot require a new property be true about an abstraction without
sacrificing some of its power and flexibility. Always.
</pre>

Do we need to solve the expression problem? Is the extra complexity worth the type safety?

In most cases, I'd argue not – we should prefer to use the least powerful option at our disposal to minimise complexity. However, in the cases where it is required, it's handy to know a solution exists.
