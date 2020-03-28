(TeX-add-style-hook
 "notes"
 (lambda ()
   (TeX-add-to-alist 'LaTeX-provided-class-options
                     '(("article" "twoside" "10pt")))
   (TeX-run-style-hooks
    "latex2e"
    "article"
    "art10")
   (TeX-add-symbols
    "F"
    "shaf"))
 :latex)

