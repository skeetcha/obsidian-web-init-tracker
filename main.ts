import { App, DropdownComponent, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
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

	loadServer() {
		this.server = new PeerVeServer();
		this.server.onTemp('open', (id) => console.log(id));
		
		this.conditions = {};

		const interval = setInterval(() => {
            this.server.connections.forEach((conn) => {
                if (conn.dataChannel) {
                    const data = this.app.plugins.plugins['initiative-tracker'].data.state;
					const creatureOrds = {};

                    const rows = data.creatures.map((creature) => {
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

						out.conditions = creature.status.map((status) => {
							status = status.toLowerCase();
							const statusData = conditionData[this.settings.system][status];

							if (this.conditions[status] === undefined) {
								this.conditions[status] = {};
							}
							
							if (this.conditions[status][creature.id] === undefined) {
								this.conditions[status][creature.id] = uuidv4();
							}
							
							return {
								entity: statusData,
								rounds: null,
								id: this.conditions[status][creature.id]
							};
						});

						if (creatureOrds[out.name] === undefined) {
							creatureOrds[out.name] = false;
						} else if (creatureOrds[out.name] === false) {
							creatureOrds[out.name] = true;
						}

                        return out;
                    }).filter((v) => v !== null);

					for (const [key, value] of Object.entries(creatureOrds)) {
						if (value !== true) {
							continue;
						}

						var i = 1;

						rows.forEach((val) => {
							if (val.name == key) {
								val.ordinal = i;
								i += 1;
							}
						});
					}

                    rows.sort((a, b) => {
                        return b.initiative - a.initiative;
                    });

                    conn.dataChannel.send(JSON.stringify({
                        head: {
                            type: 'server',
                            version: '0.0.2'
                        },
                        data: {
                            type: 'state',
                            payload: {
                                round: data.round,
                                rows
                            }
                        }
                    }));
                }
            });
        }, 100);

        this.registerInterval(interval);
	}

	loadClient() {
		this.server = new PeerVeClient();
	}

	async onload() {
		await this.loadSettings();

		if (!this.app.plugins.enabledPlugins.has('initiative-tracker')) {
			console.log('Not detecting Initiative Tracker plugin, disabling...');
			this.app.plugins.disablePluginAndSave('obsidian-web-init-tracker');
		}

		this.loadServer();
		//this.loadClient();

		this.addSettingTab(new WebInitTrackerSettingsTab(this.app, this));
	}

	onunload() {
		
	}

	_getWoundLevel(currentHp, maxHp) {
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
			/*.addDropdown(new DropdownComponent(containerEl)
				.addOption('dnd5e', 'Dungeons & Dragons 5th Edition')
				.addOption('pf2e', 'Pathfinder 2nd Edition')
				.setValue('dnd5e')
				.onChange(async (value) => {
					this.plugin.settings.system = value;
					await this.plugin.saveSettings();
				})
			);*/
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