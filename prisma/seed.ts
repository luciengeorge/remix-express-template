import bcrypt from 'bcryptjs'
import {prisma} from '~/utils/db.server'

async function seed() {
  const email = 'email@remix.run'

  // cleanup the existing database
  await prisma.user.delete({where: {email}}).catch(() => {
    // no worries if it doesn't exist yet
  })

  const hashedPassword = await bcrypt.hash('password', 10)

  await prisma.user.create({
    data: {
      email,
      password: {
        create: {
          hash: hashedPassword,
        },
      },
    },
  })

  console.log(`Database has been seeded. 🌱`)
}

seed()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
