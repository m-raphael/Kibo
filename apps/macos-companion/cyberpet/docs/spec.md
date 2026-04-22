# Product and Technical Spec

## Summary
CyberPet is a macOS companion app for Kibo.

## Principles
- Trust over speed
- Small changes over giant refactors
- Clear source of truth
- Reviewable PRs
- Security first
- Local-first processing by default

## Core MVP
- macOS shell
- camera permission flow
- face tracking service
- automatic mascot generation from non-sensitive cues
- one mascot family
- idle / attentive / listening / speaking / happy / tired states

## Guardrails
- No race or ethnicity inference
- No sensitive biometric categorization
- No raw frame storage by default
- No scope expansion without approval
