/* @ts-self-types="./card_detect.d.ts" */

export class DetectionResult {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(DetectionResult.prototype);
        obj.__wbg_ptr = ptr;
        DetectionResultFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        DetectionResultFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_detectionresult_free(ptr, 0);
    }
    /**
     * @returns {boolean}
     */
    get found() {
        const ret = wasm.detectionresult_found(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Returns corners as [x0,y0, x1,y1, x2,y2, x3,y3] (TL, TR, BR, BL)
     * @returns {Float64Array}
     */
    get_corners() {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.detectionresult_get_corners(retptr, this.__wbg_ptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var v1 = getArrayF64FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export2(r0, r1 * 8, 8);
            return v1;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
}
if (Symbol.dispose) DetectionResult.prototype[Symbol.dispose] = DetectionResult.prototype.free;

/**
 * Debug: returns the edge detection result as RGBA image
 * @param {Uint8Array} rgba
 * @param {number} width
 * @param {number} height
 * @returns {Uint8Array}
 */
export function debug_edges(rgba, width, height) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(rgba, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.debug_edges(retptr, ptr0, len0, width, height);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Detect a card in the RGBA frame. Returns corners if found.
 * @param {Uint8Array} rgba
 * @param {number} width
 * @param {number} height
 * @returns {DetectionResult}
 */
export function detect_card(rgba, width, height) {
    const ptr0 = passArray8ToWasm0(rgba, wasm.__wbindgen_export);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.detect_card(ptr0, len0, width, height);
    return DetectionResult.__wrap(ret);
}

/**
 * Extract the card region with perspective correction.
 * Takes detected corners + desired output size, returns RGBA data.
 * @param {Uint8Array} rgba
 * @param {number} width
 * @param {number} height
 * @param {Float64Array} corners
 * @param {number} out_width
 * @param {number} out_height
 * @returns {Uint8Array}
 */
export function extract_card_region(rgba, width, height, corners, out_width, out_height) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(rgba, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF64ToWasm0(corners, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        wasm.extract_card_region(retptr, ptr0, len0, width, height, ptr1, len1, out_width, out_height);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_throw_6ddd609b62940d55: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
    };
    return {
        __proto__: null,
        "./card_detect_bg.js": import0,
    };
}

const DetectionResultFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_detectionresult_free(ptr >>> 0, 1));

function getArrayF64FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat64ArrayMemory0().subarray(ptr / 8, ptr / 8 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let cachedFloat64ArrayMemory0 = null;
function getFloat64ArrayMemory0() {
    if (cachedFloat64ArrayMemory0 === null || cachedFloat64ArrayMemory0.byteLength === 0) {
        cachedFloat64ArrayMemory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayF64ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 8, 8) >>> 0;
    getFloat64ArrayMemory0().set(arg, ptr / 8);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedFloat64ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('card_detect_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
