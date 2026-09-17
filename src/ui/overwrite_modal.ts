/**
 * Canvas Export — an Obsidian Canvas export plugin.
 * @author Farid Gareev <farid.gareev@my.jcu.edu.au>
 * @copyright Copyright (c) 2026 Farid Gareev
 * @license MIT
 */

import { ButtonComponent, Modal } from 'obsidian';
import type canvas_export_plugin from '../application/canvas_export_plugin';

export type overwrite_choice = 'overwrite' | 'rename' | 'skip';

export class overwrite_modal extends Modal {
	private readonly file_path: string;
	private readonly available_path: string;
	private readonly on_choice: (choice: overwrite_choice) => void;
	private has_choice = false;

	constructor(plugin: canvas_export_plugin, file_path: string, available_path: string, on_choice: (choice: overwrite_choice) => void) {
		super(plugin.app);
		this.file_path = file_path;
		this.available_path = available_path;
		this.on_choice = on_choice;
	}

	onOpen(): void {
		this.contentEl.empty();
		this.setTitle('File already exists');
		this.contentEl.createEl('p', { text: get_filename(this.file_path) });
		const actions = this.contentEl.createDiv({ cls: 'canvas_export_actions' });
		this.create_choice_button(actions, 'Overwrite', 'overwrite', true);
		this.create_choice_button(actions, `Save as ${get_filename(this.available_path)}`, 'rename');
		this.create_choice_button(actions, 'Skip', 'skip');
	}

	onClose(): void {
		this.contentEl.empty();
		if (!this.has_choice) this.resolve_choice('skip');
	}

	private create_choice_button(container: HTMLElement, label: string, choice: overwrite_choice, primary = false): void {
		const button = new ButtonComponent(container).setButtonText(label);
		if (primary) button.setCta();
		button.onClick(() => this.resolve_choice(choice));
	}

	private resolve_choice(choice: overwrite_choice): void {
		if (this.has_choice) return;
		this.has_choice = true;
		this.close();
		this.on_choice(choice);
	}
}

function get_filename(path: string): string {
	return path.split('/').pop() || path;
}
