// ==UserScript==
// @name         Arras.io Mod Loader
// @namespace    arras.io.modloader
// @version      2024-06-30
// @description  A mod loader for arras.io
// @author       https://github.com/Taureon and https://github.com/ric3cir121
// @match        *://arras.io/mod*
// @icon         https://arras.io/favicon/base.svg
// @grant        none
// ==/UserScript==

(async function() {
    'use strict';

    let arras_modules = [
        {
            "name": "Mod Loader",
            "author": "https://github.com/Taureon and https://github.com/ric3cir121",
            "url": "https://github.com/Taureon/ArrasPatchloader",
            "patches":[
                {
                    "type": "baseReplace",
                    "replace": {
                        "mode": "string",
                        "what": 'fetch("./app.wasm")',
                        "with": 'fetch("../app.wasm")'
                    }
                },
                {
                    "type": "baseReplace",
                    "replace": {
                        "mode": "string",
                        "what": 'fetch("/CHANGELOG.md")',
                        "with": 'fetch("../CHANGELOG.md")'
                    }
                }
            ]
        }
    ]

    if(window.location.pathname == "/mod" || window.location.pathname == "/mod/"){
        window.history.pushState({}, null, "/mod/"+window.location.hash);

        document.head.innerHTML = "<style>body{background-color:#484848;}</style>";
        document.body.innerHTML = "";

        let main_page = (new DOMParser()).parseFromString(await (await fetch("/")).text(),"text/html");

        // patches to the js have to be applied here

        const main_script = document.createElement("script");
        main_script.textContent = main_page.body.querySelector("script").textContent;

        for (const module of arras_modules){
            for(const patch of module.patches){
                switch(patch.type){
                    case "baseReplace":{
                        const replace = patch.replace;
                        if(replace.mode == "string"){
                            main_script.textContent = main_script.textContent.replace(replace.what, replace.with);
                        }else if(replace.mode == "regex"){
                            // TODO: add regex replace
                        }
                    }break;
                }
            }
        }


        // note: there is a script that is supposed to run on the head, but it's not
        document.head.innerHTML = main_page.head.innerHTML;
        document.body.innerHTML = "";
        document.body.appendChild(main_script);
    }
})();