# Documentation reference

All canonical documentation for The Stem now lives under the [MustardSeedNetworks](../MustardSeedNetworks) workspace. The files that used to live in this repository are now maintained there; make your changes in MustardSeedNetworks and keep this folder as a lightweight pointer so we never drift between copies.

| Former `stem/docs/` file | Canonical location in MustardSeedNetworks |
|--------------------------|------------------------------------------|
| `API_REFERENCE.md`       | `05-Engineering/API_REFERENCE.md` (general API reference) and `03-The-Stem/THE_STEM_API_REFERENCE.md` (product-specific notes) |
| `MODULE_STATUS.md`       | `03-The-Stem/THE_STEM_IMPLEMENTATION_SPEC.md` covers current module/test status; `03-The-Stem/THE_STEM_ARCHITECTURE_DIAGRAMS.md` captures the system block view |
| `IMPLEMENTATION_PLAN.md` | `03-The-Stem/THE_STEM_IMPLEMENTATION_SPEC.md` is the plan of record for ongoing implementation work |

If new documentation is needed for The Stem, add it under MustardSeedNetworks (use the `03-The-Stem` and `05-Engineering` folders as appropriate) and then update this table to point to the new file so readers here know where to look.
