import type { NextConfig } from 'next'

// The git repo root is the PARENT folder (DGL_SAS_project), so Next/Turbopack
// would otherwise infer that as the workspace root and try to resolve packages
// like `tailwindcss` from there instead of SAS/node_modules — breaking the CSS
// build with "Can't resolve 'tailwindcss'".
//
// `__dirname` is unreliable in a TS/ESM next.config, so we pin the root to the
// directory the dev/build command runs from. Always run `npm run dev` / `npm run
// build` from inside the SAS folder so this resolves to SAS.
const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: ['10.189.227.119'],
  outputFileTracingRoot: process.cwd(),
}

export default nextConfig
