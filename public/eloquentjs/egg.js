// Interpreter
//
// Skips until a non-whitespace character or non-commented line is found
function skipSpace(string) {
  // TODO: fix this up
  let first = string.search(/\S/);
  if (first == -1) return "";
  return string.slice(first);
}

// Parses a string, number or identifier and checks whether the expression is an
// application
function parseExpression(program) {
  program = skipSpace(program);
  let match, expr;
  if ((match = /^"([^"]*)"/.exec(program))) {
    // matches a string
    expr = { type: "value", value: match[1] };
  } else if ((match = /^\d+\b/.exec(program))) {
    // matches a number (int)
    expr = { type: "value", value: Number(match[0]) };
  } else if ((match = /^[^\s(),#"]+/.exec(program))) {
    // matches an identifier
    expr = { type: "identifier", name: match[0] };
  } else {
    throw new SyntaxError("Unexpected syntax: " + program);
  }

  return parseApply(expr, program.slice(match[0].length));
}

// Parses a function application, recursively parsing arguments
function parseApply(expr, program) {
  program = skipSpace(program);
  if (program[0] != "(") {
    return { expr: expr, rest: program };
  }

  program = skipSpace(program.slice(1));
  expr = { type: "apply", operator: expr, args: [] };
  while (program[0] != ")") {
    let arg = parseExpression(program);
    expr.args.push(arg.expr);
    program = skipSpace(arg.rest);
    if (program[0] == ",") {
      program = skipSpace(program.slice(1));
    } else if (program[0] != ")") {
      throw new SyntaxError("Expected ',' or ')'");
    }
  }

  return parseApply(expr, program.slice(1));
}

// Turns an Egg program into a syntax tree
function parse(program) {
  let { expr, rest } = parseExpression(program);
  if (skipSpace(rest).length > 0) {
    throw new SyntaxError("Unexpected text after program");
  }

  return expr;
}

// Evaluator
//
// Given a syntax tree and a scope object, it will evaluate the expression that
// the tree represents and return the value that this produces.
function evaluate(expr, scope) {
  if (expr.type == "value") {
    return expr.value;
  } else if (expr.type == "identifier") {
    if (expr.name in scope) {
      return scope[expr.name];
    } else {
      throw new ReferenceError(`Undefined binding: ${expr.name}`);
    }
  } else if (expr.type == "apply") {
    let { operator, args } = expr;
    if (operator.type == "identifier" && operator.name in specialForms) {
      return specialForms[operator.name](expr.args, scope);
    } else {
      let op = evaluate(operator, scope);
      if (typeof op == "function") {
        return op(...args.map((arg) => evaluate(arg, scope)));
      } else {
        throw new TypeError("Applying a non-function.");
      }
    }
  } else {
    throw new SyntaxError(`Unknown expression type: ${expr.type}`);
  }
}

// Some operators (like if) need to be treated specially
// Here we cheat a bit and use constructs from JavaScript
const specialForms = Object.create(null);

specialForms.if = (args, scope) => {
  if (args.length != 3) {
    throw new SyntaxError("Wrong number of args to if");
  } else if (evaluate(args[0], scope) !== false) {
    return evaluate(args[1], scope);
  } else {
    return evaluate(args[2], scope);
  }
};

specialForms.while = (args, scope) => {
  if (args.length != 2) {
    throw new SyntaxError("Wrong number of args to while");
  }
  while (evaluate(args[0], scope) !== false) {
    evaluate(args[1], scope);
  }

  // Need to return something since everything is an expression
  return false;
};

specialForms.do = (args, scope) => {
  let value = false;
  for (let arg of args) {
    value = evaluate(arg, scope);
  }

  return value;
};

specialForms.define = (args, scope) => {
  if (args.length != 2 || args[0].type != "identifier") {
    throw new SyntaxError("Incorrect use of define");
  }

  let value = evaluate(args[1], scope);
  scope[args[0].name] = value;

  return value;
};

specialForms.fun = (args, scope) => {
  if (!args.length) {
    throw new SyntaxError("Functions need a body");
  }

  let body = args[args.length - 1];
  let params = args.slice(0, args.length - 1).map((expr) => {
    if (expr.type != "identifier") {
      throw new SyntaxError("Parameter names must be words");
    }
    return expr.name;
  });

  return function () {
    if (arguments.length != params.length) {
      throw new TypeError("Wrong number of arguments");
    }

    let localScope = Object.create(scope);
    for (let i = 0; i < arguments.length; i++) {
      localScope[params[i]] = arguments[i];
    }

    return evaluate(body, localScope);
  };
};

specialForms.set = (args, scope) => {
  if (args.length != 2 || args[0].type != "identifier") {
    throw new SyntaxError("Incorrect use of set");
  }

  let value = evaluate(args[1], scope);
  let name = args[0].name;

  for (let s = scope; s; s = Object.getPrototypeOf(s)) {
    if (Object.prototype.hasOwnProperty(s, name)) {
      s[name] = value;
      return value;
    }
  }

  throw new ReferenceError(`Could not find ${name} in any scope.`);
};

// We define a global scope that other scopes will derive from
const globalScope = Object.create(null);

globalScope.true = true;
globalScope.false = false;

for (let op of ["+", "-", "*", "/", "==", "<", ">"]) {
  globalScope[op] = Function("a, b", `return a ${op} b;`);
}

globalScope.print = (value) => {
  console.log(value);
  return value;
};

globalScope.array = (...values) => {
  return [...values];
};

globalScope.length = (array) => {
  return array.length;
};

globalScope.element = (array, n) => {
  return array[n];
};

// Convenience function to run a program in a fresh scope
function run(program) {
  return evaluate(parse(program), Object.create(globalScope));
}

// Compiler

// View
function elt(name, props, ...children) {
  let dom = document.createElement(name);
  if (props) Object.assign(dom, props);
  for (let child of children) {
    if (typeof child != "string") dom.appendChild(child);
    else dom.appendChild(document.createTextNode(child));
  }

  return dom;
}

function interpreterView(program) {
  try {
    let parseTree = parse(program);
    let parseTreeString = JSON.stringify(parseTree, null, 2);
    let parseTreeElt = elt(
      "div",
      null,
      elt("h2", null, "Parse Tree"),
      elt("pre", null, parseTreeString)
    );

    let evaluation = evaluate(parseTree, Object.create(globalScope));
    let evalElt = elt(
      "div",
      null,
      elt("h2", null, "Output"),
      elt("pre", null, String(evaluation))
    );

    return elt(
      "div",
      null,
      elt("h1", null, "Interpreter"),
      evalElt,
      parseTreeElt
    );
  } catch (err) {
    return elt(
      "div",
      null,
      elt("h1", null, "Interpreter"),
      elt("h2", null, "Output"),
      err.toString()
    );
  }
}
function compilerView(program) {}

class App {
  constructor(init) {
    let app = this;
    this.input = elt(
      "textarea",
      {
        oninput(e) {
          e.preventDefault();
          app.update(e.target.value);
        },
      },
      init
    );
    this.output = elt("div", null);
    this.dom = elt(
      "div",
      null,
      elt("h1", null, "Egg"),
      this.input,
      this.output
    );

    this.update(init);
  }

  update(program) {
    if (this.program == program) return;
    this.program = program;

    this.output.innerHTML = "";
    this.output.appendChild(interpreterView(program));
    // this.output.appendChild(compilerView(program));
  }
}

// Run app

const EXAMPLES = [
  `do(define(sum, fun(array,
     do(define(i, 0),
        define(sum, 0),
        while(<(i, length(array)),
          do(define(sum, +(sum, element(array, i))),
             define(i, +(i, 1)))),
        sum))),
   print(sum(array(1, 2, 3))))`,
  `do(define(f, fun(a, fun(b, +(a, b)))),
   print(f(4)(5)))`,
  `do(define(pow, fun(base, exp,
     if(==(exp, 0),
        1,
        *(base, pow(base, -(exp, 1)))))),
   print(pow(2, 10)))`,
];

const PROGRAM = EXAMPLES[Math.floor(Math.random() * 3)];

document.getElementById("root").appendChild(new App(PROGRAM).dom);
