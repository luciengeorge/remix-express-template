import bcrypt from 'bcryptjs'
import {prisma} from '~/utils/db.server'

async function seed() {
	const email = 'hello@remix.run'

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
	.catch(e => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})
