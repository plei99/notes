E = QQ[x] -* polynomial ring *-
ideal(x^2+1) -* ideal of i *-
isPrime oo -* true *-
clearAll
E = QQ[x,I]/ideal(I^2+1) -* i is in the ring *-
A = ideal(x^2+1)
isPrime A -* false *-
L = decompose A -* List of two ideals *-
length L -* 2 *-
L_0 -* x-i *-
L_1 -* x+i *-
clearAll