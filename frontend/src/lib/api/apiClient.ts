import type { Player, OfflineReport, ActiveBuff } from '#lib/types/game';

const API_BASE = '/api';

export class ApiClient {
	private guestToken: string | null = null;

	constructor() {
		if (typeof window !== 'undefined') {
			this.guestToken = localStorage.getItem('rair_guest_token');
		}
	}

	public getGuestToken(): string | null {
		return this.guestToken;
	}

	public setGuestToken(token: string) {
		this.guestToken = token;
		if (typeof window !== 'undefined') {
			localStorage.setItem('rair_guest_token', token);
		}
	}

	private getHeaders(): Record<string, string> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};
		if (this.guestToken) {
			headers['x-guest-token'] = this.guestToken;
		}
		return headers;
	}

	public async initPlayer(handle?: string): Promise<{ player: Player; offline_report: OfflineReport | null; is_new: boolean }> {
		const res = await fetch(`${API_BASE}/player/init`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				guest_token: this.guestToken,
				handle: handle || 'Ascendant Rogue'
			})
		});
		if (!res.ok) {
			throw new Error(`Init failed with status ${res.status}`);
		}
		const data = await res.json();
		if (data.player && data.player.guest_token) {
			this.setGuestToken(data.player.guest_token);
		}
		return data;
	}

	public clearSession() {
		this.guestToken = null;
		if (typeof window !== 'undefined') {
			localStorage.removeItem('rair_guest_token');
		}
	}

	public async syncPlayer(player: Player): Promise<boolean> {
		if (!this.guestToken) return false;
		try {
			const res = await fetch(`${API_BASE}/player/sync`, {
				method: 'POST',
				headers: this.getHeaders(),
				body: JSON.stringify({
					player_id: player.player_id,
					guest_token: this.guestToken,
					active_run: player.active_run,
					stats: player.stats,
					equipped_gear: player.equipped_gear,
					inventory: player.inventory,
					ascension_tree: player.ascension_tree,
					highest_floor: player.highest_floor,
					handle: player.handle,
					auth_provider: player.auth_provider,
					google_id: player.google_id,
					email: player.email,
					avatar_url: player.avatar_url,
					is_guest: player.is_guest
				})
			});
			return res.ok;
		} catch (err) {
			console.warn('Sync failed (offline):', err);
			return false;
		}
	}

	public async resetPlayer(): Promise<{ status: string; message: string; player: Player }> {
		const res = await fetch(`${API_BASE}/player/reset`, {
			method: 'POST',
			headers: this.getHeaders()
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.detail || 'Reset failed');
		}
		return res.json();
	}

	public async getAuthConfig(): Promise<{ google_client_id: string; is_google_auth_available: boolean }> {
		try {
			const res = await fetch(`${API_BASE}/auth/config`);
			if (!res.ok) return { google_client_id: '', is_google_auth_available: false };
			return res.json();
		} catch {
			return { google_client_id: '', is_google_auth_available: false };
		}
	}

	public async loginWithGoogle(payload: {
		credential?: string;
		google_id?: string;
		email?: string;
		name?: string;
		picture?: string;
		guest_token_to_link?: string;
	}): Promise<{ player: Player; token: string; offline_report: OfflineReport | null; is_new: boolean; linked?: boolean }> {
		const res = await fetch(`${API_BASE}/auth/google`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.detail || 'Google sign-in failed');
		}
		const data = await res.json();
		if (data.token) {
			this.setGuestToken(data.token);
		}
		return data;
	}

	public async linkGoogleAccount(payload: {
		credential?: string;
		google_id?: string;
		email?: string;
		name?: string;
		picture?: string;
		conflict_strategy?: 'keep_guest' | 'load_cloud';
	}): Promise<any> {
		if (!this.guestToken) {
			throw new Error('No active guest session to link');
		}
		const res = await fetch(`${API_BASE}/auth/link-google`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				...payload,
				guest_token: this.guestToken
			})
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.detail || 'Linking Google account failed');
		}
		const data = await res.json();
		if (data.token) {
			this.setGuestToken(data.token);
		}
		return data;
	}

	public async loginAsGuest(handle?: string, clearExisting: boolean = false): Promise<{ player: Player; token: string; is_new: boolean }> {
		if (clearExisting && typeof window !== 'undefined') {
			localStorage.removeItem('rair_guest_token');
			this.guestToken = null;
		}
		const res = await fetch(`${API_BASE}/auth/guest`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				guest_token: this.guestToken,
				handle: handle || 'Guest Ascendant'
			})
		});
		if (!res.ok) {
			throw new Error('Guest login failed');
		}
		const data = await res.json();
		if (data.token) {
			this.setGuestToken(data.token);
		}
		return data;
	}

	public async triggerAscension(): Promise<{ sparks_awarded: number; player: Player }> {
		const res = await fetch(`${API_BASE}/ascension/ascend`, {
			method: 'POST',
			headers: this.getHeaders()
		});
		if (!res.ok) {
			const err = await res.json();
			throw new Error(err.detail || 'Ascension failed');
		}
		return res.json();
	}

	public async upgradeConstellationNode(nodeId: string): Promise<any> {
		const res = await fetch(`${API_BASE}/ascension/constellation/upgrade`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify({ node_id: nodeId })
		});
		if (!res.ok) {
			const err = await res.json();
			throw new Error(err.detail || 'Upgrade failed');
		}
		return res.json();
	}

	public async claimMinigameBuff(
		minigameType: string,
		score: number,
		difficultyOrSuccess: string | boolean = 'novice',
		targetStatOrElement: string = 'all_damage',
		durationSeconds: number = 60
	): Promise<ActiveBuff> {
		let difficulty = 'novice';
		let targetStat = 'all_damage';
		let success = true;
		let element = 'fire';

		if (typeof difficultyOrSuccess === 'boolean') {
			success = difficultyOrSuccess;
			element = targetStatOrElement || 'fire';
		} else {
			difficulty = difficultyOrSuccess;
			targetStat = targetStatOrElement;
		}

		const res = await fetch(`${API_BASE}/minigame/claim-buff`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify({
				minigame_type: minigameType,
				score,
				difficulty,
				target_stat: targetStat,
				duration_seconds: durationSeconds,
				success,
				element
			})
		});
		if (!res.ok) {
			throw new Error('Claim buff failed');
		}
		const data = await res.json();
		const buff: ActiveBuff = data.buff;
		if (data.gold_reward !== undefined) {
			buff.gold_reward = data.gold_reward;
		}
		return buff;
	}

	public async salvageItem(itemId: string): Promise<any> {
		const res = await fetch(`${API_BASE}/player/salvage`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: JSON.stringify({ item_id: itemId })
		});
		if (!res.ok) {
			throw new Error('Salvage failed');
		}
		return res.json();
	}

	public async getLeaderboard(): Promise<any[]> {
		const res = await fetch(`${API_BASE}/leaderboard`);
		if (!res.ok) return [];
		const data = await res.json();
		return data.leaderboard || [];
	}
}

export const api = new ApiClient();
