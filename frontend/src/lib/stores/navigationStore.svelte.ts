import { sfx } from '#lib/audio/sfx';

export type ActiveView = 'spire' | 'equipment' | 'boons' | 'minigames';

class NavigationStore {
	public currentView = $state<ActiveView>('spire');

	public setView(view: ActiveView) {
		if (this.currentView !== view) {
			this.currentView = view;
			sfx.playSlash();
		}
	}
}

export const nav = new NavigationStore();
