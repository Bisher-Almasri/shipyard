import { writable } from 'svelte/store';

export interface Toast {
	id: number;
	message: string;
	type: 'success' | 'error' | 'info';
	duration?: number;
}

const { subscribe, update } = writable<Toast[]>([]);

let idCounter = 0;

export const toast = {
	subscribe,
	add: (message: string, type: Toast['type'] = 'info', duration = 3000) => {
		const id = idCounter++;
		update((all) => [...all, { id, message, type, duration }]);
		if (duration) {
			setTimeout(() => {
				toast.remove(id);
			}, duration);
		}
	},
	success: (message: string, duration?: number) => toast.add(message, 'success', duration),
	error: (message: string, duration?: number) => toast.add(message, 'error', duration),
	info: (message: string, duration?: number) => toast.add(message, 'info', duration),
	remove: (id: number) => {
		update((all) => all.filter((t) => t.id !== id));
	}
};
