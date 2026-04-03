# Verification Methodology

Use a five-phase process for factual verification.

## 1. Code Example Verification

- identify every code block
- verify outputs and comments
- confirm wrong examples are actually wrong for the reason claimed
- check major examples against project tests when they exist

## 2. Documentation Verification

- validate MDN links and API descriptions
- check signatures, return values, side effects, and exceptions
- verify browser support and deprecation status where relevant

## 3. Specification Verification

Use the ECMAScript specification for nuanced or absolute claims, especially around coercion, equality, execution order, and promises.

## 4. External Resource Verification

- ensure links load
- ensure resources are JavaScript-focused and not misleading
- prefer recent resources for modern-language topics

## 5. Technical Claims Audit

Scrutinize claims using words like "always", "never", or strong performance assertions. Require nuance and sourcing.
