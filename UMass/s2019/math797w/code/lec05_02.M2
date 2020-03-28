R = ZZ/101[x,y,z,x0,y0,z0,a,b,c,t] -* initialize all parameters *-
cubic = x^3+y^3+z^3+1-(x+y+z+1)^3 -* cubic *-
cubt = sub(cubic, {x=>x0+a*t, y=>y0+b*t, z=>z0+c*t}) -* substitute parametric equation of line *-
cubic0 = sub(cubt, t=>0) -* constant term *-
cubic1 = sub(diff(t,cubt), t=>0) -* linear term *-
cubic2 = sub(diff(t,diff(t,cubt)), t=>0) -* quadratic term *-
cubic3 = sub(diff(t,diff(t,diff(t,cubt))), t=>0) -* cubic term *-
Lines = ideal(cubic0,cubic1,cubic2,cubic3) -* set identically zero *-
L=decompose Lines -* find all ideals *-
#L -* should be 25 *-
f = x^3+y^3+z^3-(x+y+z)^3 -* ideal at infinity *-
factor f -* three lines *-