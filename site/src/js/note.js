// On a note page: the contents start open where they sit beside the text, and
// closed where they would push the text below the fold.
const toc = document.querySelector(".toc details");
const wide = matchMedia("(min-width: 64rem)");

function fit() {
  if (toc) toc.open = wide.matches;
}

fit();
wide.addEventListener("change", fit);
