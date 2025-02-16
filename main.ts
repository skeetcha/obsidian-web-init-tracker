import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { PeerVeClient, PeerVeServer } from './utils-p2p';

export default class WebInitTracker extends Plugin {
	async onload() {
		if (!this.app.plugins.enabledPlugins.has('initiative-tracker')) {
			console.log('Not detecting Initiative Tracker plugin, disabling...');
			this.app.plugins.disablePluginAndSave('obsidian-web-init-tracker');
		}

		/*this.server = new PeerVeClient();
		this.server.on('data', d => {
			console.log(d);
		});*/

		this.server = new PeerVeServer();
		this.server.onTemp('connection', (conn) => {
			console.log(conn.dataChannel);
			conn.send(JSON.stringify({
				head: {
					type: 'server',
					version: '0.0.2'
				},
				data: {
					type: 'state',
					payload: {
						round: 1,
						rows: [
							{
								name: 'test',
								conditions: [],
								hpWoundLevel: 0,
								initiative: 20,
								isActive: true,
								rowStatColData: []
							}
						],
						statsCols: []
					}
				}
			}));
		});
		this.server.onTemp('open', (id) => console.log(id));
		const interval = setInterval(() => {
			this.server.connections.forEach((conn) => {
				if (conn.dataChannel) {
					conn.dataChannel.send(JSON.stringify({
						head: {
							type: 'server',
							version: '0.0.2'
						},
						data: {
							type: 'state',
							payload: {
								round: 1,
								rows: [
									{
										name: 'test',
										conditions: [],
										hpWoundLevel: 0,
										initiative: 20,
										isActive: true,
										rowStatColData: []
									}
								],
								statsCols: []
							}
						}
					}));
				}
			});
		}, 100);
		this.registerInterval(interval);
	}

	onunload() {
		
	}
}