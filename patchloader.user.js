// ==UserScript==
// @name         Arras.io Patchloader
// @namespace    arras.io.patchloader
// @version      2024-07-04
// @description  An userscript that loads script patches for Arras.io
// @author       https://github.com/Taureon, https://github.com/Ric3cir121
// @match        *://arras.io/mod*
// @icon         https://arras.io/favicon/base.svg
// @grant        none
// @downloadURL https://raw.githubusercontent.com/Taureon/ArrasPatchloader/main/patchloader.user.js
// @updateURL https://raw.githubusercontent.com/Taureon/ArrasPatchloader/main/patchloader.meta.js
// ==/UserScript==

(async function() {
    'use strict';
    if (!['/mod', '/mod/'].includes(window.location.pathname)) return;
    window.history.pushState({}, null, '/mod/' + window.location.hash);

    let listValues, getValue, setValue, deleteValue;

    try {
        listValues = GM_listValues;
        getValue = GM_getValue;
        setValue = GM_setValue;
        deleteValue = GM_deleteValue;
    } catch (err) {
        try {
            ({ listValues, getValue, setValue, deleteValue } = GM ?? {});
        } catch (err) {
            // TODO: should we default to functions that return empty arrays/objects or should we throw an error?
            console.log("L");
        }
    }

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
                appendValue: `console.log('%c Arras.io Patchloader by Taureon and Ric3cir121 has been loaded! ', 'background: #444; color: #fff; font-size: 2em; font-weight: bold; padding:12px; border-radius:8px; text-shadow: -2px 0 #000, 0 2px #000, 2px 0 #000, 0 -2px #000, -1px -1px #000, -1px 1px #000, 1px -1px #000, 1px 1px #000;')`
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
                replaceValue: 'if(arrasDispatchInternalEvent({type:r.type, originalEvent:r}))return;'
            }
        }, {
            type: 'replace',
            data: {
                all: true,
                searchMode: 'string',
                replaceMode: 'string',
                searchValue: 'if(t.isTrusted)',
                replaceValue: 'if(arrasDispatchInternalEvent({type:t.type, originalEvent:t}))return;'
            }
        }, {
            type: 'replace',
            data: {
                all: true,
                searchMode: 'string',
                replaceMode: 'string',
                searchValue: 't.isTrusted&&',
                replaceValue: 'if(arrasDispatchInternalEvent({type:t.type, originalEvent:t}))return;'
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
                        document.getElementById("canvas").querySelector("canvas").dispatchEvent(new MouseEvent(event.type,{clientX:event.clientX, clientY:event.clientY, button:event.button,
                            deltaX:event.deltaX, deltaY:event.deltaY, deltaMode:event.deltaMode, bubbles:true, cancelable: true, returnValue:true, view: window, target:canvas}));
                    }else if(event instanceof ArrasTouchEvent){
                        let changedTouches = [];
                        for(changedTouch of event.changedTouches){
                            changedTouches.push(new Touch({clientX:changedTouch.clientX, clientY:changedTouch.clientY, identifier:changedTouch.identifier, target:canvas}));
                        }
                        document.getElementById("canvas").querySelector("canvas").dispatchEvent(new TouchEvent(event.type,{changedTouches:changedTouches,
                            bubbles:true, cancelable: true, returnValue:true, view: window, target:canvas}));
                    }
                }`
            }
        }, {
            type: 'prepend',
            data: {
                prependValue: `
                let arrasEventListeners = {};
                let arrasEventListenersNonce = 0;
                function arrasDispatchInternalEvent(event){
                    let canceled = false;
                    event.preventDefault = ()=>{canceled = true};
                    if(typeof arrasEventListeners[event.type] !== 'undefined' && Object.keys(arrasEventListeners[event.type]).length > 0){
                        for(const func of Object.values(arrasEventListeners[event.type])){
                            func(event);
                        }
                    }
                    return canceled;
                }
                function arrasAddEventListener(type, func){
                    if(typeof arrasEventListeners[type] === 'undefined'){
                        arrasEventListeners[type] = {}
                    }
                    arrasEventListeners[type][arrasEventListenersNonce] = func;
                    return {type:type, key:arrasEventListenersNonce++};
                }`
            }
        }, {
            type: 'replace',
            data: {
                all: true,
                searchMode: 'string',
                replaceMode: 'string',
                searchValue: '(t=e[t]).width=r,t.height=a',
                replaceValue: `(t=e[t]).width=r,t.height=a;
                if(t.parentElement){
                    if(t.parentElement.id == 'canvas'){
                        arrasDispatchInternalEvent({type:'resize', width:r, height:a});
                    }
                }`
            }
        }, {
            type: 'replace',
            data: {
                all: true,
                searchMode: 'string',
                replaceMode: 'string',
                searchValue: 'e[1]||requestAnimationFrame(t)',
                replaceValue: 'arrasDispatchInternalEvent({type:"animationFrame", callback:t});e[1]||requestAnimationFrame(t)'
            }
        }, {
            type: 'replace',
            data: {
                all: true,
                searchMode: 'string',
                replaceMode: 'string',
                searchValue: 'e[1]||(document.hidden?requestAnimationFrame(()=>t.port2.postMessage(null)):t.port2.postMessage(null))',
                replaceValue: 'arrasDispatchInternalEvent({type:"animationFrame", callback:t});e[1]||(document.hidden?requestAnimationFrame(()=>t.port2.postMessage(null)):t.port2.postMessage(null))'
            }
        }, {
            type: 'replace',
            data: {
                all: true,
                searchMode: 'string',
                replaceMode: 'string',
                searchValue: '(t=e[t]).id="canvas",document.body.appendChild(t)',
                replaceValue: '(t=e[t]).id="canvas",document.body.appendChild(t);arrasDispatchInternalEvent({type:"canvas", parent:t, canvas:r})'
            }
        }, {
            type: 'append',
            data: {
                appendValue: `
                arrasAddEventListener('canvas',async function(event){
                    let canvasDiv = document.createElement('div');
                    canvasDiv.style['z-index'] = '2';
                    canvasDiv.id = 'patchLoaderCanvas';
                    document.body.appendChild(canvasDiv);

                    let canvas = document.createElement('canvas');
                    canvas.width = '0';
                    canvas.height = '0';
                    canvas.style.left = '0';
                    canvas.style.top = '0';
                    canvas.style.position = 'absolute';
                    canvas.style['background-color'] = '#00000000';
                    document.getElementById('patchLoaderCanvas').appendChild(canvas);
                });
                arrasAddEventListener('resize', (event)=>{
                    if(document.getElementById('patchLoaderCanvas') && document.getElementById('patchLoaderCanvas').querySelectorAll('canvas').length > 0){
                        let canvas = document.getElementById('patchLoaderCanvas').querySelector('canvas');
                        canvas.width = event.width;
                        canvas.height = event.height;
                    }
                });
                function drawOptions(canvas, options){
                    ctx = canvas.getContext("2d");
                }
                let optionsOpen = false;
                let optionsAnimations = {closed:0, open:-600, tab: 0};
                let selectedTab = 0;
                let interfaceSize = 1;
                let interfaceScale = interfaceSize;
                let menuTabs = [{name:'Options',click:[100,45]},{name:'Theme',click:[250,45]},{name:'Keybinds',click:[360,45]},{name:'Secrets',click:[450,45]},{name:'Patches',click:[450,45]}]
                let glowingTab = -1;
                let lastUpdate = undefined;
                arrasAddEventListener('animationFrame', ()=>{
                    if(document.getElementById('patchLoaderCanvas') && document.getElementById('patchLoaderCanvas').querySelectorAll('canvas').length > 0){
                        let canvas = document.getElementById('patchLoaderCanvas').querySelector('canvas');
                        ctx = canvas.getContext("2d");
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        const scale = interfaceScale;

                        if(!lastUpdate){
                            lastUpdate = Date.now();
                        }
                        let deltaTime = (Date.now()-lastUpdate)/1000;
                        lastUpdate = Date.now();

                        patchesOptions = [
                            [{
                                type: 'title',
                                data:{
                                    title: 'Patches'
                                }
                            },{
                            }],[{
                                type: 'checkbox',
                                data:{
                                    callback: (checked)=>{},
                                    text: 'Disable all patches',
                                    hoverText: undefined,
                                    columnSpan: 1
                                }
                            },{
                                type: 'checkbox',
                                data:{
                                    callback: (checked)=>{},
                                    text: 'Something',
                                    hoverText: undefined,
                                    columnSpan: 1
                                }
                            }]
                        ]

                        /*
                            Size of the user interface:
                            Small:   scale = 0.75;
                            Regular: scale = 1;
                            Large:   scale = 1.25;
                            Mobile:  scale = 1.5;
                        */
                        interfaceScale = interfaceSize*Math.max(canvas.width/1920,canvas.height/1080);

                        let arrasApproach = (position, destination)=>{
                            distance = Math.abs(destination-position);
                            base   = 5;
                            amount = (29.2*deltaTime)/(Math.log(distance+base)/Math.log(base));
                            return position+(destination-position)*amount;
                        }

                        optionsAnimations.open = arrasApproach(optionsAnimations.open,optionsOpen?0:-600);
                        optionsAnimations.closed = arrasApproach(optionsAnimations.closed,optionsOpen?-200:0);
                        optionsAnimations.tab = arrasApproach(optionsAnimations.tab,(selectedTab/menuTabs.length*410+75));

                        let drawRect = (ctx, position, color)=>{
                            ctx.beginPath();
                            ctx.rect(position[0], position[1], position[2], position[3]);
                            ctx.fillStyle = color;
                            ctx.fill();
                            ctx.closePath();
                        };

                        let toCssColor = (color)=>{return 'rgb'+(color.length==4?'a':'')+'('+color.join(',')+')';};
                        let multiplyColor = (color,quantity)=>{return color.map((val,i) => val*quantity);};

                        let barrelsColor = [0x63, 0x5f, 0x5f];
                        let bordersColor = [0x13, 0x13, 0x13];
                        let textColor = [0xf2, 0xf2, 0xf2];

                        let lineWidth = 3;

                        drawRect(ctx, [(75+optionsAnimations.open)*scale, 25*scale, 410*scale, 50*scale], toCssColor(barrelsColor));
                        drawRect(ctx, [(75+optionsAnimations.open)*scale, 25*scale, 410*scale, 50*scale], toCssColor(bordersColor.concat([0x33/0xff])));

                        if(clickButtonId >= 1 && clickButtonId <= 6){
                            let leftMenuTabEdge = ((clickButtonId-1)/menuTabs.length*410+75)+optionsAnimations.open,
                                rightMenuTabEdge = leftMenuTabEdge+(410/menuTabs.length);
                            drawRect(ctx, [leftMenuTabEdge*scale, 25*scale, 410/menuTabs.length*scale, 50*scale+1], toCssColor(barrelsColor));
                            drawRect(ctx, [leftMenuTabEdge*scale, 25*scale, 410/menuTabs.length*scale, 50*scale+1], toCssColor(bordersColor.concat([0x6f/0xff])));
                        }else if(glowingTab != -1){
                            let leftMenuTabEdge = (glowingTab/menuTabs.length*410+75)+optionsAnimations.open,
                                rightMenuTabEdge = leftMenuTabEdge+(410/menuTabs.length);
                            drawRect(ctx, [leftMenuTabEdge*scale, 25*scale, 410/menuTabs.length*scale, 50*scale+1], toCssColor(textColor.concat([0x25/0xff])));
                        }

                        for(let i=0; i<menuTabs.length; i++){
                            if(i != menuTabs.length-1){
                                ctx.beginPath();
                                ctx.lineWidth = lineWidth*scale;
                                ctx.strokeStyle = toCssColor(bordersColor);
                                ctx.lineCap = 'round';
                                ctx.lineJoin = 'round';
                                const lineX = (75+optionsAnimations.open+(410/(menuTabs.length))*(i+1))*scale;
                                ctx.moveTo(lineX,25*scale);
                                ctx.lineTo(lineX,75*scale);
                                ctx.stroke();
                            }
                        }

                        let leftMenuTabEdge = optionsAnimations.tab+optionsAnimations.open,
                            rightMenuTabEdge = leftMenuTabEdge+(410/menuTabs.length);

                        drawRect(ctx, [leftMenuTabEdge*scale, 25*scale, 410/menuTabs.length*scale, (50+lineWidth/2)*scale+1], toCssColor(barrelsColor));

                        ctx.beginPath();
                        ctx.lineWidth = lineWidth*scale;
                        ctx.strokeStyle = toCssColor(bordersColor);
                        ctx.lineCap = 'round';
                        ctx.linejoin = 'round';
                        ctx.moveTo(leftMenuTabEdge*scale,25*scale);
                        ctx.lineTo(leftMenuTabEdge*scale,75*scale);
                        ctx.lineTo((75+optionsAnimations.open)*scale,75*scale);
                        ctx.lineTo((75+optionsAnimations.open)*scale,25*scale);
                        ctx.lineTo((485+optionsAnimations.open)*scale,25*scale);
                        ctx.lineTo((485+optionsAnimations.open)*scale,(75+lineWidth+1)*scale);
                        ctx.stroke();
                        ctx.moveTo((485+optionsAnimations.open)*scale,75*scale);
                        ctx.lineTo(rightMenuTabEdge*scale,75*scale);
                        ctx.lineTo(rightMenuTabEdge*scale,25*scale);
                        ctx.stroke();

                        for(let i=0; i<5; i++){
                            let text = menuTabs[i].name;
                            ctx.font = 'bold '+15*scale+'px / '+25.6*scale+'px Ubuntu';
                            ctx.lineWidth = lineWidth*scale;
                            ctx.strokeStyle = toCssColor(bordersColor);
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.strokeText(text, (75+optionsAnimations.open+410/menuTabs.length*(i+.5))*scale, 50*scale);
                            ctx.fillStyle = toCssColor(textColor);
                            ctx.fillText(text, (75+optionsAnimations.open+410/menuTabs.length*(i+.5))*scale, 50*scale);
                        }
                    }
                });
                let clickButtonId = -1;
                arrasAddEventListener('mousedown', (event)=>{
                    clickButtonId = -1;
                    if(!event.originalEvent.isTrusted)return;
                    let isCursorInsideRect = (cursor, rect)=>{return (cursor.clientX>=rect[0] && cursor.clientX<rect[2])&&(cursor.clientY>=rect[1] && cursor.clientY<rect[3]);};
                    const scale = interfaceScale;
                    if(optionsOpen){
                        if(isCursorInsideRect(event.originalEvent,[(75+optionsAnimations.open)*scale,25*scale,(485+optionsAnimations.open)*scale,75*scale])){
                            event.preventDefault();
                            clickButtonId = Math.floor((event.originalEvent.clientX-(75+optionsAnimations.open)*scale)/(410/menuTabs.length*scale));
                            clickButtonId = Math.min(Math.max(clickButtonId,0),menuTabs.length-1)+1;
                        }
                        if(isCursorInsideRect(event.originalEvent,[(25+optionsAnimations.open)*scale,25*scale,(55+optionsAnimations.open)*scale,55*scale])){
                            clickButtonId = 0;
                        }
                    }else{
                        let atSpawnPage = true;

                        if(isCursorInsideRect(event.originalEvent,[(optionsAnimations.closed)*scale,25*scale,((atSpawnPage?120:20)+optionsAnimations.closed)*scale,55*scale])){
                            clickButtonId = 0;
                        }
                    }
                });
                arrasAddEventListener('mouseup', (event)=>{
                    if(!event.originalEvent.isTrusted)return;
                    let isCursorInsideRect = (cursor, rect)=>{return (cursor.clientX>=rect[0] && cursor.clientX<rect[2])&&(cursor.clientY>=rect[1] && cursor.clientY<rect[3]);};
                    const scale = interfaceScale;
                    if(optionsOpen){
                        if(isCursorInsideRect(event.originalEvent,[(75+optionsAnimations.open)*scale,25*scale,(485+optionsAnimations.open)*scale,75*scale])){
                            event.preventDefault();
                            let thisClickButtonId = Math.floor((event.originalEvent.clientX-(75+optionsAnimations.open)*scale)/(410/menuTabs.length*scale));
                            thisClickButtonId = Math.min(Math.max(thisClickButtonId,0),menuTabs.length-1)+1;
                            if(clickButtonId == thisClickButtonId){
                                selectedTab = clickButtonId-1;
                                clickLocation = menuTabs[selectedTab].click
                                mousedown = new ArrasMouseEvent('mousedown',clickLocation[0]*scale,clickLocation[1]*scale,0,0,0,1);
                                mouseup = new ArrasMouseEvent('mouseup',clickLocation[0]*scale,clickLocation[1]*scale,0,0,0,1);
                                arrasDispatchEvent(mousedown);
                                arrasDispatchEvent(mouseup);
                            }
                        }
                        if(isCursorInsideRect(event.originalEvent,[(25+optionsAnimations.open)*scale,25*scale,(55+optionsAnimations.open)*scale,55*scale])){
                            if(clickButtonId == 0){
                                optionsOpen = false;
                            }
                        }
                    }else{
                        let atSpawnPage = true;

                        if(isCursorInsideRect(event.originalEvent,[(optionsAnimations.closed)*scale,25*scale,((atSpawnPage?120:20)+optionsAnimations.closed)*scale,55*scale])){
                            if(clickButtonId == 0){
                                optionsOpen = true;
                            }
                        }
                    }
                    clickButtonId = -1;
                });
                arrasAddEventListener('mousemove', (event)=>{
                    if(!event.originalEvent.isTrusted)return;
                    let isCursorInsideRect = (cursor, rect)=>{return (cursor.clientX>=rect[0] && cursor.clientX<rect[2])&&(cursor.clientY>=rect[1] && cursor.clientY<rect[3]);};
                    const scale = interfaceScale;
                    glowingTab = -1;
                    if(optionsOpen){
                        if(isCursorInsideRect(event.originalEvent,[(75+optionsAnimations.open)*scale,25*scale,(485+optionsAnimations.open)*scale,75*scale])){
                            glowingTab = Math.floor((event.originalEvent.clientX-(75+optionsAnimations.open)*scale)/(410/menuTabs.length*scale));
                            glowingTab = Math.min(Math.max(glowingTab,0),menuTabs.length-1);
                        }
                    }
                });`
            }
        }]
    }];

    //arras_modules.push(...await getPatchModules());

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