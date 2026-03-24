# Security Policy

## Scope

This policy covers the **`@phasio/sdk`** npm package (`packages/sdk/`).

The Phasio web platform (frontend and backend) is proprietary. Security issues affecting **api.phasio.in** or **phasio.in** should be reported via the same process below but will be handled privately.

## Supported Versions

| Version      | Supported |
| ------------ | --------- |
| 0.x (latest) | ✅        |
| older        | ❌        |

Always use the latest version of `@phasio/sdk`.

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities by emailing: **yagnesh.khamar@appunik.com**

Include:

- A clear description of the vulnerability
- Steps to reproduce
- Potential impact
- SDK version affected
- Your suggested fix if you have one

### What to expect

- Acknowledgement within **48 hours**
- A fix or mitigation plan within **14 days** for critical issues
- Credit in the changelog if you want it

## Out of Scope

- Issues requiring physical access to a user's machine
- Social engineering attacks
- Rate limiting on the free tier (this is by design)
- Vulnerabilities in dependencies — report those upstream and open a standard GitHub issue here so we can update

## Safe Harbor

We will not pursue legal action against researchers who:

- Report vulnerabilities in good faith via the process above
- Do not access, modify, or delete user data
- Do not disrupt the Phasio service
