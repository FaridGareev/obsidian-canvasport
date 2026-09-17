/**
 * Canvas Export test fixture.
 * @license MIT
 */

export interface ExportJob {
	canvas: string;
	formats: Array<'html' | 'png' | 'svg' | 'pdf'>;
	theme: 'light' | 'dark';
}

export function describeJob(job: ExportJob): string {
	return `${job.canvas}: ${job.formats.join(', ')} using ${job.theme}`;
}
