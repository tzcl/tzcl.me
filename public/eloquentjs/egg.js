function elt(name, props, ...children) {
  let dom = document.createElement(name);
  if (props) Object.assign(dom, props);
  for (let child of children) {
    if (typeof child != "string") dom.appendChild(child);
    else dom.appendChild(document.createTextNode(child));
  }

  return dom;
}

class EggTranspiler {
  constructor() {
    this.dom = elt("p", {}, "Hello world!");
  }
}

let app = new EggTranspiler();
document.getElementById("egg").appendChild(app.dom);
