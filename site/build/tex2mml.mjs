// Convert a note's formulas from TeX to MathML with MathJax, in document order.
//
// stdin:  {"macros": {...}, "items": [{"tex": "...", "display": true}, ...]}
// stdout: {"results": [{"mml": "<math ...>"} | {"error": "..."}, ...]}
//
// One TeX input jax serves the whole note, so equation numbers run on from one
// formula to the next as they do in the PDF. Errors are returned per formula
// instead of being rendered, and build.py decides what to show in their place.
import fs from 'fs';
import {mathjax} from 'mathjax-full/js/mathjax.js';
import {TeX} from 'mathjax-full/js/input/tex.js';
import {liteAdaptor} from 'mathjax-full/js/adaptors/liteAdaptor.js';
import {RegisterHTMLHandler} from 'mathjax-full/js/handlers/html.js';
import {AllPackages} from 'mathjax-full/js/input/tex/AllPackages.js';
import 'mathjax-full/js/input/tex/physics/PhysicsConfiguration.js';
import {STATE} from 'mathjax-full/js/core/MathItem.js';
import {SerializedMmlVisitor} from 'mathjax-full/js/core/MmlTree/SerializedMmlVisitor.js';
import {MapHandler} from 'mathjax-full/js/input/tex/MapHandler.js';
import {Macro} from 'mathjax-full/js/input/tex/Symbol.js';

const {macros, items} = JSON.parse(fs.readFileSync(0, 'utf8'));
RegisterHTMLHandler(liteAdaptor());

// \operatorname, and so every \DeclareMathOperator, is spaced by MathJax from
// its TeX class, which the MathML does not keep: `\Spec A` would read SpecA.
// Like \sin, it is made a function here, which puts a function application
// (U+2061) after it and its scripts, for mathml_core.py to space.
const ams = MapHandler.getMap('AMSmath-macros');
const operatorname = ams.lookup('operatorname').func;
ams.add('operatorname', new Macro('operatorname', (parser, name) => {
  const push = parser.Push;
  parser.Push = (mml) => push.call(parser, parser.itemFactory.create('fn', mml));
  try {
    return operatorname(parser, name);
  } finally {
    parser.Push = push;
  }
}));

// noundefined and noerrors would turn mistakes into red text; we want to know.
// bussproofs needs an output jax to measure with, and the notes have no proof trees.
const packages = [...AllPackages.filter((p) => !['noundefined', 'noerrors', 'bussproofs'].includes(p)), 'physics'];
const tex = new TeX({
  packages,
  macros,
  tags: 'ams',
  formatError: (_jax, err) => { throw err; },
});
const doc = mathjax.document('', {InputJax: tex});
const visitor = new SerializedMmlVisitor();

const results = items.map(({tex: source, display}) => {
  try {
    const node = doc.convert(source, {display, end: STATE.CONVERT});
    return {mml: visitor.visitTree(node, doc)};
  } catch (err) {
    return {error: String(err.message || err)};
  }
});
process.stdout.write(JSON.stringify({results}));
