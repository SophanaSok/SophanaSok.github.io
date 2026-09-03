# Working on this site

Astro static site, npm only, zero runtime dependencies. `npm run verify` is
the bar: build, `astro check`, and `node --test`.

## Rules the tests enforce

- **Every number names its method.** A metric without a `how` fails the
  schema. Change a number only by recounting (`npm run stats`) or by updating
  the `how` string to the command that produced the new value.
- **Public work only.** A project record needs a `repo` under
  `github.com/SophanaSok/`. No "private" entries, no unlinked claims.
- **No contact address, no employer, no placeholders.** The list in
  `src/lib/site.ts` (`PLACEHOLDERS`) is grepped across `src/` and `dist/`.
  The one line about the present is `profile.now`.
- **No version literal outside `src/content/`.** Versions live in the records.
- **Palette stays AA.** `tests/tokens.test.mjs` computes contrast from
  `tokens.css`; if a colour changes, both the system and the chosen block
  change together.
- **Every script is hashed.** The theme boot script is inlined from
  `src/lib/theme-boot.js` and hashed in `astro.config.mjs`; edit the file, not
  the tag. Other scripts are Astro-processed `<script>` blocks.

## Shape

- `src/lib/*.ts` is erasable TypeScript: the `.mjs` tests import it under
  Node's type stripping, so no enums, no parameter properties, no decorators.
- The lens is CSS: radios in `LensControl.astro`, rules in `lens.css`,
  `data-lens` and `--o-<lens>` on every ranked element, `[data-for]` on every
  sentence that changes. Scripts only sync the hash and the number keys.
- The hero (`Shell.astro`, `shell.css`) is drawn from the same records as the
  ledger; never type a number into it.
- Nothing binary under `src/`; screenshots go in `public/projects/<slug>/`.
