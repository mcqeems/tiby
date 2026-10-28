# Source art (not served)

These files used to live in `public/`, which Next.js serves verbatim, but
nothing in `app/`, `components/`, `lib/`, or `globals.css` referenced them —
they were shipping 3.3 MB of unused art on every deploy.

They are kept here as source material: mascot poses, hand variants, the
unused `sleep` emotion, raw logo exports, and two wordmark Lottie files
(`logo/lottie/tiby-logo-scale-x2*.json`, 1196x600, 7s / 6s).

Move a file back into `public/` when something actually references it, for
example the logo animation:

    git mv src-assets/logo/lottie/tiby-logo-scale-x2.json public/logo/lottie/
