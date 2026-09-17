/**
 * CanvasPort — portable exports for Obsidian Canvas.
 * Derived from Canvas Export and substantially modified for CanvasPort.
 * @author Farid Gareev (CanvasPort modifications)
 * SPDX-License-Identifier: Apache-2.0
 */

declare module 'electron' {
	interface chromium_debugger {
		isAttached(): boolean;
		attach(protocol_version: string): void;
		detach(): void;
		sendCommand(command: string, parameters?: Record<string, unknown>): Promise<Record<string, unknown>>;
	}

	interface browser_window {
		loadURL(url: string): Promise<void>;
		webContents: {
			printToPDF(options: Record<string, unknown>): Promise<Buffer>;
			debugger: chromium_debugger;
		};
		close(): void;
	}

	type browser_window_constructor = new (options: Record<string, unknown>) => browser_window;

	export const remote: { BrowserWindow?: browser_window_constructor } | undefined;
	export const BrowserWindow: browser_window_constructor | undefined;
}
