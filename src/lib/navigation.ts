import { goto } from '$app/navigation';
import { browser } from '$app/environment';

export function goBack(fallback = '/'): void {
	if (browser && window.history.length > 1) {
		history.back();
	} else {
		goto(fallback);
	}
}
