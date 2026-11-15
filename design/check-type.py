#!/usr/bin/env python3
"""Fails if app-v3.html uses a font size, weight or letter-spacing outside the type system in docs/21."""
import re,sys
s=open(__file__.replace('check-type.py','app-v3.html')).read()
bad=[]
for v in set(re.findall(r'font-size:\s*([0-9.]+px)',s)):
    if v not in {'10px','12px','14px','16px','20px','28px','40px'}: bad.append('size '+v)
for v in set(re.findall(r'font-weight:\s*([0-9]{3})',s)):
    if v not in {'300','400','500','600','700'}: bad.append('weight '+v)
for v in set(re.findall(r'letter-spacing:\s*(-?[0-9.]+em)',s)):
    if v not in {'.1em','-.02em','0em'}: bad.append('letter-spacing '+v)
print('\n'.join(bad) if bad else 'type system ok'); sys.exit(1 if bad else 0)
