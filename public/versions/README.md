# Preserved zine edition

Live route: `/zine/`.

`portfolio-zine-v1-source.zip` contains the complete source tree at commit `22a93bd166bae0452235038d9030cccee357af05`, before the cartridge version was added. It includes the original package lock, source, public assets, tests, and credits. It excludes generated dependencies/build files.

To run it independently, unzip, enter `portfolio-zine`, run `npm ci`, then `npm run dev`. For a standalone hosted site use `npm run build` and deploy the resulting `dist` folder at the root of its own domain.

The same snapshot is recorded locally by the Git tag `portfolio-zine-v1`. The current repository also retains the zine entry at `/zine/`; the archive remains the immutable original if shared content changes later.
