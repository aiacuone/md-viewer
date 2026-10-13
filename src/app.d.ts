/// <reference types="@sveltejs/kit" />
/// <reference types="vite-plugin-pwa/svelte" />
/// <reference types="vite-plugin-pwa/info" />
/// <reference types="vite-plugin-pwa/vanillajs" />

declare global {
	namespace App {
		interface Locals {
			user: { email: string } | null;
		}
	}
}

export {};
