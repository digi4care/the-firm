# Primary Sources and Tests

## Primary Sources

Prefer sources in this order:
- project tests and runtime verification
- MDN Web Docs
- ECMAScript specification
- TC39 proposals for upcoming features
- Can I Use for compatibility
- Node.js docs for Node-specific APIs
- engine blogs for implementation details

## Test Expectations

Run project tests when they exist for the concept under review.

Typical checks:
- documentation outputs match runtime behavior
- concept examples are covered by tests where possible
- missing coverage is called out explicitly rather than ignored

## External Resource Checks

When a page links to outside material, confirm:
- the link works
- the content is still accessible
- the resource is JavaScript-focused
- the description in the page matches the actual resource
- the source does not teach obvious anti-patterns or outdated guidance
