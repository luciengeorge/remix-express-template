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
  const REPLACER = 'remix-express-template'
  const DIR_NAME = path.basename(rootDirectory)
  const SUFFIX = getRandomString(2)
  const APP_NAME = (DIR_NAME + '-' + SUFFIX)
    // get rid of anything that's not allowed in an app name
    .replace(/[^a-zA-Z0-9-_]/g, '-')

  const [prodContent, readme, env, packageJson, siteMap, serverFile] =
    await Promise.all([
      fs.readFile(FLY_TOML_PATH, 'utf-8'),
      fs.readFile(README_PATH, 'utf-8'),
      fs.readFile(EXAMPLE_ENV_PATH, 'utf-8'),
      fs.readFile(PACKAGE_JSON_PATH, 'utf-8'),
      fs.readFile(SITEMAP_PATH, 'utf-8'),
      fs.readFile(SERVER_PATH, 'utf-8'),
    ])

  const newEnv = env
    .replace(/^TOAST_SECRET=.*$/m, `TOAST_SECRET="${getRandomString(32)}"`)
    .replace(/^CSRF_SECRET=.*$/m, `CSRF_SECRET="${getRandomString(32)}"`)
    .replace(/^VERIFY_SECRET=.*$/m, `VERIFY_SECRET="${getRandomString(32)}"`)
    .replace(
      /^HONEYPOT_SECRET=.*$/m,
      `HONEYPOT_SECRET="${getRandomString(32)}"`,
    )
    .replace(/^SESSION_SECRET=.*$/m, `SESSION_SECRET="${getRandomString(32)}"`)

  const prodToml = toml.parse(prodContent)
  prodToml.app = prodToml.app.replace(REPLACER, APP_NAME)

  const newReadme = readme.replace(
    new RegExp(escapeRegExp(REPLACER), 'g'),
    APP_NAME,
  )

  const newPackageJson =
    JSON.stringify(
      sort({...JSON.parse(packageJson), name: APP_NAME}),
      null,
      2,
    ) + '\n'

  const {websiteUrl} = await inquirer.prompt([
    {
      type: 'input',
      name: 'websiteUrl',
      message:
        'What is the URL of your website? It will be used for the sitemap. (Enter to skip):',
      transformer: (input) => input.trim().toLowerCase(),
    },
  ])

  const newSitemap = siteMap.replace(
    /siteUrl: '<YOUR_DOMAIN_URL>'/,
    `siteUrl: '${websiteUrl}'`,
  )
  const newServerFile = serverFile.replace(
    /process.env.NODE_ENV === 'production'\n\s+\? '<YOUR_DOMAIN_URL>'/,
    `process.env.NODE_ENV === 'production'\n    ? '${websiteUrl}'`,
  )

  if (!websiteUrl) {
    console.log(
      `Skipped. Don't forget to update the sitemap with your website URL later in remix-sitemap.config.cjs and server.js.`,
    )
  }

  await Promise.all([
    fs.writeFile(FLY_TOML_PATH, toml.stringify(prodToml)),
    fs.writeFile(README_PATH, newReadme),
    fs.writeFile(ENV_PATH, newEnv),
    fs.writeFile(PACKAGE_JSON_PATH, newPackageJson),
    fs.copyFile(
      path.join(rootDirectory, 'remix.init', 'gitignore'),
      path.join(rootDirectory, '.gitignore'),
    ),
    websiteUrl ? fs.writeFile(SITEMAP_PATH, newSitemap) : Promise.resolve(),
    websiteUrl ? fs.writeFile(SERVER_PATH, newServerFile) : Promise.resolve(),
  ])
  execSync(`npm run setup`, {stdio: 'inherit', cwd: rootDirectory})

  try {
    console.log('Running Prettier on the project...')
    execSync(`npx prettier --write .`, {stdio: 'inherit', cwd: rootDirectory})
  } catch (error) {
    console.error('Error running Prettier: ', error.message)
  }

  // Run git commands
  try {
    console.log('Running git commands...')
    execSync(`git add .`, {stdio: 'inherit', cwd: rootDirectory})
    execSync(`git commit -m "Initial commit"`, {
      stdio: 'inherit',
      cwd: rootDirectory,
    })
    console.log('Git commit created.')
  } catch (error) {
    console.error('Error running git commands: ', error.message)
  }

  console.log(
    `Setup is complete. You're now ready to rock and roll 🤘

Start development with \`npm run dev\`
    `.trim(),
  )
}

module.exports = main
