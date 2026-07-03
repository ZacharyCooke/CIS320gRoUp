# iOS Setup & Build Workflow

**Context:** This project is developed primarily on Windows. Xcode only runs on
macOS, so iOS builds require occasional access to a Mac (school lab, borrowed
machine, etc.). This doc covers the one-time setup and the ongoing workflow.

---

## One-time setup (on a Mac)

1. **Clone the repo** on the Mac (push to GitHub/GitLab from Windows first if
   you haven't already):
   ```
   git clone <repo-url>
   ```

2. **Install Xcode** from the Mac App Store, if not already installed.
   Large download (10+ GB) — do this ahead of time if possible.

3. **Install XcodeGen** via Homebrew:
   ```
   brew install xcodegen
   ```
   If Homebrew isn't installed, get it from https://brew.sh first.

4. **Confirm the scaffold files are in place** at `ios/PetRecovery/`:
   - `project.yml`
   - `PetRecovery.entitlements`

   These should already be in the repo. If missing, they need to be added
   before generating the project.

5. **Generate the Xcode project:**
   ```
   cd ios/PetRecovery
   xcodegen generate
   ```
   This produces `PetRecovery.xcodeproj`. Open it with:
   ```
   open PetRecovery.xcodeproj
   ```

6. **Fix the bundle identifier.** `project.yml` currently uses a placeholder
   (`com.petrecovery.app`). In Xcode: select the target → **Signing &
   Capabilities** → replace with the actual registered bundle ID before
   signing or running on a physical device. A placeholder is fine for
   simulator-only testing.

---

## Ongoing workflow

- **Day-to-day Swift editing happens on Windows** (VS Code, Claude Code,
  etc.) — `.swift` files are plain text, no Mac required to write them.
- **Push to git from Windows** as normal.
- **Periodically, on the Mac:** pull the latest changes, re-run
  `xcodegen generate` if `project.yml` changed or new source files were
  added, then build/run to confirm things actually compile.
- `PetRecovery.xcodeproj` is **not committed to git** (it's in
  `.gitignore`). Every machine regenerates its own copy from `project.yml`,
  which avoids Xcode project merge conflicts entirely. `project.yml` is the
  source of truth — edit that, not the generated `.xcodeproj`, when adding
  new source folders or dependencies.

---

## When you need to regenerate

Re-run `xcodegen generate` after:
- Adding a new top-level source folder (currently: `App/`, `Models/`,
  `Services/`, `Views/`)
- Changing a dependency in the `packages:` section of `project.yml`
  (e.g. bumping the Stripe SDK version)
- Changing capabilities, entitlements, or bundle settings in `project.yml`

You do **not** need to regenerate for routine changes to existing `.swift`
files — only when the project *structure* changes.

---

## Known gaps as of this writing

- Bundle ID in `project.yml` is a placeholder — needs to be swapped for the
  real registered identifier.
- Stripe SPM package product name (`StripePaymentSheet` in `project.yml`) is
  a best guess — confirm it matches whichever Stripe module the reward/escrow
  flow actually uses, and adjust if needed.
- No push notification certificates/keys are configured yet — the
  entitlement (`aps-environment`) is in place, but APNs setup (certificates
  or auth keys in Apple Developer + your backend's push service) is a
  separate step not covered here.
