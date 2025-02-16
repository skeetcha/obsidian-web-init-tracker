import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

export default class MyPlugin extends Plugin {
	async onload() {
		if (!this.app.plugins.enabledPlugins.has('initiative-tracker')) {
			console.log('Not detecting Initiative Tracker plugin, disabling...');
			this.app.plugins.disablePluginAndSave('obsidian-web-init-tracker');
		}
	}

	onunload() {
		
	}
}