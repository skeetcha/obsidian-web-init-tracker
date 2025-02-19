import { App, Plugin, PluginSettingTab, Setting, setIcon, Notice } from 'obsidian';
import { PeerVeClient, PeerVeServer } from './utils-p2p';
import { v4 as uuidv4 } from 'uuid';

const conditionData = {
	dnd5e: {
		blinded: {
			name: 'Blinded',
			color: '#525252'
		},
		charmed: {
			name: 'Charmed',
			color: '#f01789'
		},
		concentration: {
			name: 'Concentration',
			color: '#009f7a'
		},
		exhaustion: {
			name: 'Exhaustion',
			color: '#947a47'
		},
		deafened: {
			name: 'Deafened',
			color: '#ababab'
		},
		frightened: {
			name: 'Frightened',
			color: '#c9ca18'
		},
		grappled: {
			name: 'Grappled',
			color: '#8784a0'
		},
		incapacitated: {
			name: 'Incapacitated',
			color: '#3165a0'
		},
		invisible: {
			name: 'Invisible',
			color: '#7ad2d6'
		},
		paralyzed: {
			name: 'Paralyzed',
			color: '#c00900'
		},
		petrified: {
			name: 'Petrified',
			color: '#a0a0a0'
		},
		poisoned: {
			name: 'Poisoned',
			color: '#4dc200'
		},
		prone: {
			name: 'Prone',
			color: '#5e60a0'
		},
		restrained: {
			name: 'Restrained',
			color: '#d98000'
		},
		stunned: {
			name: 'Stunned',
			color: '#a23bcb'
		},
		unconscious: {
			name: 'Unconscious',
			color: '#3a40ad'
		}
	},
	pf2e: {
		blinded: {
			name: 'Blinded',
			color: '#525252'
		},
		clumsy: {
			name: 'Clumsy #',
			color: '#5c57af'
		},
		concealed: {
			name: 'Concealed',
			color: '#525252'
		},
		confused: {
			name: 'Confused',
			color: '#c9c91e'
		},
		controlled: {
			name: 'Controlled',
			color: '#ed07bb'
		},
		dazzled: {
			name: 'Dazzled',
			color: '#db8f48'
		},
		deafened: {
			name: 'Deafened',
			color: '#666464'
		},
		doomed: {
			name: 'Doomed #',
			color: '#9e1414'
		},
		drained: {
			name: 'Drained',
			color: '#72aa01'
		},
		dying: {
			name: 'Dying #',
			color: '#ff0000'
		},
		enfeebled: {
			name: 'Enfeebled #',
			color: '#42a346'
		},
		fascinated: {
			name: 'Fascinated',
			color: 'fc7b02'
		},
		fatigued: {
			name: 'Fatigued',
			color: '#7913c6'
		},
		fleeing: {
			name: 'Fleeing',
			color: '#c9ca18'	
		},
		frightened: {
			name: 'Frightened #',
			color: '#c9ca18'
		},
		grabbed: {
			name: 'Grabbed',
			color: '#00e0ac'
		},
		immobilized: {
			name: 'Immobilized',
			color: '#009f7a'
		},
		invisible: {
			name: 'Invisible',
			color: '#71738c'
		},
		'off-guard': {
			name: 'Off-Guard',
			color: '#7f7f7f'
		},
		paralyzed: {
			name: 'Paralyzed',
			color: '#015642'
		},
		'persistent damage': {
			name: 'Persistent Damage',
			color: '#ed6904'
		},
		petrified: {
			name: 'Petrified',
			color: '#2fd62f'
		},
		prone: {
			name: 'Prone',
			color: '#00e070'
		},
		quickened: {
			name: 'Quickened',
			color: '#00d5e0'
		},
		restrained: {
			name: 'Restrained',
			color: '#007c5f'
		},
		sickened: {
			name: 'Sickened #',
			color: '#008202'
		},
		slowed: {
			name: 'Slowed #',
			color: '#2922a5'
		},
		stunned: {
			name: 'Stunned #',
			color: '#4b43db'
		},
		stupefied: {
			name: 'Stupefied',
			color: '#c94873'	
		},
		unconscious: {
			name: 'Unconscious',
			color: '#a0111b'
		},
		wounded: {
			name: 'Wounded #',
			color: '#e81919'
		}
	}
}

interface WebInitTrackerSettings {
	system: string;
}

const DEFAULT_SETTINGS: WebInitTrackerSettings = {
	system: 'dnd5e'
}

export default class WebInitTracker extends Plugin {
	settings: WebInitTrackerSettings;
	server: PeerVeServer;
	client: PeerVeClient;
	conditions: Object;
	initLoaded: Boolean;
	copyField: HTMLElement;
	round: number;

	updateServer(data) {
		this.server.connections.forEach((conn) => {
			if (conn.dataChannel) {
				if (this.settings.system === 'dnd5e') {
					const rows = data.map((creature) => {
						if (creature.hidden) {
							return null;
						}

						const out = {
							name: creature.name,
							initiative: creature.initiative,
							isActive: creature.active,
							rowStatColData: []
						};

						if (creature.display) out.customName = creature.display;

						if (creature.player) {
							out.hpCurrent = creature.hp;
							out.hpMax = creature.current_max;
							out.o = null;
						} else {
							out.hpWoundLevel = this._getWoundLevel(creature.hp, creature.current_max);
						}

						out.conditions = Array.from(creature.status).map((status) => {
							status.name = status.name.toLowerCase();

							if (this.conditions[status.name] === undefined) {
								this.conditions[status.name] = {};
							}

							if (this.conditions[status.name][creature.id] === undefined) {
								this.conditions[status.name][creature.id] = uuidv4();
							}

							return {
								entity: conditionData[this.settings.system][status.name],
								rounds: null,
								id: this.conditions[status.name][creature.id]
							};
						});

						out.ordinal = creature.number > 0 ? creature.number : null;
						return out;
					}).filter((v) => v !== null);

					conn.dataChannel.send(JSON.stringify({
						head: {
							type: 'server',
							version: '0.0.2'
						},
						data: {
							type: 'state',
							payload: {
								round: this.round,
								rows
							}
						}
					}));
				} else {
					const rows = data.map((creature) => {
						if (creature.hidden) {
							return null;
						}

						const out = {
							n: creature.name,
							i: creature.initiative,
							a: creature.active ? 1 : 0,
							k: []
						};

						if (creature.display) out.m = creature.display;

						if (creature.player) {
							out.h = creature.hp;
							out.g = creature.current_max;
						} else {
							out.hh = this._getWoundLevel(creature.hp, creature.current_max);
						}

						out.c = Array.from(creature.status).map((status) => {
							const statusName = status.name.toLowerCase();
							const sdata = conditionData[this.settings.system][statusName];

							const statusData = {
								name: sdata.name,
								color: sdata.color
							};

							if (status.hasAmount) {
								statusData.name = statusData.name.replace('#', status.amount.toString());
							}

							statusData.turns = null;
							return statusData;
						});

						out.o = creature.number > 0 ? creature.number : null;

						return out;
					}).filter((v) => v !== null);

					rows.sort((a, b) => b.i - a.i);

					conn.dataChannel.send(JSON.stringify({
						head: {
							type: 'server',
							version: '0.0.2'
						},
						data: {
							r: rows,
							n: this.round.toString(),
							c: []
						}
					}));
				}
			}
		});
	}

	firstMessage(conn) {
		const data = this.app.plugins.plugins['initiative-tracker'].data;
		this.round = data.state.round;
		const creatureOrds = {};

		if (this.settings.system === 'dnd5e') {
			const rows = data.state.creatures.map((creature) => {
				if (creature.hidden) {
					return null;
				}

				const out = {
					name: creature.name,
					initiative: creature.initiative,
					isActive: creature.active,
					rowStatColData: []
				};

				if (creature.display) out.customName = creature.display;

				if (creature.player) {
					out.hpCurrent = creature.currentHP;
					out.hpMax = creature.currentMaxHP;
				} else {
					out.hpWoundLevel = this._getWoundLevel(creature.currentHP, creature.currentMaxHP);
				}

				out.conditions = [];

				if (creatureOrds[out.name] === undefined) {
					creatureOrds[out.name] = false;
				} else if (creatureOrds[out.name] === false) {
					creatureOrds[out.name] = true;
				}
			}).filter((v) => v !== null);

			for (const [key, value] of Object.entries(creatureOrds)) {
				if (value !== true) continue;

				var i = 1;

				rows.forEach((row) => {
					if (row.name == key) {
						row.ordinal = i;
						i += 1;
					}
				});
			}

			rows.sort((a, b) => b.initiative - a.initiative);

			conn.dataChannel.send(JSON.stringify({
				head: {
					type: 'server',
					version: '0.0.2'
				},
				data: {
					type: 'state',
					payload: {
						round: this.round,
						rows
					}
				}
			}));
		} else {
			const rows = data.state.creatures.map((creature) => {
				if (creature.hidden) {
					return null;
				}

				const out = {
					n: creature.name,
					i: creature.initiative,
					a: creature.active,
					k: []
				};

				if (creature.display) out.m = creature.display;

				if (creature.player) {
					out.h = creature.currentHP;
					out.g = creature.currentMaxHP;
				} else {
					out.hh = this._getWoundLevel(creature.currentHP, creature.currentMaxHP);
				}

				out.conditions = [];

				if (creatureOrds[out.name] === undefined) {
					creatureOrds[out.name] = false;
				} else if (creatureOrds[out.name] === false) {
					creatureOrds[out.name] = true;
				}

				return out;
			}).filter((v) => v !== null);

			for (const [key, value] of Object.entries(creatureOrds)) {
				if (value !== true) continue;

				var i = 1;

				rows.forEach((row) => {
					if (row.n == key) {
						row.o = i;
						i += 1;
					}
				});
			}

			rows.sort((a, b) => b.initiative - a.initiative);

			conn.dataChannel.send(JSON.stringify({
				head: {
					type: 'server',
					version: '0.0.2'
				},
				data: {
					n: this.round.toString(),
					r: rows
				}
			}));
		}
	}

	loadServer() {
		this.server = new PeerVeServer();		
		this.conditions = {};

		const interval = setInterval(() => {
			if (!this.initLoaded) {
				if ((document.querySelectorAll('div[data-type="initiative-tracker-view"]').length > 0) && (document.querySelectorAll('div.web-init-view').length === 0)) {
					this.initLoaded = true;
					const webDiv = this.app.plugins.plugins['initiative-tracker'].view.containerEl.createEl('div', { cls: 'web-init-view' });
					this.copyField = webDiv.createEl('input');
					this.copyField.setAttribute('aria-label', 'Copy token');
					setIcon(this.copyField, 'copy');
					this.copyField.setAttribute('value', this.server.id);

					this.copyField.onclick = () => {
						navigator.clipboard.writeText(this.server.id);
						new Notice('Copied token to clipboard');
					};

					this.app.plugins.plugins['initiative-tracker'].tracker.subscribe(this.updateServer.bind(this));

					this.app.plugins.plugins['initiative-tracker'].tracker.round.subscribe((round) => {
						this.round = round;
					});
				}
			} else {
				this.copyField.setAttribute('value', this.server.id);
			}
		}, 100);

		this.server.on('connection', (conn) => {
			setTimeout(() => this.firstMessage(conn), 500);
		});
		
		this.registerInterval(interval);
	}

	loadClient() {
		this.client = new PeerVeClient();
	}

	async onload() {
		this.initLoaded = false;
		this.round = 1;

		await this.loadSettings();

		if (!this.app.plugins.enabledPlugins.has('initiative-tracker')) {
			new Notice('Not detecting Initiative Tracker plugin, disabling Web Initiative Tracker...');
			this.app.plugins.disablePluginAndSave('obsidian-web-init-tracker');
		}

		this.loadServer();
		this.loadClient();

		this.addSettingTab(new WebInitTrackerSettingsTab(this.app, this));
	}

	onunload() {
		
	}

	_getWoundLevel(currentHp: number, maxHp: number): number {
		const pctHp = Math.round(Math.max(Math.min(100 * currentHp / maxHp, 100), 0));

		if (pctHp === 100) return 0; // healthy
		if (pctHp > 50) return 1; // injured
		if (pctHp > 0) return 2; // bloody
		if (pctHp === 0) return 3; // defeated
		return -1; // unknown
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class WebInitTrackerSettingsTab extends PluginSettingTab {
	plugin: WebInitTracker;

	constructor(app: App, plugin: WebInitTracker) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('System')
			.setDesc('The system to use for the initiative tracker')
			.addDropdown(dropdown => dropdown
				.addOption('dnd5e', 'Dungeons & Dragons 5th Edition')
				.addOption('pf2e', 'Pathfinder 2nd Edition')
				.setValue(this.plugin.settings.system)
				.onChange(async (value) => {
					this.plugin.settings.system = value;
					await this.plugin.saveSettings();
				})
			);
	}
}