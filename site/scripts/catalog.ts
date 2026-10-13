// The catalogue as JSON, for build/build.py, which is Python and cannot import
// data/notes.ts itself.
import { notes } from "../data/notes";

console.log(JSON.stringify(notes));
