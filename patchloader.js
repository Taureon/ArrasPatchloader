// ==UserScript==
// @name         Arras.io Patchloader
// @namespace    arras.io.patchloader
// @version      2024-06-30
// @description  An userscript that loads script patches for Arras.io
// @author       https://github.com/Taureon, https://github.com/ric3cir121
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
            case 'function': replaceValue = new Function(patch.replaceValue); break;
            default: throw new Error(`replaceMode "${patch.replaceMode}" does not exist or is otherwise written incorrectly`);
        }

        if (patch.all) {
            main_script.textContent = main_script.textContent.replaceAll(searchValue, replaceValue);
        } else {
            main_script.textContent = main_script.textContent.replace(searchValue, replaceValue);
        }
    }

    function patchPrepend (main_script, patch) {
        main_script.textContent = patch.prependValue + ';' + main_script.textContent;
    }
    function patchAppend (main_script, patch) {
        main_script.textContent = main_script.textContent + ';' + patch.appendValue;
    }

    function applyPatch (main_script, { type, data }) {
        switch (type) {
            case 'replace': return patchReplace(main_script, data);
            case 'prepend': return patchPrepend(main_script, data);
            case 'append': return patchAppend(main_script, data);
            default: throw new Error(`type "${type}" does not exist or is otherwise written incorrectly`);
        }
    }

    let arras_modules = [{
        name: 'Patchloader Builtin',
        author: 'Taureon, ric3cir121',
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
                appendValue: `console.log('%c Arras.io Patchloader by Taureon and ric3cir121 has been loaded! ', 'background: #444; color: #fff; font-size: 2em; font-weight: bold; text-shadow: -2px 0 #000, 0 2px #000, 2px 0 #000, 0 -2px #000;')`
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