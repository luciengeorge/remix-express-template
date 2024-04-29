#!/usr/bin/env node

import {$} from 'execa'
import {writeFile} from 'node:fs/promises'

console.log('setting up swapfile...')
try {
	await $`fallocate -l 512M /swapfile`
	console.log('fallocate done')
	await $`chmod 0600 /swapfile`
	console.log('chmod done')
	const mkswapOutput = await $`mkswap /swapfile`
	console.log('mkswap output:', mkswapOutput.stdout)
	await writeFile('/proc/sys/vm/swappiness', '10')
	console.log('swappiness set')
	await $`swapon /swapfile`
	console.log('swapon done')
	await writeFile('/proc/sys/vm/overcommit_memory', '1')
	console.log('overcommit_memory set')
	console.log('swapfile setup complete')
} catch (error) {
	console.error('Error during setup:', error)
}
