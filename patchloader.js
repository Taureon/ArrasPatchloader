// ==UserScript==
// @name         Arras.io Patchloader
// @namespace    arras.io.patchloader
// @version      2024-06-30
// @description  An userscript that loads script patches for Arras.io
// @author       https://github.com/Taureon, https://github.com/Ric3cir121
// @match        *://arras.io/mod*
// @icon         https://arras.io/favicon/base.svg
// @grant        none
// ==/UserScript==

(async function() {
    'use strict';
    if (!['/mod', '/mod/'].includes(window.location.pathname)) return;
    window.history.pushState({}, null, '/mod/' + window.location.hash);

    let { listValues, getValue, setValue, deleteValue } = GM;

    async function getPatchModules () {
        let patches = [];
            keyNameList = await listValues();

        await Promise.all(keyNameList.map(async keyName => {
            let patch = await getValue(keyName);
            patch.patchModuleStoreId = keyName;
            patches.push(patch);
        }));

        return patches;
    }

    function addPatchModule (patch) {
        setValue(Math.random().toString().slice(2), patch);
    }

    function removePatchModule (patchModuleStoreId) {
        deleteValue(patchModuleStoreId);
    }

    function patchReplace (main_script, patch) {
        let searchValue, replaceValue;

        switch (patch.searchMode) {
            case 'string': searchValue = patch.searchValue; break;
            case 'regex': searchValue = new RegExp(...patch.searchValue); break;
            default: throw new Error(`searchMode "${patch.searchMode}" does not exist or is otherwise written incorrectly`);
        }

        switch (patch.replaceMode) {
            case 'string': replaceValue = patch.replaceValue; break;
            case 'function': replaceValue = new Function(...patch.replaceValue); break;
            default: throw new Error(`replaceMode "${patch.replaceMode}" does not exist or is otherwise written incorrectly`);
        }

        if (patch.all) {
            main_script.textContent = main_script.textContent.replaceAll(searchValue, replaceValue);
        } else {
            main_script.textContent = main_script.textContent.replace(searchValue, replaceValue);
        }
    }

    let prepends = [], appends = [];
    function patchPrepend (patch) { prepends.push(patch.prependValue); }
    function patchAppend (patch) { appends.push(patch.appendValue); }

    function patchFunction (main_script, data) {
        let func = new Function(...data.func);
        main_script.textContent = func(main_script.textContent);
    }

    function applyPatch (main_script, { type, data }) {
        switch (type) {
            case 'replace': return patchReplace(main_script, data);
            case 'prepend': return patchPrepend(data);
            case 'append': return patchAppend(data);
            case 'function': return patchFunction(main_script, data);
            default: throw new Error(`type "${type}" does not exist or is otherwise written incorrectly`);
        }
    }

    let arras_modules = [{
        name: 'Patchloader Builtin',
        author: 'Taureon, Ric3cir121',
        description: 'Built-in patches to make Arras.io work with the Patchloader',
        url: 'https://github.com/Taureon/ArrasPatchloader',
        patches: [{
            type: 'replace',
            data: {
                all: true,
                searchMode: 'string',
                replaceMode: 'string',
                searchValue: 'fetch("./app.wasm")',
                replaceValue: 'fetch("../app.wasm")'
            }
        }, {
            type: 'replace',
            data: {
                all: true,
                searchMode: 'string',
                replaceMode: 'string',
                searchValue: 'fetch("/CHANGELOG.md")',
                replaceValue: 'fetch("../CHANGELOG.md")'
            }
        }, {
            type: 'append',
            data: {
                appendValue: `console.log('%c Arras.io Patchloader by Taureon and Ric3cir121 has been loaded!', 'background: #444; color: #fff; font-size: 2em; font-weight: bold; padding:12px; border-radius:8px; text-shadow: -2px 0 #000, 0 2px #000, 2px 0 #000, 0 -2px #000, -1px -1px #000, -1px 1px #000, 1px -1px #000, 1px 1px #000;')`
            }
        }]
    },{
        name: 'Patchloader API',
        author: 'Taureon, Ric3cir121',
        description: 'APIs to make Arras.io interaction with patches easier',
        url: 'https://github.com/Taureon/ArrasPatchloader',
        patches: [{
            type: 'replace',
            data: {
                all: true,
                searchMode: 'string',
                replaceMode: 'string',
                searchValue: 'if(!r.isTrusted)return;',
                replaceValue: ''
            }
        }, {
            type: 'replace',
            data: {
                all: true,
                searchMode: 'string',
                replaceMode: 'string',
                searchValue: 'if(t.isTrusted)',
                replaceValue: ''
            }
        }, {
            type: 'replace',
            data: {
                all: true,
                searchMode: 'string',
                replaceMode: 'string',
                searchValue: 't.isTrusted&&',
                replaceValue: ''
            }
        }, {
            type: 'append',
            data: {
                appendValue: `
                class ArrasKeyboardEvent {
                    constructor(type, ctrlKey, altKey, shiftKey, metaKey, key, code) {
                        if(type instanceof KeyboardEvent){
                            this.type = type.type;
                            this.ctrlKey = type.ctrlKey;
                            this.altKey = type.altKey;
                            this.shiftKey = type.shiftKey;
                            this.metaKey = type.metaKey;
                            this.key = type.key;
                            this.code = type.code;
                        }else{
                            this.type = type;
                            this.ctrlKey = ctrlKey;
                            this.altKey = altKey;
                            this.shiftKey = shiftKey;
                            this.metaKey = metaKey;
                            this.key = key;
                            this.code = code;
                        }
                    }
                }
                class ArrasMouseEvent {
                    constructor(type, clientX, clientY, button, deltaX, deltaY, deltaMode) {
                        if(type instanceof MouseEvent){
                            this.type = type.type;
                            this.clientX = type.clientX;
                            this.clientY = type.clientY;
                            this.button = type.button;
                            this.deltaX = type.deltaX;
                            this.deltaY = type.deltaY;
                            this.deltaMode = type.deltaMode;
                        }else{
                            this.type = type;
                            this.clientX = clientX;
                            this.clientY = clientY;
                            this.button = button;
                            this.deltaX = deltaX;
                            this.deltaY = deltaY;
                            this.deltaMode = deltaMode;
                        }
                    }
                }
                class ArrasTouchEvent {
                    constructor(type, changedTouches) {
                        if(type instanceof TouchEvent){
                            this.type = type.type;
                            this.changedTouches = [];
                            for(const changedTouch of type.changedTouches){
                                this.changedTouches.push({clientX:changedTouch.clientX, clientY:changedTouch.clientY, identifier:changedTouch.identifier});
                            }
                        }else{
                            this.type = type;
                            this.changedTouches = changedTouches;
                        }
                    }
                }

                function arrasDispatchEvent(event) {
                    if(event instanceof ArrasKeyboardEvent){
                        document.body.dispatchEvent(new KeyboardEvent(event.type,{ctrlKey:event.ctrlKey, altKey:event.altKey, shiftKey:event.shiftKey, metaKey:event.metaKey, key:event.key, code:event.code,
                            bubbles:true, cancelable:true, returnValue:false, view:window, target:document.body}));
                    }else if(event instanceof ArrasMouseEvent){
                        document.getElementById("canvas").querySelector("canvas")?.dispatchEvent(new MouseEvent(event.type,{clientX:event.clientX, clientY:event.clientY, button:event.button,
                            deltaX:event.deltaX, deltaY:event.deltaY, deltaMode:event.deltaMode, bubbles:true, cancelable: true, returnValue:true, view: window, target:canvas}));
                    }else if(event instanceof ArrasTouchEvent){
                        let changedTouches = [];
                        for(changedTouch of event.changedTouches){
                            changedTouches.push(new Touch({clientX:changedTouch.clientX, clientY:changedTouch.clientY, identifier:changedTouch.identifier, target:canvas}));
                        }
                        document.getElementById("canvas").querySelector("canvas")?.dispatchEvent(new TouchEvent(event.type,{changedTouches:changedTouches,
                            bubbles:true, cancelable: true, returnValue:true, view: window, target:canvas}));
                    }
                }`
            }
        }, {
            type: 'replace',
            data: {
                all: true,
                searchMode: 'string',
                replaceMode: 'string',
                searchValue: '(t=e[t]).width=r,t.height=a',
                replaceValue: '(t=e[t]).width=r,t.height=a;arrasDispatchInternalEvent({type:"resize", width:r, height:a});'
            }
        }, {
            type: 'prepend',
            data: {
                prependValue: `
                let arrasEventListeners = {};
                let arrasEventListenersNonce = 0;
                function arrasDispatchInternalEvent(event){
                    if(typeof arrasEventListeners[event.type] !== 'undefined' && Object.keys(arrasEventListeners[event.type]).length > 0){
                        for(const func of Object.values(arrasEventListeners[event.type])){
                            func(event);
                        }
                    }
                }
                function arrasAddEventListener(type, func){
                    if(typeof arrasEventListeners[type] === 'undefined'){
                        arrasEventListeners[type] = {}
                    }
                    arrasEventListeners[type][arrasEventListenersNonce] = func;
                    return {type:type, key:arrasEventListenersNonce++};
                }`
            }
        }]
    }];

    arras_modules.push(...await getPatchModules());

    document.head.innerHTML = '<style>body{background-color:#484848;}</style>';
    document.body.innerHTML = '';

    let main_page = (new DOMParser()).parseFromString(await (await fetch("/")).text(), 'text/html');

    const main_script = document.createElement('script');
    main_script.textContent = main_page.body.querySelector('script').textContent;

    let patchFails = [];

    for (const module of arras_modules) {
        for (const patchIndex in module.patches) {
            try {
                applyPatch(main_script, module.patches[patchIndex]);
            } catch (error) {

                // yell to the end user about it later
                patchFails.push({ module, patchIndex, error });
            }
        }
    }
    main_script.textContent = prepends.join(';') + ';' + main_script.textContent;
    main_script.textContent = main_script.textContent + ';' + appends.join(';');

    if (patchFails.length > 0) {
        console.log(`Attempted to apply all patches, but the following errors occurred:`);
        for (let { module, patchIndex, error } of patchFails) {
            console.log(`
                Module: ${module.name} (Storage ID: ${module.patchModuleStoreId})
                Patch Index: ${patchIndex}
                Error: ${error.message}`);
        }
        console.log(`These were all the errors that occured while applying patches.`);
    } else {
        console.log(`Successfully applied all patches`);
    }

    // note: there is a script that is supposed to run on the head, but it's not
    document.head.innerHTML = main_page.head.innerHTML;
    document.body.innerHTML = '';
    document.body.appendChild(main_script);
})();