---
'@fuerte/core': patch
---

Remove "instanceOf" check and replace it with "isPrototypeOf". The reason for this
is because "instanceOf" does not work in IE11.
