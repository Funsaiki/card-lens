/* tslint:disable */
/* eslint-disable */

export class DetectionResult {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Returns corners as [x0,y0, x1,y1, x2,y2, x3,y3] (TL, TR, BR, BL)
     */
    get_corners(): Float64Array;
    readonly found: boolean;
}

/**
 * Debug: returns the edge detection result as RGBA image
 */
export function debug_edges(rgba: Uint8Array, width: number, height: number): Uint8Array;

/**
 * Detect a card in the RGBA frame. Returns corners if found.
 */
export function detect_card(rgba: Uint8Array, width: number, height: number): DetectionResult;

/**
 * Extract the card region with perspective correction.
 * Takes detected corners + desired output size, returns RGBA data.
 */
export function extract_card_region(rgba: Uint8Array, width: number, height: number, corners: Float64Array, out_width: number, out_height: number): Uint8Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_detectionresult_free: (a: number, b: number) => void;
    readonly debug_edges: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly detect_card: (a: number, b: number, c: number, d: number) => number;
    readonly detectionresult_found: (a: number) => number;
    readonly detectionresult_get_corners: (a: number, b: number) => void;
    readonly extract_card_region: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
