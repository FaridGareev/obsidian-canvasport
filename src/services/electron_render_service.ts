import type { raster_format } from '../models/export';

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

interface browser_window_constructor {
	new (options: Record<string, unknown>): browser_window;
}

interface electron_module {
	remote?: { BrowserWindow?: browser_window_constructor };
	BrowserWindow?: browser_window_constructor;
}

const maximum_viewport_size = 16384;
const maximum_image_pixels = 64_000_000;

export async function create_pdf_document(html: string, width: number, height: number): Promise<ArrayBuffer> {
	return use_render_window(html, width, height, async (window_instance) => {
		const pdf = await window_instance.webContents.printToPDF({ printBackground: true, landscape: width > height, pageSize: { width: width / 96, height: height / 96 }, margins: { top: 0, bottom: 0, left: 0, right: 0 }, preferCSSPageSize: true });
		return Uint8Array.from(pdf).buffer;
	});
}

export async function create_raster_image(html: string, width: number, height: number, format: raster_format, scale: number, quality: number): Promise<ArrayBuffer> {
	const image_size = calculate_image_size(width, height, scale);
	return use_render_window(html, width, height, async (window_instance) => capture_raster_image(window_instance, image_size.width, image_size.height, format, quality));
}

export function calculate_image_size(width: number, height: number, scale: number): { width: number; height: number } {
	const scaled_width = Math.ceil(width * scale);
	const scaled_height = Math.ceil(height * scale);
	if (scaled_width > maximum_viewport_size || scaled_height > maximum_viewport_size || scaled_width * scaled_height > maximum_image_pixels) {
		throw new Error(`Image size ${scaled_width}×${scaled_height} exceeds the export limit.`);
	}
	return { width: scaled_width, height: scaled_height };
}

async function use_render_window<T>(html: string, width: number, height: number, render: (window_instance: browser_window) => Promise<T>): Promise<T> {
	const browser_window = get_browser_window();
	if (!browser_window) throw new Error('Image and PDF export require the Electron desktop runtime.');
	const window_instance = new browser_window({ show: false, width: Math.min(Math.ceil(width), maximum_viewport_size), height: Math.min(Math.ceil(height), maximum_viewport_size), webPreferences: { offscreen: true } });
	try {
		await window_instance.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
		await wait_for_render();
		return await render(window_instance);
	} finally {
		window_instance.close();
	}
}

async function capture_raster_image(window_instance: browser_window, width: number, height: number, format: raster_format, quality: number): Promise<ArrayBuffer> {
	const debugger_instance = window_instance.webContents.debugger;
	const should_detach = !debugger_instance.isAttached();
	if (should_detach) debugger_instance.attach('1.3');
	try {
		await debugger_instance.sendCommand('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false, screenWidth: width, screenHeight: height });
		const result = await debugger_instance.sendCommand('Page.captureScreenshot', { format, quality, fromSurface: true, captureBeyondViewport: true });
		if (typeof result.data !== 'string') throw new Error('Chromium did not return image data.');
		return Uint8Array.from(Buffer.from(result.data, 'base64')).buffer;
	} finally {
		await debugger_instance.sendCommand('Emulation.clearDeviceMetricsOverride').catch(() => undefined);
		if (should_detach && debugger_instance.isAttached()) debugger_instance.detach();
	}
}

function wait_for_render(): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, 100));
}

function get_browser_window(): browser_window_constructor | undefined {
	try {
		const electron = require('electron') as electron_module;
		return electron.remote?.BrowserWindow ?? electron.BrowserWindow;
	} catch {
		try { return (require('@electron/remote') as { BrowserWindow?: browser_window_constructor }).BrowserWindow; } catch { return undefined; }
	}
}
