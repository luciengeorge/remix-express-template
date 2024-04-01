const {execSync} = require('child_process')
const crypto = require('crypto')
const fs = require('fs/promises')
const path = require('path')

const toml = require('@iarna/toml')
const sort = require('sort-package-json')

function escapeRegExp(string) {
  // $& means the whole matched string
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getRandomString(length) {
  return crypto.randomBytes(length).toString('hex')
}

async function main({rootDirectory}) {
  const {default: inquirer} = await import('inquirer')
  const README_PATH = path.join(rootDirectory, 'README.md')
  const FLY_TOML_PATH = path.join(rootDirectory, 'fly.toml')
  const EXAMPLE_ENV_PATH = path.join(rootDirectory, '.env.example')
  const ENV_PATH = path.join(rootDirectory, '.env')
  const PACKAGE_JSON_PATH = path.join(rootDirectory, 'package.json')
  const SITEMAP_PATH = path.join(rootDirectory, 'remix-sitemap.config.cjs')
  const SERVER_PATH = path.join(rootDirectory, 'server.js')
  console.log('here1')
  const REPLACER = 'remix-express-template'

  const DIR_NAME = path.basename(rootDirectory)
  const SUFFIX = getRandomString(2)
  console.log('here2')
  const APP_NAME = (DIR_NAME + '-' + SUFFIX)
    // get rid of anything that's not allowed in an app name
    .replace(/[^a-zA-Z0-9-_]/g, '-')
  console.log('here3')
  const [prodContent, readme, env, packageJson, siteMap, serverFile] =
    await Promise.all([
      fs.readFile(FLY_TOML_PATH, 'utf-8'),
      fs.readFile(README_PATH, 'utf-8'),
      fs.readFile(EXAMPLE_ENV_PATH, 'utf-8'),
      fs.readFile(PACKAGE_JSON_PATH, 'utf-8'),
      fs.readFile(SITEMAP_PATH, 'utf-8'),
      fs.readFile(SERVER_PATH, 'utf-8'),
    ])
  console.log('here4')
  env.replace(/^TOAST_SECRET=.*$/m, `TOAST_SECRET="${getRandomString(32)}"`)
  env.replace(/^CSRF_SECRET=.*$/m, `CSRF_SECRET="${getRandomString(32)}"`)
  env.replace(/^VERIFY_SECRET=.*$/m, `VERIFY_SECRET="${getRandomString(32)}"`)
  env.replace(
    /^HONEYPOT_SECRET=.*$/m,
    `HONEYPOT_SECRET="${getRandomString(32)}"`,
  )
  const newEnv = env.replace(
    /^SESSION_SECRET=.*$/m,
    `SESSION_SECRET="${getRandomString(32)}"`,
  )
  console.log('here5')
  const prodToml = toml.parse(prodContent)
  prodToml.app = prodToml.app.replace(REPLACER, APP_NAME)
  console.log('here6')
  const newReadme = readme.replace(
    new RegExp(escapeRegExp(REPLACER), 'g'),
    APP_NAME,
  )
  console.log('here7')
  const newPackageJson =
    JSON.stringify(
      sort({...JSON.parse(packageJson), name: APP_NAME}),
      null,
      2,
    ) + '\n'
  console.log('here8')
  console.log(inquirer)
  const {websiteUrl} = await inquirer.prompt([
    {
      type: 'input',
      name: 'websiteUrl',
      message:
        'What is the URL of your website? It will be used for the sitemap. (Enter to skip)',
    },
  ])
  console.log('here9')
  const trimmedWebsiteUrl = websiteUrl.trim()
  console.log('here10')
  const newSitemap = siteMap.replace(
    /siteUrl: '<YOUR_DOMAIN_URL>'/,
    `siteUrl: '${trimmedWebsiteUrl}'`,
  )
  const newServerFile = serverFile.replace(
    /process.env.NODE_ENV === 'production'\n\s+\? '<YOUR_DOMAIN_URL>'/,
    `process.env.NODE_ENV === 'production'\n    ? '${trimmedWebsiteUrl}'`,
  )
  console.log('here11')
  if (!trimmedWebsiteUrl) {
    console.log(
      `Skipped. Don't forget to update the sitemap with your website URL later in remix-sitemap.config.cjs and server.js.`,
    )
  }
  console.log('here12')
  await Promise.all([
    fs.writeFile(FLY_TOML_PATH, toml.stringify(prodToml)),
    fs.writeFile(README_PATH, newReadme),
    fs.writeFile(ENV_PATH, newEnv),
    fs.writeFile(PACKAGE_JSON_PATH, newPackageJson),
    fs.copyFile(
      path.join(rootDirectory, 'remix.init', 'gitignore'),
      path.join(rootDirectory, '.gitignore'),
    ),
    trimmedWebsiteUrl
      ? fs.writeFile(SITEMAP_PATH, newSitemap)
      : Promise.resolve(),
    trimmedWebsiteUrl
      ? fs.writeFile(SERVER_PATH, newServerFile)
      : Promise.resolve(),
  ])
  console.log('here13')
  execSync(`npm run setup`, {stdio: 'inherit', cwd: rootDirectory})

  console.log(
    `Setup is complete. You're now ready to rock and roll 🤘

Start development with \`npm run dev\`
    `.trim(),
  )
}

module.exports = main
