---
title: Solving the Expression Problem in Go
description: Solving the Expression Problem in Go
pubDate: 2023-08-09
---

## What is the Expression Problem?

The expression problem is a classic problem in computer science.
It was originally posed by Philip Wadler in a post on the [Java Genericity mailing list](https://homepages.inf.ed.ac.uk/wadler/papers/expression/expression.txt).

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
The goal is to design a solution that allows extensibility in both dimensions.

## Defining the problem

In Oliveira and Cook's paper, [Extensibility for the Masses](https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf), they state five requirements that a solution must satisfy:

1. **Extensibility in both dimensions**: A solution must allow the addition of new data variants and new operations and support extending existing operations.
2. **Strong static type safety**: A solution must prevent applying an operation to a data variant which it cannot handle using static checks.
3. **No modification or duplication**: Existing code must not be modified nor duplicated.
4. **Separate compilation and type-checking**: Safety checks or compilation steps must not be deferred until link or runtime.
5. **Independent extensibility**: It should be possible to combine independently developed extensions so that they can be used jointly.[^1]

[^1]: See [Independently Extensible Solutions to the Expression Problem](https://homepages.inf.ed.ac.uk/wadler/fool/program/final/10/10_Paper.pdf)

The fifth constraint is an extra requirement that wasn't a part of Wadler's initial formulation of the problem. However, a solution that doesn't allow independent modules to compose wouldn't be very useful in practice, what's the point of having all this extensibility if the end-user has to reimplement everything themselves?

## Solutions to the problem

As of today, there are a whole bunch of ways to solve the Expression Problem.
[Wikipedia](https://en.wikipedia.org/wiki/Expression_problem) suggests you try one of

- Multiple dispatch
- Open classes
- Coproducts of functors
- Type classes
- Tagless-final / object algebras
- Polymorphic variants

Perhaps the simplest solution is monkey patching. In dynamic languages like Ruby, Python and JavaScript, you can override methods of an externally-defined object, so new code can reach in and shake up existing code. The problem with this is that it breaks modularity as the behaviour of your program can subtly change each time you import a module[^2].

[^2]: Instead of being able to reason about your program locally, you have to consider the program as a whole to make sure it makes sense.

In languages like Julia and Clojure, you can use multimethods to gain the flexibility required to solve the problem.
However, the magic sauce is open methods, not multiple dispatch[^3]. A key part of the problem is to retroactively implement interfaces.

[^3]: See https://eli.thegreenplace.net/2016/the-expression-problem-and-its-solutions#is-multiple-dispatch-necessary-to-cleanly-solve-the-expression-problem

I don't know much about functional programming, so I can't comment much on the other approaches. From what I've read though, it doesn't seem like type classes are a valid solution, the problem being that type classes are not actually types[^4]. There are ways around this using functors which are 🤯.

[^4]: See https://eli.thegreenplace.net/2018/more-thoughts-on-the-expression-problem-in-haskell/

Finally, the most 'realistic' solution may be object algebras, as explored in the paper mentioned earlier, [Extensibility for the Masses](https://www.cs.utexas.edu/~wcook/Drafts/2012/ecoop2012.pdf). I say that because this approach doesn't require any crazy language extensions or complex type machinery, it is relatively simple to implement in most mainstream languages. From what I understand, object algebras are like the abstract factory pattern where you build a tree of constructors and then inject concrete implementations later. There's some deep connection here to some of the other solutions, with object algebras being the OOP version of tagless-final encodings.

## A solution with interfaces

Finally, let's get to some code. The classic example is building a basic expression language that has two types, constants and addition, and can be evaluated. From there, we'll extend it by adding another operation, printing expressions, and another type, multiplication.

To model types, a natural approach in Go is something like

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

We want to be able to evaluate expressions, so let's add an interface and implement it for our types[^5].

[^5]: You can find the full code [here](https://gist.github.com/tzcl/def0c829bb00ef7dff74116c1d7e5d8b)

```go
type Eval interface {
	Eval() float64
}

func (c *Constant) Eval() float64 {
	return c.value
}

func (bp *BinaryPlus) Eval() float64 {
	return bp.left.(Eval).Eval() + bp.right.(Eval).Eval()
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
// package printer

// Assume Expr/Eval are defined in a package called base
// import base

type Printer interface {
    Print() string
}

type Constant struct {
    base.Constant // Implements Eval() for us
}

func (c *Constant) Print() string {
    return fmt.Sprint(c.value)
}

type BinaryPlus struct {
    base.BinaryPlus
}

func (bp *BinaryPlus) Print() string {
    ls := bp.left.(Printer)
    rs := bp.right.(Printer)
	return fmt.Sprintf("(%s + %s)", ls.Print(), rs.Print())
}
```

To keep things concise, assume the rest of the code is in one package, but remember it's possible to split all of these samples out.

Lastly, let's implement multiplication expressions. This is also pretty easy.

```go
type BinaryMul struct {
	left  Expr
	right Expr
}

func (bm *BinaryMul) Eval() float64 {
	return bm.left.(Eval).Eval() * bm.right.(Eval).Eval()
}

func (bm *BinaryMul) Print() string {
	ls := bm.left.(fmt.Stringer)
	rs := bm.right.(fmt.Stringer)
	return fmt.Sprintf("(%s * %s)", ls.Print(), rs.Print())
}
```

Noice. We've managed to build our expression language and it was all pretty straightforward. Let's make an expression and run it.

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
	fmt.Println(expr.(Eval).Eval()) // 10.89
	fmt.Println(expr.(Printer).Print()) // ((1.1 + 2.2) * 3.3)
}
```

Job done, right? Well, not quite. We've almost got a full solution except for the casting from `Expr` to `Eval` and `Printer`. This, unfortunately, means that we run into type errors at runtime, not compile time.

```go
expr := &BinaryPlus{left: "abc", right: &Constant{value: 1.23}}
fmt.Println(expr.(Eval).Eval()) // Uh oh, panic
```

The question is, is there a way for us to get static type safety? 🤔

## Object algebras in Go
